"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import Image from "next/image";
import { useWindows } from "./WindowManager";
import { AppIcon, apps, appById, type AppDef } from "./apps";
import type { AppId } from "./types";
import { GithubIcon, LinkedinIcon } from "@/components/BrandIcons";
import { profile } from "@/data/profile";
import { useSettings } from "@/lib/settings";
import { useMessagesUnread } from "@/lib/messages";

const BASE = 50; // icon size in px
const MAX_SCALE = 1.45;
const RADIUS = BASE * 1.6;

export const TRASH_PATH = "/Users/sarthak/.Trash";

export function Dock() {
  const { state, openApp, focus, quitApp, close } = useWindows();
  const { settings } = useSettings();
  const unread = useMessagesUnread();
  const [scales, setScales] = useState<Record<string, number>>({});
  const centers = useRef<Record<string, number>>({});
  const [menu, setMenu] = useState<{ appId: AppId; x: number } | null>(null);

  const windows = Object.values(state.windows);
  const windowsOf = (id: AppId) => windows.filter((w) => w.appId === id && w.open);
  const minimized = windows.filter((w) => w.open && w.minimized).sort((a, b) => a.z - b.z);
  const visibleApps = apps.filter((a) => a.inDock || windowsOf(a.id).length > 0);

  useEffect(() => {
    if (!menu) return;
    const onDown = () => setMenu(null);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menu]);

  function activate(app: AppDef) {
    const own = windowsOf(app.id).sort((a, b) => b.z - a.z);
    if (own.length === 0) return openApp(app.id);
    const visible = own.find((w) => !w.minimized);
    focus((visible ?? own[0]).id);
  }

  // Measure resting icon centres when the pointer enters, then scale from those
  // (measuring live positions would feed back as icons grow).
  function onEnter(e: ReactPointerEvent<HTMLDivElement>) {
    const map: Record<string, number> = {};
    e.currentTarget.querySelectorAll<HTMLElement>("[data-dock-key]").forEach((el) => {
      const r = el.getBoundingClientRect();
      map[el.dataset.dockKey!] = r.left + r.width / 2;
    });
    centers.current = map;
  }

  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!settings.dock.magnification) return;
    const next: Record<string, number> = {};
    for (const [key, c] of Object.entries(centers.current)) {
      const d = Math.abs(e.clientX - c);
      next[key] = d < RADIUS ? 1 + (MAX_SCALE - 1) * Math.cos((d / RADIUS) * (Math.PI / 2)) : 1;
    }
    setScales(next);
  }

  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-1.5 z-[9000] flex justify-center">
      <div
        onPointerEnter={onEnter}
        onPointerMove={onMove}
        onPointerLeave={() => setScales({})}
        className="pointer-events-auto flex items-end gap-1 rounded-2xl border border-white/30 bg-white/25 px-1.5 pb-1 pt-1 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/40"
      >
        {visibleApps.map((app) => (
          <DockItem
            key={app.id}
            dockKey={app.id}
            scale={scales[app.id]}
            label={app.name}
            running={settings.dock.showIndicators && windowsOf(app.id).length > 0}
            badge={app.id === "messages" && unread > 0 ? unread : undefined}
            onClick={() => activate(app)}
            onContextMenu={(x) => setMenu({ appId: app.id, x })}
          >
            {(size) => <AppIcon app={app} size={size} />}
          </DockItem>
        ))}

        <Divider />

        <DockItem dockKey="github" scale={scales.github} label="GitHub" href={profile.links.github}>
          {(size) => (
            <div className="flex items-center justify-center rounded-[22%] bg-gradient-to-b from-[#444] to-[#111] text-white shadow-md" style={{ width: size * 0.86, height: size * 0.86, margin: size * 0.07 }}>
              <GithubIcon size={size * 0.5} />
            </div>
          )}
        </DockItem>
        <DockItem dockKey="linkedin" scale={scales.linkedin} label="LinkedIn" href={profile.links.linkedin}>
          {(size) => (
            <div className="flex items-center justify-center rounded-[22%] bg-white text-[#0a66c2] shadow-md" style={{ width: size * 0.86, height: size * 0.86, margin: size * 0.07 }}>
              <LinkedinIcon size={size * 0.52} />
            </div>
          )}
        </DockItem>

        {minimized.map((w) => (
          <DockItem key={w.id} dockKey={w.id} scale={scales[w.id]} label={w.title ?? appById[w.appId].title} onClick={() => focus(w.id)}>
            {(size) => (
              <div className="relative flex items-center justify-center rounded-md bg-white/70 shadow dark:bg-neutral-700/70" style={{ width: size, height: size * 0.75, marginTop: size * 0.25 }}>
                <AppIcon app={appById[w.appId]} size={size * 0.5} />
              </div>
            )}
          </DockItem>
        ))}

        <DockItem
          dockKey="trash"
          scale={scales.trash}
          label="Trash"
          onClick={() => openApp("finder", { key: TRASH_PATH, metadata: { path: TRASH_PATH }, title: "Trash" })}
        >
          {(size) => <Image src="/icons/trash.png" alt="Trash" width={size} height={size} draggable={false} />}
        </DockItem>
      </div>

      {menu && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto fixed bottom-24 w-48 -translate-x-1/2 rounded-lg border border-black/10 bg-white/85 p-1 text-[13px] shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-800/85 dark:text-white"
          style={{ left: menu.x }}
        >
          {windowsOf(menu.appId).map((w) => (
            <MenuButton key={w.id} onClick={() => (focus(w.id), setMenu(null))}>
              {w.title ?? appById[w.appId].title}
            </MenuButton>
          ))}
          {windowsOf(menu.appId).length > 0 && <hr className="mx-2 my-1 border-black/10 dark:border-white/10" />}
          {appById[menu.appId].multiWindow && <MenuButton onClick={() => (openApp(menu.appId), setMenu(null))}>New Window</MenuButton>}
          {windowsOf(menu.appId).length === 0 ? (
            <MenuButton onClick={() => (openApp(menu.appId), setMenu(null))}>Open</MenuButton>
          ) : (
            <>
              <MenuButton onClick={() => (windowsOf(menu.appId).forEach((w) => close(w.id)), setMenu(null))}>Close All Windows</MenuButton>
              <MenuButton onClick={() => (quitApp(menu.appId), setMenu(null))}>Quit</MenuButton>
            </>
          )}
        </div>
      )}
    </footer>
  );
}

function MenuButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="block w-full truncate rounded px-2.5 py-1 text-left hover:bg-sky-500 hover:text-white">
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-11 w-px self-center bg-black/20 dark:bg-white/20" />;
}

function DockItem({
  dockKey,
  scale = 1,
  label,
  running,
  badge,
  onClick,
  onContextMenu,
  href,
  children,
}: {
  dockKey: string;
  scale?: number;
  label: string;
  running?: boolean;
  badge?: number;
  onClick?: () => void;
  onContextMenu?: (x: number) => void;
  href?: string;
  children: (size: number) => ReactNode;
}) {
  const size = Math.round(BASE * scale);

  const inner = (
    <>
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-black/10 bg-neutral-100/90 px-2 py-0.5 text-[12px] text-neutral-800 opacity-0 shadow backdrop-blur transition-opacity group-hover:opacity-100 dark:border-white/10 dark:bg-neutral-800/90 dark:text-neutral-100">
        {label}
      </span>
      <span className="relative block transition-[width,height] duration-75 ease-out group-active:brightness-75" style={{ width: size, height: size }}>
        {children(size)}
        {badge !== undefined && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3b30] px-1 text-[11px] font-semibold text-white shadow">
            {badge}
          </span>
        )}
      </span>
      <span className={`mx-auto mt-0.5 block h-1 w-1 rounded-full bg-black/70 dark:bg-white/80 ${running ? "" : "invisible"}`} />
    </>
  );

  const common = {
    "aria-label": label,
    "data-dock-key": dockKey,
    className: "group relative flex flex-col items-center",
    onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
      if (!onContextMenu) return;
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      onContextMenu(r.left + r.width / 2);
    },
  };

  return href ? (
    <a href={href} target="_blank" rel="noreferrer" {...common}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} {...common}>
      {inner}
    </button>
  );
}
