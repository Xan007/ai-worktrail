import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, Check, Link2, Plus, ShieldAlert, Trash2, Users } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { AppBreadcrumb } from '@/components/AppBreadcrumb';
import { EmptyState } from '@/components/EmptyState';
import { GeminiGuideCard } from '@/components/GeminiGuideCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBackendClient } from '@/hooks/useBackend';
import { evaluateSubmission, getCourse, getMySubmissionsByTasks, getSubmissionDetail, listTasks, submitChats } from '@/lib/data';

const dueDateFormatterLong = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

interface ChatUrl {
  id: string;
  value: string;
}

interface ChatUrlListFormProps {
  validChats: string[];
  chats: ChatUrl[];
  canSubmit: boolean;
  busy: boolean;
  alreadySubmitted: boolean;
  onUpdateChat: (id: string, val: string) => void;
  onRemoveChat: (id: string) => void;
  onAddChat: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function ChatUrlListForm({
  validChats,
  chats,
  canSubmit,
  busy,
  alreadySubmitted,
  onUpdateChat,
  onRemoveChat,
  onAddChat,
  onSubmit,
  onCancel,
}: ChatUrlListFormProps) {
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-[#D9E0EA] bg-white p-6 shadow-xs space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold text-[#1A2332]">Enlaces de tus chats de Gemini</Label>
          <span className="text-xs text-[#8B95A5]">{validChats.length} enlace(s) válido(s)</span>
        </div>

        <div className="space-y-3">
          {chats.map((chat, index) => (
            <div key={chat.id} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 size={15} className="pointer-events-none absolute top-3.5 left-3 text-[#8B95A5]" />
                <Input
                  value={chat.value}
                  onChange={(event) => onUpdateChat(chat.id, event.target.value)}
                  placeholder="https://gemini.google.com/share/..."
                  className="h-10 pl-9 font-mono text-xs"
                />
              </div>
              {chats.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar enlace ${index + 1}`}
                  onClick={() => onRemoveChat(chat.id)}
                  className="text-[#8B95A5] hover:text-[#B3372F] hover:bg-[#FBEDEB]"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 gap-1.5 text-xs text-[#1E5AA8] hover:text-[#174A8C]"
          onClick={onAddChat}
        >
          <Plus size={14} /> Añadir otro chat
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#EEF1F6]">
        <Button type="submit" disabled={!canSubmit} className="gap-2 text-xs font-semibold">
          {busy ? 'Guardando...' : alreadySubmitted ? 'Actualizar entrega' : 'Entregar tarea'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="text-xs">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

interface ConfirmSubmitDialogProps {
  open: boolean;
  reasons: string[];
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function ConfirmSubmitDialog({ open, reasons, busy, onOpenChange, onConfirm }: ConfirmSubmitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Confirma antes de enviar
          </DialogTitle>
          <DialogDescription>Revisa estos puntos para que tu docente pueda leer las conversaciones.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 py-2 text-sm text-[#1A2332]">
          {reasons.map((reason, pos) => (
            <li key={`reason-${reason.slice(0, 40)}`} className="flex gap-2">
              <span className="font-mono font-semibold text-[#1E5AA8]">{pos + 1}.</span>
              <span className="break-words">{reason}</span>
            </li>
          ))}
        </ul>
        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Voy a revisar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Enviando…' : 'Entender y enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SubmitTaskPage() {
  const { cid, tid } = useParams();
  const navigate = useNavigate();
  const client = useBackendClient();
  const { user } = useUser();

  const [courseName, setCourseName] = useState<string | null>(null);
  const [task, setTask] = useState<Awaited<ReturnType<typeof listTasks>>[number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatUrl[]>([{ id: 'c1', value: '' }]);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [willEvaluate, setWillEvaluate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmReasons, setConfirmReasons] = useState<string[]>([]);
  const [prevSubmissionId, setPrevSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Entregar tarea — AI WorkTrail';
    if (!cid || !tid) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getCourse(client, cid),
      listTasks(client, cid),
      user?.id ? getMySubmissionsByTasks(client, [tid], user.id).catch(() => ({})) : Promise.resolve({}),
    ])
      .then(([courseData, tasks, subs]) => {
        if (cancelled) return;
        const taskData = tasks.find((t) => t.id === tid) ?? null;
        setCourseName(courseData?.name ?? null);
        setTask(taskData);
        if (taskData) {
          const subsMap = subs as Record<string, string>;
          setAlreadySubmitted(!!subsMap[taskData.id]);
          const subId = subsMap[taskData.id];
          if (subId) {
            setPrevSubmissionId(subId);
            // Load previous chat URLs to prefill the form
            getSubmissionDetail(client, subId)
              .then((detail) => {
                if (!cancelled && detail && detail.submission.chats.length > 0) {
                  setChats(
                    detail.submission.chats.map((chat, i) => ({ id: `c${i}`, value: chat.url }))
                  );
                }
              })
              .catch(() => { /* ignore */ });
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, cid, tid, user?.id]);

  useEffect(() => {
    if (task) document.title = `Entregar: ${task.name} — AI WorkTrail`;
  }, [task]);

  const validChats = useMemo(() => {
    const out: string[] = [];
    for (const c of chats) {
      const v = c.value.trim();
      if (/^https?:\/\//i.test(v)) out.push(v);
    }
    return out;
  }, [chats]);

  const addChat = () => setChats((prev) => [...prev, { id: `c${Date.now()}`, value: '' }]);
  const updateChat = (id: string, value: string) =>
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)));
  const removeChat = (id: string) => setChats((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));

  const isGroupTask = task?.is_group_task ?? false;
  const canSubmit = (validChats.length > 0 || isGroupTask) && !busy;
  const backToTask = cid && tid ? `/courses/${cid}/tasks/${tid}` : cid ? `/courses/${cid}` : '/courses';

  const doSubmit = async () => {
    if (!tid || !user?.id) return;
    setBusy(true);
    setError(null);
    try {
      const { id: submissionId } = await submitChats(client, tid, user.id, validChats);
      if (task?.ai_evaluation_mode === 'on_submit' && validChats.length > 0) {
        setWillEvaluate(true);
        void evaluateSubmission(client, submissionId);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const reasons: string[] = [];
    for (const url of validChats) {
      if (/workspace\.google\.com|accounts\.google\.com/i.test(url)) {
        reasons.push(`El enlace "${url.slice(0, 45)}…" parece requerir inicio de sesión institucional.`);
      }
    }

    if (reasons.length > 0) {
      setConfirmReasons(reasons);
      setConfirmOpen(true);
      return;
    }
    void doSubmit();
  };

  if (!loading && (!courseName || !task)) {
    return (
      <main className="page-fade mx-auto max-w-[1040px] px-6 py-8">
        <AppBreadcrumb items={[{ label: 'Mis cursos', href: '/courses' }, { label: 'Entregar tarea' }]} />
        <EmptyState title="Tarea no encontrada" hint="Verifica el enlace o vuelve a tus cursos." />
      </main>
    );
  }

  return (
    <main className="page-fade mx-auto max-w-[1040px] px-6 py-8">
      <AppBreadcrumb
        items={[
          { label: 'Cursos', href: '/courses' },
          { label: courseName || 'Curso', href: cid ? `/courses/${cid}` : '/courses' },
          { label: task?.name || 'Tarea', href: backToTask },
          { label: 'Entregar' },
        ]}
      />

      {submitted ? (
        <div className="mt-8 rounded-xl border border-[#D9E0EA] bg-white p-8 text-center shadow-xs">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#E8F4EE] text-[#1F7A4D]">
            <Check size={28} />
          </div>
          <h1 className="text-xl font-bold text-[#1A2332]">¡Entrega realizada con éxito!</h1>
          <p className="mt-2 text-sm text-[#4A5568]">
            {willEvaluate
              ? 'Tus enlaces han sido enviados y la IA está analizando la evidencia.'
              : 'Tus enlaces han sido enviados correctamente.'}
          </p>
          <div className="mt-6">
            <Button onClick={() => navigate(backToTask)}>Volver a la tarea</Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-[#1A2332]">{task?.name ?? 'Entregar tarea'}</h1>
            <div className="flex items-center gap-3 text-xs text-[#8B95A5]">
              {isGroupTask && <div className="flex items-center gap-1 text-[#1E5AA8]"><Users size={14} /> Tarea grupal</div>}
              <div className="flex items-center gap-1"><CalendarClock size={14} /> Vence {task?.due_at ? new Date(task.due_at).toLocaleDateString() : 'Sin fecha'}</div>
            </div>
          </div>

          {error && <div className="p-3 bg-[#FBEDEB] text-[#B3372F] rounded-md text-sm border-l-4">{error}</div>}

          {task?.status === 'closed' ? (
            <EmptyState title="Tarea cerrada" hint="Ya no se permiten entregas." />
          ) : alreadySubmitted && task?.allow_resubmission === false ? (
            <EmptyState title="Ya entregaste esta tarea" hint="El docente no permite corregir la entrega. Si necesitas cambios, contacta a tu profesor." />
          ) : (
            <>
              <GeminiGuideCard />
              <ChatUrlListForm
                validChats={validChats}
                chats={chats}
                canSubmit={canSubmit}
                busy={busy}
                alreadySubmitted={alreadySubmitted}
                onUpdateChat={updateChat}
                onRemoveChat={removeChat}
                onAddChat={addChat}
                onSubmit={handleSubmit}
                onCancel={() => navigate(backToTask)}
              />
            </>
          )}

          <ConfirmSubmitDialog
            open={confirmOpen}
            reasons={confirmReasons}
            busy={busy}
            onOpenChange={setConfirmOpen}
            onConfirm={() => {
              setConfirmOpen(false);
              void doSubmit();
            }}
          />
        </div>
      )}
    </main>
  );
}
