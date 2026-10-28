"use client";

import { useState, type ReactNode } from "react";
import { Pin, Search } from "lucide-react";
import { profile } from "@/data/profile";

type Note = { id: string; title: string; preview: string; pinned?: boolean; body: ReactNode };

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="underline decoration-[#ffc600] decoration-2 underline-offset-2 hover:bg-[#ffe390]/40">
    {children}
  </a>
);

const [current, ...previous] = profile.experience;

const notes: Note[] = [
  {
    id: "about",
    title: profile.name.toLowerCase(),
    preview: profile.headline,
    pinned: true,
    body: (
      <>
        {profile.about.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <h3>currently</h3>
        <ul>
          <li>
            {current.roles[0].title.toLowerCase()} at <strong>{current.company}</strong>, {current.location.split(",")[0]}
          </li>
          <li>building side projects — they&apos;ll show up in the Projects folder soon</li>
        </ul>
        <h3>previously</h3>
        <ul>
          {previous.flatMap((job) =>
            job.roles.map((r) => (
              <li key={job.company + r.title}>
                {r.title.toLowerCase()} at <strong>{job.company}</strong> <span className="muted">({r.period})</span>
              </li>
            )),
          )}
          <li>
            {profile.education.degree.toLowerCase()} at <strong>{profile.education.school}</strong>{" "}
            <span className="muted">({profile.education.detail})</span>
          </li>
        </ul>
        <h3>elsewhere</h3>
        <p>
          <A href={profile.links.github}>github</A> · <A href={profile.links.linkedin}>linkedin</A> ·{" "}
          <A href={`mailto:${profile.email}`}>email</A>
        </p>
      </>
    ),
  },
  {
    id: "skills",
    title: "stack & skills",
    preview: Object.values(profile.skills).flat().slice(0, 6).join(", "),
    body: (
      <>
        {Object.entries(profile.skills).map(([group, items]) => (
          <div key={group}>
            <h3>{group.toLowerCase()}</h3>
            <div className="flex flex-wrap gap-1.5">
              {items.map((s) => (
                <span key={s} className="rounded-md bg-neutral-100 px-2 py-0.5 text-[12px] dark:bg-neutral-800">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </>
    ),
  },
  {
    id: "wins",
    title: "wins",
    preview: profile.achievements[0],
    body: (
      <ul>
        {profile.achievements.map((a) => (
          <li key={a}>🏆 {a}</li>
        ))}
        <li>4x throughput on a Kafka-based bulk stock ingestion engine</li>
        <li>60% faster bulk invoicing by modelling distributor hierarchies as a graph</li>
      </ul>
    ),
  },
  {
    id: "principles",
    title: "how i like to work",
    preview: "Own it end to end. Keep it boring. Measure first.",
    body: (
      <ul>
        <li><strong>own it end to end</strong> — design, ship, and stay on call for it.</li>
        <li><strong>boring is a feature</strong> — the best infra is the kind nobody has to think about.</li>
        <li><strong>measure, then optimize</strong> — every big win I&apos;ve had started with a profiler.</li>
        <li><strong>leave the codebase nicer</strong> — reviews are for teaching, not gatekeeping.</li>
      </ul>
    ),
  },
];

export function Notes() {
  const [activeId, setActiveId] = useState(notes[0].id);
  const [query, setQuery] = useState("");
  const active = notes.find((n) => n.id === activeId) ?? notes[0];
  const q = query.trim().toLowerCase();
  const visible = q ? notes.filter((n) => (n.title + n.preview).toLowerCase().includes(q)) : notes;

  return (
    <div className="flex h-full">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-black/5 bg-neutral-50 sm:flex dark:border-white/5 dark:bg-neutral-900/60">
        <label className="m-2 flex items-center gap-1.5 rounded-md bg-black/5 px-2 py-1 text-[12px] text-neutral-500 dark:bg-white/10">
          <Search size={12} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent outline-none placeholder:text-neutral-400"
          />
        </label>
        <ul className="flex-1 overflow-auto px-2 pb-2">
          {visible.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => setActiveId(n.id)}
                className={`w-full rounded-md px-2.5 py-2 text-left ${
                  n.id === active.id ? "bg-[#ffe390] dark:bg-[#ffe390]/25" : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-1 text-[13px] font-semibold">
                  {n.pinned && <Pin size={11} className="shrink-0 rotate-45 text-[#e0a800]" />}
                  <span className="truncate">{n.title}</span>
                </div>
                <div className="truncate text-[12px] text-neutral-500">{n.preview}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <article className="note-body flex-1 overflow-auto px-6 py-4 sm:px-8">
        <p className="mb-4 text-center text-[11px] text-neutral-400">
          {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h1>{active.title}</h1>
        {active.body}
      </article>
    </div>
  );
}
