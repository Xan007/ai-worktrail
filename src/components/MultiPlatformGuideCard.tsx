import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, HelpCircle, Link2, MessageSquare, Share2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlatformGuide {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  icon: string;
  url: string;
  steps: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }>;
}

const PLATFORMS: PlatformGuide[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    color: '#6B4FB3',
    bgColor: '#F1EDFA',
    icon: '/logos/gemini.svg',
    url: 'https://gemini.google.com',
    steps: [
      {
        icon: <MessageSquare size={13} />,
        title: 'Trabaja en Gemini',
        description: 'Entra a gemini.google.com e interactúa con la IA para resolver tu actividad.',
      },
      {
        icon: <Share2 size={13} />,
        title: 'Haz clic en Compartir',
        description: 'En la parte superior derecha del chat, pulsa el botón "Compartir".',
      },
      {
        icon: <ShieldCheck size={13} />,
        title: 'Crea el enlace público',
        description: 'Selecciona "Crear enlace público" y confirma que el acceso sea "Cualquiera con el enlace".',
      },
      {
        icon: <Link2 size={13} />,
        title: 'Pega tu enlace aquí',
        description: 'Copia la URL (https://gemini.google.com/share/...) y agrégala abajo.',
      },
    ],
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    color: '#0E7A5F',
    bgColor: '#E6F5F0',
    icon: '/logos/chatgpt.svg',
    url: 'https://chatgpt.com',
    steps: [
      {
        icon: <MessageSquare size={13} />,
        title: 'Trabaja en ChatGPT',
        description: 'Entra a chatgpt.com e interactúa con la IA para resolver tu actividad.',
      },
      {
        icon: <Share2 size={13} />,
        title: 'Comparte el chat',
        description: 'Haz clic en el ícono de compartir (links) en la parte superior del chat.',
      },
      {
        icon: <ShieldCheck size={13} />,
        title: 'Activa el acceso público',
        description: 'Asegúrate de que el enlace sea accesible para cualquier persona.',
      },
      {
        icon: <Link2 size={13} />,
        title: 'Pega tu enlace aquí',
        description: 'Copia la URL del chat compartido y agrégala abajo.',
      },
    ],
  },
  {
    id: 'claude',
    name: 'Claude',
    color: '#B4552D',
    bgColor: '#FBEEE9',
    icon: '/logos/claude.svg',
    url: 'https://claude.ai',
    steps: [
      {
        icon: <MessageSquare size={13} />,
        title: 'Trabaja en Claude',
        description: 'Entra a claude.ai e interactúa con la IA para resolver tu actividad.',
      },
      {
        icon: <Share2 size={13} />,
        title: 'Comparte la conversación',
        description: 'Haz clic en el botón de compartir en la parte superior del chat.',
      },
      {
        icon: <ShieldCheck size={13} />,
        title: 'Crea enlace público',
        description: 'Selecciona "Create public link" y copia el enlace generado.',
      },
      {
        icon: <Link2 size={13} />,
        title: 'Pega tu enlace aquí',
        description: 'Copia la URL (https://claude.ai/share/...) y agrégala abajo.',
      },
    ],
  },
];

function PlatformTab({ platform, isActive, onClick }: { platform: PlatformGuide; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        isActive
          ? 'bg-white shadow-sm'
          : 'text-[#64748B] hover:bg-white/50 hover:text-[#0F172A]'
      }`}
      style={isActive ? { color: platform.color, background: platform.bgColor } : undefined}
    >
      <img src={platform.icon} alt="" className="size-4" />
      {platform.name}
    </button>
  );
}

export function MultiPlatformGuideCard() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('awt_multi_guide_collapsed');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [activePlatform, setActivePlatform] = useState(PLATFORMS[0]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('awt_multi_guide_collapsed', String(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFD] transition-colors">
      <div className="flex items-center justify-between px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2.5 text-left text-sm font-semibold text-[#0F172A] hover:text-[#0077CC]"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-[#E0F2FE] text-[#0077CC]">
            <HelpCircle size={14} />
          </span>
          <span>¿Cómo obtengo mi enlace de chat?</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="h-7 gap-1 text-xs text-[#64748B] hover:text-[#0F172A]"
        >
          {collapsed ? 'Ver guía' : 'Ocultar'}
          {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </Button>
      </div>

      {!collapsed && (
        <div className="border-t border-[#E2E8F0] bg-white p-4 sm:p-5 space-y-4 text-xs text-[#334155]">
          {/* Platform tabs */}
          <div className="flex gap-1 rounded-lg bg-[#F0F3F8] p-1">
            {PLATFORMS.map((platform) => (
              <PlatformTab
                key={platform.id}
                platform={platform}
                isActive={activePlatform.id === platform.id}
                onClick={() => setActivePlatform(platform)}
              />
            ))}
          </div>

          {/* Steps for active platform */}
          <div className="grid gap-3 sm:grid-cols-2">
            {activePlatform.steps.map((step, index) => (
              <div key={`${activePlatform.id}-${index}`} className="flex items-start gap-2.5 rounded-lg border border-[#EEF1F6] bg-[#FAFBFC] p-3">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: activePlatform.color }}
                >
                  {index + 1}
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 font-semibold text-[#0F172A]">
                    <span style={{ color: activePlatform.color }}>{step.icon}</span>
                    <span>{step.title}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {step.description}{' '}
                    {index === 0 && (
                      <a
                        href={activePlatform.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline inline-flex items-center gap-0.5"
                        style={{ color: activePlatform.color }}
                      >
                        {activePlatform.url.replace('https://', '')} <ExternalLink size={10} />
                      </a>
                    )}
                    {index === 3 && (
                      <code className="rounded bg-[#F0F3F8] px-1 py-0.5 font-mono text-[10px]">
                        https://{activePlatform.id === 'gemini' ? 'gemini.google.com/share/...' : activePlatform.id === 'chatgpt' ? 'chatgpt.com/c/...' : 'claude.ai/share/...'}
                      </code>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {activePlatform.id === 'gemini' && (
            <p className="rounded-md bg-[#F0F5FA] px-3 py-2 text-[11px] text-[#334155]">
              <strong>Nota para cuentas institucionales:</strong> Si tu cuenta educativa restringe enlaces públicos externos, asegúrate de habilitar permisos de lectura para tu docente o compartir el archivo desde Drive.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
