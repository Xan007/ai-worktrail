import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, HelpCircle, Link2, MessageSquare, Share2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GeminiGuideCard() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('awt_gemini_guide_collapsed');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('awt_gemini_guide_collapsed', String(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#D9E0EA] bg-[#F8FAFD] transition-colors">
      <div className="flex items-center justify-between px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2.5 text-left text-sm font-semibold text-[#1A2332] hover:text-[#1E5AA8]"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-[#EAF1F9] text-[#1E5AA8]">
            <HelpCircle size={14} />
          </span>
          <span>¿Cómo obtengo mi enlace de Gemini?</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="h-7 gap-1 text-xs text-[#64748B] hover:text-[#1A2332]"
        >
          {collapsed ? 'Ver guía' : 'Ocultar'}
          {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </Button>
      </div>

      {!collapsed && (
        <div className="border-t border-[#D9E0EA] bg-white p-4 sm:p-5 space-y-4 text-xs text-[#4A5568]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2.5 rounded-lg border border-[#EEF1F6] bg-[#FAFBFC] p-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#EAF1F9] text-[11px] font-bold text-[#1E5AA8]">
                1
              </span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 font-semibold text-[#1A2332]">
                  <MessageSquare size={13} className="text-[#1E5AA8]" />
                  <span>Trabaja en Gemini</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Entra a{' '}
                  <a
                    href="https://gemini.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[#1E5AA8] underline inline-flex items-center gap-0.5"
                  >
                    gemini.google.com <ExternalLink size={10} />
                  </a>{' '}
                  e interactúa con la IA para resolver tu actividad.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border border-[#EEF1F6] bg-[#FAFBFC] p-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#EAF1F9] text-[11px] font-bold text-[#1E5AA8]">
                2
              </span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 font-semibold text-[#1A2332]">
                  <Share2 size={13} className="text-[#1E5AA8]" />
                  <span>Haz clic en Compartir</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  En la parte superior derecha del chat (o bajo la respuesta), pulsa el botón <strong>Compartir</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border border-[#EEF1F6] bg-[#FAFBFC] p-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#EAF1F9] text-[11px] font-bold text-[#1E5AA8]">
                3
              </span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 font-semibold text-[#1A2332]">
                  <ShieldCheck size={13} className="text-[#1E5AA8]" />
                  <span>Crea el enlace público</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Selecciona <strong>"Crear enlace público"</strong> y confirma que el acceso sea <em>"Cualquiera con el enlace"</em>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border border-[#EEF1F6] bg-[#FAFBFC] p-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#EAF1F9] text-[11px] font-bold text-[#1E5AA8]">
                4
              </span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 font-semibold text-[#1A2332]">
                  <Link2 size={13} className="text-[#1E5AA8]" />
                  <span>Pega tu enlace aquí</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Copia la URL (<code className="rounded bg-[#F0F3F8] px-1 py-0.5 font-mono text-[10px]">https://gemini.google.com/share/...</code>) y agrégala abajo.
                </p>
              </div>
            </div>
          </div>

          <p className="rounded-md bg-[#F0F5FA] px-3 py-2 text-[11px] text-[#4A5568]">
            <strong>Nota para cuentas institucionales:</strong> Si tu cuenta educativa restringe enlaces públicos externos, asegúrate de habilitar permisos de lectura para tu docente o compartir el archivo desde Drive.
          </p>
        </div>
      )}
    </div>
  );
}
