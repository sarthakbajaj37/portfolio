"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { profile } from "@/data/profile";
import { GithubIcon, LinkedinIcon } from "@/components/BrandIcons";

export function Mail() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const href = `mailto:${profile.email}?subject=${encodeURIComponent(subject || "Hey Sarthak 👋")}&body=${encodeURIComponent(body)}`;

  return (
    <div className="flex h-full flex-col text-[13px]">
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-2 dark:border-white/5">
        <span className="font-semibold">New Message</span>
        <a
          href={href}
          className="flex items-center gap-1.5 rounded-md bg-sky-500 px-3 py-1 font-medium text-white hover:bg-sky-600"
        >
          <Send size={13} /> Send
        </a>
      </div>
      <Field label="To:">
        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-700 dark:text-sky-300">{profile.name}</span>
      </Field>
      <Field label="Subject:">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Hey Sarthak 👋"
          className="w-full bg-transparent outline-none placeholder:text-neutral-400"
        />
      </Field>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Say hi, pitch an idea, or just tell me what you're building…"
        className="min-h-0 flex-1 resize-none bg-transparent p-4 outline-none placeholder:text-neutral-400"
      />
      <div className="flex flex-wrap items-center gap-4 border-t border-black/5 px-4 py-2.5 text-neutral-500 dark:border-white/5">
        <span>or find me on</span>
        <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[#0a66c2]">
          <LinkedinIcon size={14} /> LinkedIn
        </a>
        <a href={profile.links.github} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white">
          <GithubIcon size={14} /> GitHub
        </a>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-black/5 px-4 py-2 dark:border-white/5">
      <span className="w-14 shrink-0 text-right text-neutral-400">{label}</span>
      {children}
    </div>
  );
}
