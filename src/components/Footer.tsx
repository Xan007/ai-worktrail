import { Link } from 'react-router-dom';
import { BookOpen, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[#D9E0EA] bg-white mt-16">
      <div className="mx-auto max-w-[1140px] px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Marca / Descripción */}
          <div className="space-y-3 md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="size-2.5 rounded-xs bg-[#1E5AA8] shrink-0" />
              <span className="font-bold text-base tracking-tight text-[#1A2332]">
                AI WorkTrail
              </span>
            </Link>
            <p className="text-xs text-[#4A5568] leading-relaxed max-w-sm">
              Plataforma de evaluación pedagógica de uso de inteligencia artificial para educación superior. Evidencia transparente por mensaje.
            </p>
          </div>

          {/* Navegación rápida */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2332]">
              Plataforma
            </h4>
            <ul className="space-y-2 text-xs text-[#64748B]">
              <li>
                <Link to="/courses" className="hover:text-[#1E5AA8] transition-colors">
                  Mis cursos
                </Link>
              </li>
              <li>
                <a href="#como-funciona" className="hover:text-[#1E5AA8] transition-colors">
                  Cómo funciona
                </a>
              </li>
            </ul>
          </div>

          {/* Desarrollo / Herramientas */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2332]">
              Herramientas
            </h4>
            <ul className="space-y-2 text-xs text-[#64748B]">
              <li>
                <Link to="/dev/evaluate" className="hover:text-[#1E5AA8] transition-colors">
                  Evaluador de pruebas
                </Link>
              </li>
              <li>
                <Link to="/dev/rls" className="hover:text-[#1E5AA8] transition-colors">
                  Diagnóstico RLS
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior de copyright */}
        <div className="mt-10 border-t border-[#EEF1F6] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8B95A5]">
          <span>© {new Date().getFullYear()} AI WorkTrail. Todos los derechos reservados.</span>
          <div className="flex items-center gap-1.5 text-[#1E5AA8] font-medium">
            <ShieldCheck size={14} />
            <span>Evaluación formativa verificable</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

