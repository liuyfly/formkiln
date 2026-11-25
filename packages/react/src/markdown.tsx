import type { ReactNode } from "react";

/**
 * Renders the Markdown subset of Form Schema §5.1 as React elements: paragraphs, line breaks,
 * emphasis, strong emphasis, bulleted and numbered lists, and links with http, https or mailto
 * URLs. HTML is never interpreted: every character outside this syntax is rendered as text.
 */
export function Markdown({ source }: { source: string }): ReactNode {
  return <>{blocks(source)}</>;
}

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const SAFE_URL = /^(https?:\/\/|mailto:)/i;

function blocks(source: string): ReactNode[] {
  const result: ReactNode[] = [];
  const chunks = source.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  chunks.forEach((chunk, i) => {
    const lines = chunk.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) return;
    if (lines.every((line) => BULLET.test(line))) {
      result.push(
        <ul key={i}>
          {lines.map((line, j) => (
            <li key={j}>{inline(BULLET.exec(line)![1]!)}</li>
          ))}
        </ul>,
      );
    } else if (lines.every((line) => NUMBERED.test(line))) {
      result.push(
        <ol key={i}>
          {lines.map((line, j) => (
            <li key={j}>{inline(NUMBERED.exec(line)![1]!)}</li>
          ))}
        </ol>,
      );
    } else {
      result.push(
        <p key={i}>
          {lines.flatMap((line, j) =>
            j === 0 ? inline(line) : [<br key={`br${j}`} />, ...inline(line)],
          )}
        </p>,
      );
    }
  });
  return result;
}

/** Tokens: links, strong (** or __), emphasis (* or _). */
const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|(\*\*|__)(.+?)\3|(\*|_)(.+?)\5/g;

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index;
    if (start > last) nodes.push(text.slice(last, start));
    const [whole, linkText, url, , strong, , emphasis] = match;
    if (linkText !== undefined && url !== undefined) {
      nodes.push(
        SAFE_URL.test(url) ? (
          <a key={key++} href={url} target="_blank" rel="noopener noreferrer">
            {inline(linkText)}
          </a>
        ) : (
          whole
        ),
      );
    } else if (strong !== undefined) {
      nodes.push(<strong key={key++}>{inline(strong)}</strong>);
    } else if (emphasis !== undefined) {
      nodes.push(<em key={key++}>{inline(emphasis)}</em>);
    }
    last = start + whole.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
