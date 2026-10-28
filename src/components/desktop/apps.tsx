import type { ComponentType } from "react";
import { FileText, FolderOpen, Mail as MailGlyph, StickyNote, SquareTerminal, type LucideIcon } from "lucide-react";
import { Notes } from "@/components/apps/Notes";
import { Finder } from "@/components/apps/Finder";
import { Terminal } from "@/components/apps/Terminal";
import { TextEdit } from "@/components/apps/TextEdit";
import { Mail } from "@/components/apps/Mail";
import type { AppId, Rect } from "./WindowManager";

export type AppDef = {
  id: AppId;
  name: string; // shown in the dock tooltip + menu bar
  mobileName: string; // label on the phone home screen
  title: string; // window title
  Glyph: LucideIcon;
  iconClass: string; // background gradient + glyph colour
  Component: ComponentType;
  bodyClassName?: string;
  rect: (vw: number, vh: number) => Rect;
};

const centered = (w: number, h: number, dx = 0, dy = 0) => (vw: number, vh: number): Rect => {
  const W = Math.min(w, vw - 40);
  const H = Math.min(h, vh - 160);
  return { x: Math.max(20, (vw - W) / 2 + dx), y: Math.max(40, (vh - H) / 2 - 30 + dy), w: W, h: H };
};

export const apps: AppDef[] = [
  {
    id: "notes",
    name: "Notes",
    mobileName: "About",
    title: "Notes",
    Glyph: StickyNote,
    iconClass: "bg-gradient-to-b from-[#fff6c9] to-[#ffd84d] text-[#b88a00]",
    Component: Notes,
    rect: centered(860, 580),
  },
  {
    id: "finder",
    name: "Finder",
    mobileName: "Projects",
    title: "Projects",
    Glyph: FolderOpen,
    iconClass: "bg-gradient-to-b from-[#6ccbff] to-[#1e7cf2] text-white",
    Component: Finder,
    rect: centered(720, 440, -140, 50),
  },
  {
    id: "terminal",
    name: "Terminal",
    mobileName: "Terminal",
    title: `sarthak — zsh — 80×24`,
    Glyph: SquareTerminal,
    iconClass: "bg-gradient-to-b from-[#3a3a3a] to-[#111] text-[#4ade80]",
    Component: Terminal,
    bodyClassName: "bg-[#1e1e1e]",
    rect: centered(640, 400, 160, 70),
  },
  {
    id: "textedit",
    name: "TextEdit",
    mobileName: "Experience",
    title: "experience.rtf",
    Glyph: FileText,
    iconClass: "bg-gradient-to-b from-white to-[#e5e5e5] text-neutral-600",
    Component: TextEdit,
    rect: centered(760, 620, 60, 10),
  },
  {
    id: "mail",
    name: "Mail",
    mobileName: "Contact",
    title: "New Message",
    Glyph: MailGlyph,
    iconClass: "bg-gradient-to-b from-[#5ab8ff] to-[#1170ec] text-white",
    Component: Mail,
    rect: centered(600, 460, 100, 40),
  },
];

export const appById = Object.fromEntries(apps.map((a) => [a.id, a])) as Record<AppId, AppDef>;

export function AppIcon({ app, size = 48 }: { app: AppDef; size?: number }) {
  const { Glyph } = app;
  return (
    <div
      className={`flex items-center justify-center rounded-[22%] shadow-[0_2px_6px_rgba(0,0,0,0.25),inset_0_0_0_0.5px_rgba(255,255,255,0.4)] ${app.iconClass}`}
      style={{ width: size, height: size }}
    >
      <Glyph size={size * 0.55} strokeWidth={1.8} />
    </div>
  );
}
