// Shared types for the desktop shell. Kept free of component imports so any
// file (apps included) can import them without creating import cycles.

export type AppId =
  | "finder"
  | "notes"
  | "messages"
  | "mail"
  | "calendar"
  | "weather"
  | "photos"
  | "music"
  | "terminal"
  | "textedit"
  | "preview"
  | "games"
  | "settings";

export type Rect = { x: number; y: number; w: number; h: number };

export type WindowMetadata = Record<string, unknown>;

export type WindowState = {
  id: string; // "notes" for single-window apps, "finder-2" for multi-window ones
  appId: AppId;
  key?: string; // de-dupes multi-window instances, e.g. a file path
  title?: string; // overrides the app's default window title
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  z: number;
  rect: Rect;
  metadata: WindowMetadata;
};

/** Props every app component receives from the shell. */
export type AppProps = {
  windowId: string;
  metadata: WindowMetadata;
  /** true when rendered full-screen on the phone layout */
  mobile?: boolean;
};

export type OpenOptions = {
  /** Multi-window apps: reuse the window that already has this key (e.g. a file path). */
  key?: string;
  metadata?: WindowMetadata;
  title?: string;
};
