import { useMemo } from "react";
import type { JSX } from "react";
import usageDoc from "../../docs/USAGE.md?raw";

const usageDocHref = new URL("../../docs/USAGE.md", import.meta.url).href;

type DocNode =
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; language?: string; content: string }
  | { type: "blockquote"; content: string };

type InlineSegment = { kind: "text" | "strong" | "em" | "code"; value: string };

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const parseInline = (text: string): InlineSegment[] => {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  const tokens: InlineSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith("**")) {
      tokens.push({ kind: "strong", value: token.slice(2, -2) });
    } else if (token.startsWith("`")) {
      tokens.push({ kind: "code", value: token.slice(1, -1) });
    } else {
      tokens.push({ kind: "em", value: token.slice(1, -1) });
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    tokens.push({ kind: "text", value: text.slice(lastIndex) });
  }
  return tokens;
};

const renderInline = (text: string, keyPrefix: string) =>
  parseInline(text).map((segment, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (segment.kind) {
      case "strong":
        return <strong key={key}>{segment.value}</strong>;
      case "em":
        return <em key={key}>{segment.value}</em>;
      case "code":
        return (
          <code key={key} className="inline-code">
            {segment.value}
          </code>
        );
      default:
        return <span key={key}>{segment.value}</span>;
    }
  });

const parseMarkdown = (markdown: string): DocNode[] => {
  const lines = markdown.split(/\r?\n/);
  const nodes: DocNode[] = [];
  let i = 0;
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      nodes.push({ type: "paragraph", content: paragraphBuffer.join(" ") });
      paragraphBuffer = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      flushParagraph();
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      flushParagraph();
      const language = line.slice(3).trim() || undefined;
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      nodes.push({ type: "code", language, content: codeLines.join("\n") });
      if (i < lines.length) {
        i += 1;
      }
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      nodes.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, "").trim());
        i += 1;
      }
      nodes.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s+/, "").trim());
        i += 1;
      }
      nodes.push({ type: "list", ordered: true, items });
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, "").trim());
        i += 1;
      }
      nodes.push({ type: "blockquote", content: quoteLines.join(" ") });
      continue;
    }

    paragraphBuffer.push(line.trim());
    i += 1;
  }

  flushParagraph();
  return nodes;
};

export default function GuideView() {
  const docNodes = useMemo(() => parseMarkdown(usageDoc), []);

  return (
    <div className="guide-view">
      <div className="guide-card">
        {docNodes.map((node, index) => {
          if (node.type === "heading") {
            const Tag = `h${Math.min(node.level, 3)}` as keyof JSX.IntrinsicElements;
            const anchor = slugify(node.content);
            const key = `${anchor}-${index}`;
            const headingElement = (
              <Tag id={anchor} className="guide-heading">
                {node.content}
              </Tag>
            );
            if (index === 0 && node.level === 1) {
              return (
                <div key={key} className="guide-top-bar">
                  {headingElement}
                  <a
                    className="guide-link"
                    href={usageDocHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Markdown
                  </a>
                </div>
              );
            }
            return (
              <Tag key={key} id={anchor} className="guide-heading">
                {node.content}
              </Tag>
            );
          }
          if (node.type === "paragraph") {
            return (
              <p key={`para-${index}`} className="guide-paragraph">
                {renderInline(node.content, `p-${index}`)}
              </p>
            );
          }
          if (node.type === "list") {
            const listItems = node.items.map((item, itemIndex) => (
              <li key={`list-${index}-${itemIndex}`}>{renderInline(item, `li-${index}-${itemIndex}`)}</li>
            ));
            return node.ordered ? (
              <ol key={`list-${index}`} className="guide-list">
                {listItems}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="guide-list">
                {listItems}
              </ul>
            );
          }
          if (node.type === "code") {
            return (
              <pre key={`code-${index}`} className="guide-code">
                <code className={node.language ? `language-${node.language}` : undefined}>{node.content}</code>
              </pre>
            );
          }
          return (
            <blockquote key={`quote-${index}`} className="guide-quote">
              {renderInline(node.content, `quote-${index}`)}
            </blockquote>
          );
        })}
      </div>
    </div>
  );
}
