import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function AppBreadcrumb({ items }: BreadcrumbProps) {
  const navigate = useNavigate();

  // Página padre: el último ítem con href antes del actual
  let parentHref: string | null = null;
  for (let i = items.length - 2; i >= 0; i--) {
    if (items[i].href) {
      parentHref = items[i].href!;
      break;
    }
  }

  return (
    <nav aria-label="breadcrumb" style={{ marginBottom: 0 }}>
      <ol style={{ display: 'flex', alignItems: 'center', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
        {items.length > 1 && (
          <li>
            <button
              type="button"
              aria-label="Atrás"
              onClick={() => {
                if (parentHref) navigate(parentHref);
                else window.history.back();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 6,
                border: '1px solid #D9E0EA',
                background: '#FFFFFF',
                cursor: 'pointer',
                color: '#4A5568',
                transition: 'border-color 150ms, color 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1E5AA8';
                e.currentTarget.style.color = '#1E5AA8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#D9E0EA';
                e.currentTarget.style.color = '#4A5568';
              }}
            >
              <ChevronLeft size={15} />
            </button>
          </li>
        )}
        {items.map((item, pos) => {
          const isLast = pos === items.length - 1;
          const key = item.href ?? (typeof item.label === 'string' ? item.label : `breadcrumb-${String(item.label).slice(0, 30)}`);
          return (
            <li key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {pos > 0 && <span style={{ color: '#8B95A5', fontSize: 14 }}>/</span>}
              {isLast || !item.href ? (
                <span style={{ fontSize: 14, color: isLast ? '#1A2332' : '#4A5568', fontWeight: 400 }}>
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  style={{
                    fontSize: 14,
                    color: '#4A5568',
                    textDecoration: 'none',
                    transition: 'color 150ms',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#1E5AA8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#4A5568')}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
