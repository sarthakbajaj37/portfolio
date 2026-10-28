import type { ComponentType } from "react";
import Image from "next/image";
import {
  Calendar as CalendarGlyph,
  CloudSun,
  Eye,
  FileText,
  FolderOpen,
  Gamepad2,
  Image as ImageGlyph,
  Mail as MailGlyph,
  MessageCircle,
  Music2,
  Settings as SettingsGlyph,
  SquareTerminal,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { FinderApp } from "@/components/apps/finder/FinderApp";
import { NotesApp } from "@/components/apps/notes/NotesApp";
import { MessagesApp } from "@/components/apps/messages/MessagesApp";
import { MailApp } from "@/components/apps/mail/MailApp";
import { CalendarApp } from "@/components/apps/calendar/CalendarApp";
import { CalendarIcon } from "@/components/apps/calendar/CalendarIcon";
import { WeatherApp } from "@/components/apps/weather/WeatherApp";
import { PhotosApp } from "@/components/apps/photos/PhotosApp";
import { MusicApp } from "@/components/apps/music/MusicApp";
import { TerminalApp } from "@/components/apps/terminal/TerminalApp";
import { TextEditApp } from "@/components/apps/textedit/TextEditApp";
import { PreviewApp } from "@/components/apps/preview/PreviewApp";
import { GamesApp } from "@/components/apps/games/GamesApp";
import { SettingsApp } from "@/components/apps/settings/SettingsApp";
import { appIconSrc, appMeta, type AppMeta } from "./app-meta";
import type { AppId, AppProps } from "./types";

export type AppDef = AppMeta & {
  mobileName: string;
  Glyph: LucideIcon;
  iconClass: string; // background gradient + glyph colour
  /** real macOS icon in /public/icons */
  iconSrc?: string;
  /** custom icon renderer (e.g. Calendar's live date) */
  Icon?: ComponentType<{ size: number }>;
  Component: ComponentType<AppProps>;
  bodyClassName?: string;
};

type Visual = Omit<AppDef, keyof AppMeta>;

const visuals: Record<AppId, Visual> = {
  finder: { mobileName: "Projects", Glyph: FolderOpen, iconClass: "bg-gradient-to-b from-[#6ccbff] to-[#1e7cf2] text-white", Component: FinderApp },
  notes: { mobileName: "About", Glyph: StickyNote, iconClass: "bg-gradient-to-b from-[#fff6c9] to-[#ffd84d] text-[#b88a00]", Component: NotesApp },
  messages: { mobileName: "Messages", Glyph: MessageCircle, iconClass: "bg-gradient-to-b from-[#6cf27b] to-[#14b829] text-white", Component: MessagesApp },
  mail: { mobileName: "Contact", Glyph: MailGlyph, iconClass: "bg-gradient-to-b from-[#5ab8ff] to-[#1170ec] text-white", Component: MailApp },
  calendar: { mobileName: "Calendar", Glyph: CalendarGlyph, iconClass: "bg-white text-[#ff3b30]", Icon: CalendarIcon, Component: CalendarApp },
  weather: { mobileName: "Weather", Glyph: CloudSun, iconClass: "bg-gradient-to-b from-[#4fa8ff] to-[#1d5fd6] text-white", Component: WeatherApp },
  photos: { mobileName: "Photos", Glyph: ImageGlyph, iconClass: "bg-gradient-to-br from-[#ffd65a] via-[#ff6fa0] to-[#7b6cff] text-white", Component: PhotosApp },
  music: { mobileName: "Music", Glyph: Music2, iconClass: "bg-gradient-to-b from-[#ff6b81] to-[#fa233b] text-white", Component: MusicApp },
  terminal: { mobileName: "Terminal", Glyph: SquareTerminal, iconClass: "bg-gradient-to-b from-[#3a3a3a] to-[#111] text-[#4ade80]", Component: TerminalApp, bodyClassName: "bg-[#1e1e1e]" },
  textedit: { mobileName: "TextEdit", Glyph: FileText, iconClass: "bg-gradient-to-b from-white to-[#e5e5e5] text-neutral-600", Component: TextEditApp },
  preview: { mobileName: "Preview", Glyph: Eye, iconClass: "bg-gradient-to-b from-[#e8f2ff] to-[#b9d4f7] text-[#2a6fd6]", Component: PreviewApp },
  games: { mobileName: "Games", Glyph: Gamepad2, iconClass: "bg-gradient-to-br from-[#ff9f43] via-[#ee5a6f] to-[#8e44ad] text-white", Component: GamesApp },
  settings: { mobileName: "Settings", Glyph: SettingsGlyph, iconClass: "bg-gradient-to-b from-[#a8adb7] to-[#6b7280] text-white", Component: SettingsApp },
};

/** Dock order. Apps with inDock=false still appear here while they have open windows. */
const ORDER: AppId[] = ["finder", "notes", "messages", "mail", "calendar", "photos", "music", "weather", "terminal", "textedit", "preview", "games", "settings"];

export const apps: AppDef[] = ORDER.map((id) => ({ ...appMeta[id], iconSrc: appIconSrc[id], ...visuals[id] }));

export const appById = Object.fromEntries(apps.map((a) => [a.id, a])) as Record<AppId, AppDef>;

export function AppIcon({ app, size = 48 }: { app: AppDef; size?: number }) {
  if (app.Icon) return <app.Icon size={size} />;
  if (app.iconSrc) {
    // macOS icon artwork already includes its own shape and shadow
    return <Image src={app.iconSrc} alt={app.name} width={size} height={size} draggable={false} className="select-none" />;
  }
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
