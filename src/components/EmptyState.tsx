interface EmptyStateProps {
  title: string;
  hint?: string;
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div
      style={{
        border: '1px dashed #D9E0EA',
        borderRadius: 8,
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 14, color: '#4A5568', margin: 0, fontWeight: 500 }}>{title}</p>
      {hint && <p style={{ fontSize: 13, color: '#8B95A5', margin: '6px 0 0' }}>{hint}</p>}
    </div>
  );
}
