interface EmptyStateProps {
  title: string;
  hint?: string;
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div
      style={{
        border: '1px dashed #E2E8F0',
        borderRadius: 8,
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 14, color: '#334155', margin: 0, fontWeight: 500 }}>{title}</p>
      {hint && <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 0' }}>{hint}</p>}
    </div>
  );
}
