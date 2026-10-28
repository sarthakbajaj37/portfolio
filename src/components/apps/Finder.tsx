"use client";

import { useState } from "react";
import { ExternalLink, Folder, FolderGit2, Hammer } from "lucide-react";
import { GithubIcon } from "@/components/BrandIcons";
import { projects, type Project } from "@/data/projects";
import { profile } from "@/data/profile";

export function Finder() {
  const [selected, setSelected] = useState<Project | null>(null);

  return (
    <div className="flex h-full text-[13px]">
      <aside className="hidden w-44 shrink-0 border-r border-black/5 bg-neutral-50/80 p-3 sm:block dark:border-white/5 dark:bg-neutral-900/60">
        <p className="mb-1 text-[11px] font-semibold text-neutral-400">Favourites</p>
        <div className="flex items-center gap-2 rounded-md bg-black/5 px-2 py-1 dark:bg-white/10">
          <Folder size={14} className="text-sky-500" /> Projects
        </div>
        <a
          href={profile.links.github}
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 flex items-center gap-2 rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <GithubIcon size={14} className="text-sky-500" /> GitHub
        </a>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {projects.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <Hammer size={40} className="text-neutral-300 dark:text-neutral-600" />
            <p className="text-[15px] font-semibold">Nothing here yet — something&apos;s being built 🚧</p>
            <p className="max-w-xs text-neutral-500">
              Side projects will land in this folder soon. Meanwhile, peek at{" "}
              <a href={profile.links.github} target="_blank" rel="noreferrer" className="text-sky-600 underline dark:text-sky-400">
                my GitHub
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2 overflow-auto p-4">
            {projects.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setSelected(p)}
                className={`flex flex-col items-center gap-1 rounded-lg p-2 ${
                  selected?.name === p.name ? "bg-sky-500/15" : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <FolderGit2 size={44} className="text-sky-500" strokeWidth={1.4} />
                <span className="line-clamp-2 text-center text-[12px]">{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <footer className="border-t border-black/5 bg-neutral-50/80 p-4 dark:border-white/5 dark:bg-neutral-900/60">
            <p className="font-semibold">
              {selected.name} {selected.year && <span className="font-normal text-neutral-400">· {selected.year}</span>}
            </p>
            <p className="mt-1 text-neutral-600 dark:text-neutral-300">{selected.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selected.stack.map((s) => (
                <span key={s} className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] dark:bg-white/10">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-sky-600 dark:text-sky-400">
              {selected.github && (
                <a href={selected.github} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                  <GithubIcon size={13} /> Source
                </a>
              )}
              {selected.live && (
                <a href={selected.live} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                  <ExternalLink size={13} /> Live
                </a>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
