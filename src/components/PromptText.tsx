import type { ReactNode } from 'react';
import { Paperclip } from 'lucide-react';

/**
 * Renderiza el texto de un prompt extraído como contenido legible:
 * - "# Título" → encabezado
 * - "[adjunto]" → chip con ícono
 * - enlaces markdown con texto vacío se ocultan
 * - **negrita** se convierte en <strong>
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\[adjunto\]|\[[^\]]*\]\([^)]*\)|\bhttps?:\/\/[^\s)]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token === '[adjunto]') {
      nodes.push(
        <span key={key} className="mx-0.5 inline-flex translate-y-[1px] items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-1.5 py-0.5 align-middle text-[11px] font-medium text-[#334155]">
          <Paperclip size={11} />
          Adjunto
        </span>,
      );
    } else if (token.startsWith('[')) {
      const label = token.slice(1, token.indexOf(']')).trim();
      if (label) nodes.push(<span key={key}>{label}</span>);
    } else {
      nodes.push(
        <a key={key} href={token} target="_blank" rel="noreferrer" className="text-[#0077CC] underline break-all">
          {token}
        </a>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function PromptText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  let buffer: string[] = [];

  const flush = (key: string) => {
    if (buffer.length === 0) return;
    blocks.push(
      <p key={key} className="mb-2 last:mb-0">
        {renderInline(buffer.join(' '), key)}
      </p>,
    );
    buffer = [];
  };

  lines.forEach((line, linePos) => {
    const trimmed = line.trim();
    if (/^#{1,3}\s/.test(trimmed)) {
      const headingKey = `h-${trimmed.replace(/^#+\s*/, '').slice(0, 40)}-${linePos}`;
      flush(`p-${trimmed.slice(0, 30)}-${linePos}`);
      blocks.push(
        <h4 key={headingKey} className="mb-1.5 mt-1 text-sm font-bold text-[#0F172A]">
          {renderInline(trimmed.replace(/^#+\s*/, ''), headingKey)}
        </h4>,
      );
      return;
    }
    if (trimmed === '[adjunto]') {
      flush(`p-adjunto-${linePos}`);
      blocks.push(
        <span
          key={`a-adjunto-${linePos}`}
          className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-medium text-[#334155]"
        >
          <Paperclip size={12} />
          Archivo adjunto
        </span>,
      );
      return;
    }
    buffer.push(line);
  });
  flush('end');

  return <div>{blocks}</div>;
}
