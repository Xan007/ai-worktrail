import { Link } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-[#E2E8F0] bg-white">
      <div className="mx-auto w-full max-w-[1240px] px-6 py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="space-y-3.5 md:col-span-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex size-7 items-center justify-center rounded-lg bg-[#0077CC] text-white shadow-2xs">
                <span className="size-2 rounded-xs bg-white" />
              </div>
              <span className="font-bold text-base tracking-tight text-[#0F172A]">
                AI WorkTrail
              </span>
            </Link>
            <p className="text-xs text-[#64748B] leading-relaxed max-w-md">
              Infraestructura académica para la evaluación transparente, rigurosa y fundamentada del uso de Inteligencia Artificial en la educación superior.
            </p>
          </div>

          <div className="space-y-3 md:col-span-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
              Plataforma
            </h4>
            <ul className="space-y-2 text-xs text-[#64748B]">
              <li>
                <Link to="/courses" className="hover:text-[#0077CC] transition-colors">
                  Mis cursos
                </Link>
              </li>
              <li>
                <Link to="/onboarding" className="hover:text-[#0077CC] transition-colors">
                  Registro docente
                </Link>
              </li>
              <li>
                <Link to="/join" className="hover:text-[#0077CC] transition-colors">
                  Unirse a un curso
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3 md:col-span-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
              Herramientas
            </h4>
            <ul className="space-y-2 text-xs text-[#64748B]">
              <li>
                <Link to="/dev/evaluate" className="inline-flex items-center gap-1 hover:text-[#0077CC] transition-colors">
                  <span>Evaluador de enlaces</span>
                  <ArrowUpRight size={12} className="text-[#94A3B8]" />
                </Link>
              </li>
              <li>
                <Link to="/dev/rls" className="hover:text-[#0077CC] transition-colors">
                  Diagnóstico del sistema
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#EEF1F6] pt-6 sm:flex-row text-xs text-[#94A3B8]">
          <p>© {new Date().getFullYear()} AI WorkTrail. Diseñado para educación superior basada en evidencia.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[#1F7A4D]">
              <span className="size-2 rounded-full bg-[#1F7A4D]" />
              Sistemas operativos
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

