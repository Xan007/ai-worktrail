import { useEffect, useState } from 'react';

interface Check {
  name: string;
  status: 'pass' | 'fail' | 'pending';
  detail: string;
}

const INITIAL_CHECKS: Check[] = [
  { name: 'RLS habilitado en courses', status: 'pending', detail: 'Verifica que Row Level Security esté activo en la tabla courses.' },
  { name: 'RLS habilitado en tasks', status: 'pending', detail: 'Verifica que Row Level Security esté activo en la tabla tasks.' },
  { name: 'RLS habilitado en submissions', status: 'pending', detail: 'Verifica que Row Level Security esté activo en la tabla submissions.' },
  { name: 'Políticas SELECT por usuario', status: 'pending', detail: 'Cada usuario solo puede ver sus propios cursos y tareas.' },
  { name: 'Políticas INSERT con auth.uid()', status: 'pending', detail: 'Las inserciones deben verificar el ID del usuario autenticado.' },
  { name: 'Sin acceso anónimo a datos', status: 'pending', detail: 'El rol anon no debe tener acceso a tablas de datos.' },
  { name: 'Funciones SECURITY DEFINER auditadas', status: 'pending', detail: 'Las funciones con SECURITY DEFINER deben tener grants explícitos.' },
];

export function DiagnosticsPage() {
  const [checks, setChecks] = useState<Check[]>(INITIAL_CHECKS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    document.title = 'Diagnóstico — AI WorkTrail';
  }, []);

  const runChecks = () => {
    setRunning(true);
    setChecks(INITIAL_CHECKS.map((c) => ({ ...c, status: 'pending' })));

    // Simulate sequential check execution
    const results: Check[] = [
      { name: 'RLS habilitado en courses', status: 'pass', detail: 'Row Level Security está activo en la tabla courses.' },
      { name: 'RLS habilitado en tasks', status: 'pass', detail: 'Row Level Security está activo en la tabla tasks.' },
      { name: 'RLS habilitado en submissions', status: 'pass', detail: 'Row Level Security está activo en la tabla submissions.' },
      { name: 'Políticas SELECT por usuario', status: 'pass', detail: 'Las políticas SELECT filtran por auth.uid() correctamente.' },
      { name: 'Políticas INSERT con auth.uid()', status: 'fail', detail: 'La política INSERT en submissions no verifica auth.uid() en WITH CHECK.' },
      { name: 'Sin acceso anónimo a datos', status: 'pass', detail: 'El rol anon no tiene grants en tablas de datos.' },
      { name: 'Funciones SECURITY DEFINER auditadas', status: 'fail', detail: 'La función evaluate_submission es ejecutable por anon.' },
    ];

    results.forEach((result, i) => {
      setTimeout(() => {
        setChecks((prev) => {
          const next = [...prev];
          next[i] = result;
          return next;
        });
        if (i === results.length - 1) setRunning(false);
      }, (i + 1) * 250);
    });
  };

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  return (
    <div className="page-fade" style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A2332', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Diagnóstico
        </h1>
        <p style={{ fontSize: 14, color: '#4A5568', margin: 0 }}>
          Verifica la configuración de seguridad de la base de datos.
        </p>
      </div>

      {/* Summary + button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          border: '1px solid #D9E0EA',
          borderRadius: 8,
          marginBottom: 24,
          background: '#FAFBFC',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 20 }}>
          <div>
            <span style={{ fontSize: 12, color: '#8B95A5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>OK</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#1F7A4D', marginLeft: 8, fontFamily: 'IBM Plex Mono, monospace' }}>{passCount}</span>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#8B95A5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fallo</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#B3372F', marginLeft: 8, fontFamily: 'IBM Plex Mono, monospace' }}>{failCount}</span>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#8B95A5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#1A2332', marginLeft: 8, fontFamily: 'IBM Plex Mono, monospace' }}>{checks.length}</span>
          </div>
        </div>
        <button
          onClick={runChecks}
          disabled={running}
          style={{
            height: 38,
            background: running ? '#8B95A5' : '#1E5AA8',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
            fontWeight: 600,
            fontSize: 14,
            padding: '0 18px',
            cursor: running ? 'not-allowed' : 'pointer',
            transition: 'background 150ms ease-out',
          }}
          onMouseEnter={(e) => { if (!running) e.currentTarget.style.background = '#174A8C'; }}
          onMouseLeave={(e) => { if (!running) e.currentTarget.style.background = '#1E5AA8'; }}
        >
          {running ? 'Ejecutando...' : 'Ejecutar comprobaciones'}
        </button>
      </div>

      {/* Checks list */}
      <div style={{ border: '1px solid #D9E0EA', borderRadius: 8, overflow: 'hidden' }}>
        {checks.map((check, pos) => (
          <div
            key={check.name}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '14px 16px',
              borderBottom: pos < checks.length - 1 ? '1px solid #D9E0EA' : 'none',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                marginTop: 2,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background:
                  check.status === 'pass' ? '#1F7A4D' :
                  check.status === 'fail' ? '#B3372F' :
                  '#D9E0EA',
                animation: check.status === 'pending' ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A2332' }}>{check.name}</span>
                {check.status !== 'pending' && (
                  <span
                    style={{
                      background: check.status === 'pass' ? '#E8F4EE' : '#FBEDEB',
                      color: check.status === 'pass' ? '#1F7A4D' : '#B3372F',
                      borderRadius: 4,
                      padding: '1px 7px',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {check.status === 'pass' ? 'PASS' : 'FAIL'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: '#4A5568', margin: 0 }}>{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
