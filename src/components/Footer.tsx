import { Link } from 'react-router-dom';
import { BookOpen, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-white mt-16">
      <div className="mx-auto max-w-[1140px] px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Marca / Descripción */}
          <div className="space-y-3 md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="size-2.5 rounded-xs bg-[#0077CC] shrink-0" />
              <span className="font-bold text-base tracking-tight text-[#0F172A]">
                AI WorkTrail
              </span>
            </Link>
            <p className="text-xs text-[#334155] leading-relaxed max-w-sm">
              Plataforma de evaluación pedagógica de uso de inteligencia artificial para educación superior. Evidencia transparente por mensaje.
            </p>
          </div>

          {/* Navegación rápida */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Plataforma
            </h4>
            <ul className="space-y-2 text-xs text-[#64748B]">
              <li>
                <Link to="/courses" className="hover:text-[#0077CC] transition-colors">
                  Mis cursos
                </Link>
              </li>
              <li>
                <a href="#como-funciona" className="hover:text-[#0077CC] transition-colors">
                  Cómo funciona
                </a>
              </li>
            </ul>
          </div>

          {/* Desarrollo / Herramientas */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Herramientas
            </h4>
            <ul className="space-y-2 text-xs text-[#64748B]">
              <li>
                <Link to="/dev/evaluate" className="hover:text-[#0077CC] transition-colors">
                  Evaluador de pruebas
                </Link>
              </li>
              <li>
                <Link to="/dev/rls" className="hover:text-[#0077CC] transition-colors">
                  Diagnóstico RLS
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior de copyright */}
        <div className="mt-10 border-t border-[#EEF1F6] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <span>© {new Date().getFullYear()} AI WorkTrail. Todos los derechos reservados.</span>
          <div className="flex items-center gap-1.5 text-[#0077CC] font-medium">
            <ShieldCheck size={14} />
            <span>Evaluación formativa verificable</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

