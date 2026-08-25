// Semantic block renderer. Body HTML (prose/quotation/unknown) was sanitized to
// a strict allowlist at build time and passed visible-text parity validation,
// so it is injected verbatim to preserve inline emphasis and superscripts.

import type { ReadingBlock } from '@/src/core/types';

function ScriptureBlockView({
  text,
  reference,
}: {
  text: string;
  reference?: string;
}) {
  return (
    <blockquote className="verse">
      <p>{text}</p>
      {reference ? <cite>{reference}</cite> : null}
    </blockquote>
  );
}

function PoemBlockView({
  lines,
}: {
  lines: { text: string; indent: boolean }[];
}) {
  return (
    <div className="poem" role="group">
      {lines.map((line, index) => (
        <p
          className={line.indent ? 'poem-line poem-line-indent' : 'poem-line'}
          key={index}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}

export function Blocks({ blocks }: { blocks: ReadingBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'scripture':
            return (
              <ScriptureBlockView
                key={index}
                text={block.text}
                reference={block.reference}
              />
            );
          case 'prose':
            return (
              <div
                className="prose-block"
                key={index}
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          case 'quotation':
            return (
              <div
                className="quotation-block"
                key={index}
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          case 'poem':
            return <PoemBlockView key={index} lines={block.lines} />;
          case 'attribution':
            return (
              <p className="attribution" key={index}>
                {block.text}
              </p>
            );
          case 'list':
            return block.ordered ? (
              <ol className="reading-list" key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ol>
            ) : (
              <ul className="reading-list" key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );
          case 'divider':
            return <hr className="reading-divider" key={index} />;
          case 'unknown':
            return (
              <div
                className="prose-block"
                key={index}
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
