"use client";

import { useMemo, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check } from "lucide-react";

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  position?: { start: { line: number } };
};

type LiProps = ComponentPropsWithoutRef<"li"> & { node?: HastNode };

function findCheckbox(node?: HastNode): HastNode | undefined {
  if (!node?.children) return undefined;
  for (const child of node.children) {
    if (child.type !== "element") continue;
    if (child.tagName === "input") return child;
    // loose lists wrap the checkbox in a <p>
    if (child.tagName === "p") {
      const inner = findCheckbox(child);
      if (inner) return inner;
    }
  }
  return undefined;
}

/** Drops react-markdown's hast `node` prop so it is not spread onto DOM elements. */
function rest<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const copy = { ...props };
  delete copy.node;
  return copy;
}

/**
 * Renders note markdown (GFM) with Apple Notes-ish styling. Task-list checkboxes
 * are interactive: clicking one calls onToggleTask with its 1-based source line.
 */
export function NoteMarkdown({ content, onToggleTask }: { content: string; onToggleTask?: (line: number) => void }) {
  const components = useMemo<Components>(
    () => ({
      h1: (p) => <h1 className="mt-5 mb-2 text-[22px] leading-tight font-bold first:mt-0" {...rest(p)} />,
      h2: (p) => <h2 className="mt-5 mb-2 text-[18px] leading-snug font-bold first:mt-0" {...rest(p)} />,
      h3: (p) => <h3 className="mt-5 mb-1.5 text-[15px] font-bold first:mt-0" {...rest(p)} />,
      h4: (p) => <h4 className="mt-4 mb-1 text-[14px] font-semibold first:mt-0" {...rest(p)} />,
      p: (p) => <p className="mb-2.5" {...rest(p)} />,
      a: ({ href, ...p }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="underline decoration-[#ffc600] decoration-2 underline-offset-2 transition-colors hover:bg-[#ffe390]/50 dark:hover:bg-[#ffe390]/20"
          {...rest(p)}
        />
      ),
      ul: ({ className, ...p }) => (
        <ul className={className?.includes("contains-task-list") ? "mb-2.5 pl-0" : "mb-2.5 list-disc pl-5"} {...rest(p)} />
      ),
      ol: (p) => <ol className="mb-2.5 list-decimal pl-5" {...rest(p)} />,
      li: ({ node, className, children, ...p }: LiProps) => {
        if (!className?.includes("task-list-item")) {
          return (
            <li className="my-1 pl-0.5" {...p}>
              {children}
            </li>
          );
        }
        const box = findCheckbox(node);
        const checked = !!box?.properties?.checked;
        const line = node?.position?.start.line;
        return (
          <li className="my-1.5 flex list-none items-start gap-2" {...p}>
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              aria-label={checked ? "Mark as not done" : "Mark as done"}
              disabled={!onToggleTask || !line}
              onClick={(e) => {
                e.stopPropagation();
                if (line) onToggleTask?.(line);
              }}
              className={`mt-[3px] flex size-[17px] shrink-0 items-center justify-center rounded-full border transition-colors ${
                checked
                  ? "border-[#e0a800] bg-[#ffc600] text-white"
                  : "border-neutral-300 bg-transparent hover:border-[#e0a800] dark:border-neutral-600"
              }`}
            >
              {checked && <Check size={11} strokeWidth={3.5} />}
            </button>
            <div className={`min-w-0 flex-1 [&>p]:mb-0 ${checked ? "text-neutral-400 dark:text-neutral-500" : ""}`}>{children}</div>
          </li>
        );
      },
      input: (p) => (p.type === "checkbox" ? null : <input {...rest(p)} />),
      blockquote: (p) => (
        <blockquote
          className="my-3 border-l-[3px] border-[#ffc600] pl-3 text-neutral-600 italic dark:text-neutral-400 [&>p]:mb-1"
          {...rest(p)}
        />
      ),
      hr: () => <hr className="my-5 border-black/10 dark:border-white/10" />,
      strong: (p) => <strong className="font-semibold" {...rest(p)} />,
      code: ({ className, ...p }) => (
        <code
          className={`${className ?? ""} rounded bg-black/[0.06] px-1 py-px font-mono text-[12.5px] dark:bg-white/10`}
          {...rest(p)}
        />
      ),
      pre: (p) => (
        <pre
          className="my-3 overflow-x-auto rounded-lg border border-black/5 bg-neutral-50 p-3 font-mono text-[12.5px] leading-relaxed dark:border-white/10 dark:bg-white/5 [&_code]:bg-transparent [&_code]:p-0"
          {...rest(p)}
        />
      ),
      table: (p) => (
        <div className="my-3 overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full border-collapse text-[13px]" {...rest(p)} />
        </div>
      ),
      th: (p) => (
        <th
          className="border-b border-black/10 bg-neutral-50 px-3 py-1.5 text-left font-semibold dark:border-white/10 dark:bg-white/5"
          {...rest(p)}
        />
      ),
      td: (p) => (
        <td className="border-t border-black/5 px-3 py-1.5 align-top first:whitespace-nowrap dark:border-white/5" {...rest(p)} />
      ),
      img: ({ alt, ...p }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={alt ?? ""} className="my-2 max-w-full rounded-lg" {...rest(p)} />
      ),
    }),
    [onToggleTask],
  );

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
