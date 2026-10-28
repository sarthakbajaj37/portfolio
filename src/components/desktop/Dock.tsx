"use client";

import { useWindows } from "./WindowManager";
import { AppIcon, apps } from "./apps";
import { GithubIcon, LinkedinIcon } from "@/components/BrandIcons";
import { profile } from "@/data/profile";

export function Dock() {
  const { state, open } = useWindows();

  return (
    <footer className="fixed inset-x-0 bottom-2 z-[10000] flex justify-center">
      <div className="flex items-end gap-1.5 rounded-2xl border border-white/30 bg-white/25 px-2 pb-1.5 pt-1.5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/25">
        {apps.map((app) => (
          <DockItem key={app.id} label={app.name} running={state.windows[app.id].open} onClick={() => open(app.id)}>
            <AppIcon app={app} size={50} />
          </DockItem>
        ))}
        <div className="mx-1 h-12 w-px self-center bg-black/20 dark:bg-white/20" />
        <DockItem label="GitHub" href={profile.links.github}>
          <div className="flex h-[50px] w-[50px] items-center justify-center rounded-[22%] bg-gradient-to-b from-[#444] to-[#111] text-white shadow-md">
            <GithubIcon size={28} />
          </div>
        </DockItem>
        <DockItem label="LinkedIn" href={profile.links.linkedin}>
          <div className="flex h-[50px] w-[50px] items-center justify-center rounded-[22%] bg-white text-[#0a66c2] shadow-md">
            <LinkedinIcon size={30} />
          </div>
        </DockItem>
      </div>
    </footer>
  );
}

function DockItem({
  label,
  running,
  onClick,
  href,
  children,
}: {
  label: string;
  running?: boolean;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-800/80 px-2 py-0.5 text-[12px] text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
        {label}
      </span>
      <span className="block origin-bottom transition-transform duration-200 ease-out group-hover:-translate-y-2 group-hover:scale-125 group-active:brightness-75">
        {children}
      </span>
      <span className={`mx-auto mt-0.5 block h-1 w-1 rounded-full bg-black/70 dark:bg-white/80 ${running ? "" : "invisible"}`} />
    </>
  );
  const cls = "group relative";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" aria-label={`Open ${label}`} onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
