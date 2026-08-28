import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface InviteModalProps {
  joinCode: string;
  courseId?: string;
  triggerLabel?: string;
  highlight?: boolean;
  hideTrigger?: boolean;
  onCopied?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InviteModal({
  joinCode,
  courseId,
  triggerLabel = 'Invitar',
  highlight = false,
  hideTrigger = false,
  onCopied,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: InviteModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${joinCode}` : `/join/${joinCode}`;

  const markCopied = () => {
    try {
      localStorage.setItem('awt_step_invited_done', 'true');
      if (courseId) {
        localStorage.setItem(`awt_invited_${courseId}`, 'true');
        localStorage.removeItem(`awt_course_new_${courseId}`);
      }
    } catch {
      /* ignore */
    }
    onCopied?.();
  };

  const copyCode = () => {
    void navigator.clipboard?.writeText(joinCode).then(
      () => {
        setCopiedCode(true);
        markCopied();
        window.setTimeout(() => setCopiedCode(false), 1600);
      },
      () => undefined,
    );
  };

  const copyLink = () => {
    void navigator.clipboard?.writeText(joinUrl).then(
      () => {
        setCopiedLink(true);
        markCopied();
        window.setTimeout(() => setCopiedLink(false), 1600);
      },
      () => undefined,
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant={highlight ? 'default' : 'outline'}
            className={`gap-2 ${highlight ? 'shadow-md ring-2 ring-[#1E5AA8] ring-offset-2' : ''}`}
          >
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Invitar estudiantes</DialogTitle>
          <DialogDescription>
            Comparte el código o el enlace directo para que tus estudiantes se unan al curso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#8B95A5]">
              Código de clase
            </span>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#D9E0EA] bg-[#F6F8FB] px-4 py-3">
              <span className="font-mono text-xl font-semibold tracking-[0.18em] text-[#1A2332]">{joinCode}</span>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyCode}>
                {copiedCode ? <Check size={14} className="text-[#1F7A4D]" /> : <Copy size={14} />}
                {copiedCode ? 'Copiado' : 'Copiar código'}
              </Button>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#8B95A5]">
              Enlace directo
            </span>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#D9E0EA] bg-[#F6F8FB] px-4 py-2.5">
              <span className="truncate text-xs font-mono text-[#4A5568]">{joinUrl}</span>
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={copyLink}>
                {copiedLink ? <Check size={14} className="text-[#1F7A4D]" /> : <Copy size={14} />}
                {copiedLink ? 'Copiado' : 'Copiar link'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
