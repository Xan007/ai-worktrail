import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Paperclip } from 'lucide-react';

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
      nodes.push(<strong key={key} className="font-semibold text-[#0F172A]">{token.slice(2, -2)}</strong>);
    } else if (token === '[adjunto]') {
      nodes.push(
        <span key={key} className="mx-0.5 inline-flex items-center gap-1 rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.2 text-[10px] font-medium text-[#475569]">
          <Paperclip size={10} />
          Adjunto
        </span>,
      );
    } else if (token.startsWith('[')) {
      const label = token.slice(1, token.indexOf(']')).trim();
      if (label) nodes.push(<span key={key}>{label}</span>);
    } else {
      nodes.push(
        <a key={key} href={token} target="_blank" rel="noreferrer" className="text-[#0077CC] hover:underline break-all">
          {token}
        </a>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function PromptText({ text, maxLines = 4 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 280 || text.split('\n').length > maxLines;

  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  let buffer: string[] = [];

  const flush = (key: string) => {
    if (buffer.length === 0) return;
    blocks.push(
      <p key={key} className="mb-1.5 last:mb-0 leading-relaxed text-[#1E293B]">
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
        <h4 key={headingKey} className="mb-1 mt-1 text-xs font-bold text-[#0F172A]">
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
          className="mb-1.5 inline-flex items-center gap-1 rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[11px] font-medium text-[#475569]"
        >
          <Paperclip size={11} />
          Archivo adjunto
        </span>,
      );
      return;
    }
    buffer.push(line);
  });
  flush('end');

  return (
    <div className="relative text-xs">
      <div className={!expanded && isLong ? 'line-clamp-3 overflow-hidden' : ''}>
        {blocks}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0077CC] hover:text-[#0066B3]"
        >
          {expanded ? (
            <>
              Mostrar menos <ChevronUp size={11} />
            </>
          ) : (
            <>
              Mostrar más <ChevronDown size={11} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
