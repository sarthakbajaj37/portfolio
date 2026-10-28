/* eslint-disable @next/next/no-img-element -- arbitrary README images (incl. GitHub raw URLs) */
import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: (p) => <h1 className="mb-3 mt-5 border-b border-black/10 pb-1 text-[1.6em] font-bold first:mt-0 dark:border-white/10" {...p} />,
  h2: (p) => <h2 className="mb-2 mt-5 border-b border-black/10 pb-1 text-[1.3em] font-semibold dark:border-white/10" {...p} />,
  h3: (p) => <h3 className="mb-2 mt-4 text-[1.1em] font-semibold" {...p} />,
  h4: (p) => <h4 className="mb-1 mt-3 font-semibold" {...p} />,
  p: (p) => <p className="my-2 leading-relaxed" {...p} />,
  a: ({ href, ...p }) => <a href={href} target="_blank" rel="noreferrer" className="text-sky-600 underline-offset-2 hover:underline dark:text-sky-400" {...p} />,
  ul: (p) => <ul className="my-2 ml-6 list-disc space-y-1" {...p} />,
  ol: (p) => <ol className="my-2 ml-6 list-decimal space-y-1" {...p} />,
  blockquote: (p) => <blockquote className="my-2 border-l-4 border-black/15 pl-3 text-neutral-500 dark:border-white/20 dark:text-neutral-400" {...p} />,
  code: ({ className, ...p }) => (
    <code className={`rounded bg-black/5 px-1 py-0.5 font-mono text-[0.88em] dark:bg-white/10 ${className ?? ""}`} {...p} />
  ),
  pre: (p) => <pre className="my-3 overflow-x-auto rounded-lg bg-black/5 p-3 font-mono text-[0.88em] dark:bg-white/5 [&_code]:bg-transparent [&_code]:p-0" {...p} />,
  hr: () => <hr className="my-4 border-black/10 dark:border-white/10" />,
  table: (p) => (
    <div className="my-3 overflow-x-auto">
      <table className="border-collapse text-[0.92em]" {...p} />
    </div>
  ),
  th: (p) => <th className="border border-black/10 bg-black/5 px-2 py-1 text-left font-semibold dark:border-white/10 dark:bg-white/5" {...p} />,
  td: (p) => <td className="border border-black/10 px-2 py-1 dark:border-white/10" {...p} />,
  img: ({ alt, src }) => <img alt={alt ?? ""} src={typeof src === "string" ? src : undefined} className="my-2 inline-block max-w-full" />,
};

/** GitHub-flavoured markdown. `baseUrl` resolves relative links/images (e.g. a repo's raw URL). */
export function Markdown({ text, baseUrl }: { text: string; baseUrl?: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
      urlTransform={(url) => {
        const safe = defaultUrlTransform(url);
        if (!baseUrl || !safe || /^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(safe)) return safe;
        try {
          return new URL(safe.replace(/^\//, ""), baseUrl).toString();
        } catch {
          return safe;
        }
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
