"use client";

import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from "react";
import { appIds, appMeta, clampRect, defaultRect } from "./app-meta";
import type { AppId, OpenOptions, Rect, WindowMetadata, WindowState } from "./types";

export type { AppId, Rect, WindowState } from "./types";

type State = {
  windows: Record<string, WindowState>;
  topZ: number;
  focused: string | null;
  viewport: { w: number; h: number };
};

type Action =
  | { type: "open"; appId: AppId; opts?: OpenOptions }
  | { type: "close"; id: string }
  | { type: "minimize"; id: string }
  | { type: "toggleMaximize"; id: string }
  | { type: "focus"; id: string }
  | { type: "setRect"; id: string; rect: Rect }
  | { type: "setMetadata"; id: string; patch: WindowMetadata }
  | { type: "setTitle"; id: string; title: string }
  | { type: "quitApp"; appId: AppId }
  | { type: "reset"; windows: Record<string, WindowState> }
  | { type: "viewport"; w: number; h: number };

const STORAGE_KEY = "sb-desktop-windows-v1";

// Brings a window to the front by giving it the next-highest z-index.
function raise(state: State, id: string, patch: Partial<WindowState> = {}): State {
  const topZ = state.topZ + 1;
  return {
    ...state,
    topZ,
    focused: id,
    windows: { ...state.windows, [id]: { ...state.windows[id], ...patch, z: topZ } },
  };
}

// After a window closes/minimizes, focus whichever visible window is on top.
function topVisible(windows: State["windows"]): string | null {
  let best: WindowState | null = null;
  for (const w of Object.values(windows)) {
    if (w.open && !w.minimized && (!best || w.z > best.z)) best = w;
  }
  return best?.id ?? null;
}

function closedWindow(appId: AppId, vw: number, vh: number): WindowState {
  return {
    id: appId,
    appId,
    open: false,
    minimized: false,
    maximized: false,
    z: 0,
    rect: defaultRect(appId, vw, vh),
    metadata: {},
  };
}

/** Single-window apps always have a (possibly closed) window entry. */
export function defaultWindows(vw: number, vh: number, openApps: AppId[] = []): Record<string, WindowState> {
  const windows: Record<string, WindowState> = {};
  for (const id of appIds) {
    if (appMeta[id].multiWindow) continue;
    windows[id] = closedWindow(id, vw, vh);
  }
  openApps.forEach((id, i) => {
    windows[id] = { ...windows[id], open: true, z: i + 1 };
  });
  return windows;
}

function reducer(state: State, action: Action): State {
  const { w: vw, h: vh } = state.viewport;
  switch (action.type) {
    case "open": {
      const { appId, opts } = action;
      const meta = appMeta[appId];
      if (!meta.multiWindow) {
        const existing = state.windows[appId] ?? closedWindow(appId, vw, vh);
        return raise(
          { ...state, windows: { ...state.windows, [appId]: existing } },
          appId,
          {
            open: true,
            minimized: false,
            ...(opts?.metadata ? { metadata: { ...existing.metadata, ...opts.metadata } } : {}),
            ...(opts?.title ? { title: opts.title } : {}),
          },
        );
      }
      // Multi-window: focus an existing window with the same key, else create one.
      const siblings = Object.values(state.windows).filter((w) => w.appId === appId);
      const match = opts?.key ? siblings.find((w) => w.key === opts.key) : undefined;
      if (match) return raise(state, match.id, { minimized: false });
      let n = 1;
      while (state.windows[`${appId}-${n}`]) n++;
      const id = `${appId}-${n}`;
      const win: WindowState = {
        id,
        appId,
        key: opts?.key,
        title: opts?.title,
        open: true,
        minimized: false,
        maximized: false,
        z: 0,
        rect: defaultRect(appId, vw, vh, siblings.length),
        metadata: opts?.metadata ?? {},
      };
      return raise({ ...state, windows: { ...state.windows, [id]: win } }, id);
    }
    case "close": {
      const win = state.windows[action.id];
      if (!win) return state;
      const windows = { ...state.windows };
      if (appMeta[win.appId].multiWindow) delete windows[action.id];
      else windows[action.id] = { ...win, open: false, minimized: false, maximized: false };
      return { ...state, windows, focused: topVisible(windows) };
    }
    case "quitApp": {
      const windows = { ...state.windows };
      for (const w of Object.values(windows)) {
        if (w.appId !== action.appId) continue;
        if (appMeta[w.appId].multiWindow) delete windows[w.id];
        else windows[w.id] = { ...w, open: false, minimized: false, maximized: false };
      }
      return { ...state, windows, focused: topVisible(windows) };
    }
    case "minimize": {
      const windows = { ...state.windows, [action.id]: { ...state.windows[action.id], minimized: true } };
      return { ...state, windows, focused: topVisible(windows) };
    }
    case "toggleMaximize":
      return raise(state, action.id, { maximized: !state.windows[action.id].maximized });
    case "focus":
      if (!state.windows[action.id]) return state;
      return state.focused === action.id && !state.windows[action.id].minimized
        ? state
        : raise(state, action.id, { open: true, minimized: false });
    case "setRect":
      return patchWindow(state, action.id, { rect: action.rect });
    case "setMetadata":
      return patchWindow(state, action.id, { metadata: { ...state.windows[action.id]?.metadata, ...action.patch } });
    case "setTitle":
      return patchWindow(state, action.id, { title: action.title });
    case "reset":
      return init(action.windows, state.viewport);
    case "viewport": {
      const windows = Object.fromEntries(
        Object.entries(state.windows).map(([id, w]) => [id, { ...w, rect: clampRect(w.rect, action.w, action.h) }]),
      );
      return { ...state, windows, viewport: { w: action.w, h: action.h } };
    }
  }
}

function patchWindow(state: State, id: string, patch: Partial<WindowState>): State {
  const win = state.windows[id];
  if (!win) return state;
  return { ...state, windows: { ...state.windows, [id]: { ...win, ...patch } } };
}

function init(windows: Record<string, WindowState>, viewport: State["viewport"]): State {
  const zs = Object.values(windows).map((w) => w.z);
  return { windows, topZ: Math.max(0, ...zs), focused: topVisible(windows), viewport };
}

/** Restore the previous layout of this tab (sessionStorage), dropping unknown apps. */
function restore(vw: number, vh: number): Record<string, WindowState> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, WindowState>;
    const windows = defaultWindows(vw, vh);
    for (const w of Object.values(saved)) {
      if (!(w.appId in appMeta)) continue;
      const { min } = appMeta[w.appId];
      windows[w.id] = { ...w, rect: clampRect({ ...w.rect, w: Math.max(w.rect.w, min.w), h: Math.max(w.rect.h, min.h) }, vw, vh) };
    }
    return windows;
  } catch {
    return null;
  }
}

export function clearSavedLayout() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

type Ctx = {
  state: State;
  openApp: (appId: AppId, opts?: OpenOptions) => void;
  close: (id: string) => void;
  minimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  focus: (id: string) => void;
  setRect: (id: string, rect: Rect) => void;
  setMetadata: (id: string, patch: WindowMetadata) => void;
  setTitle: (id: string, title: string) => void;
  quitApp: (appId: AppId) => void;
  /** Close everything and reopen the given apps (used after log out / restart). */
  reset: (openApps: AppId[]) => void;
  focusedApp: AppId | null;
};

const WindowContext = createContext<Ctx | null>(null);

export function WindowManagerProvider({
  viewport,
  defaultApps,
  children,
}: {
  viewport: { w: number; h: number };
  defaultApps: AppId[];
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    const windows = restore(viewport.w, viewport.h) ?? defaultWindows(viewport.w, viewport.h, defaultApps);
    return init(windows, viewport);
  });

  // Re-clamp windows when the browser is resized.
  useEffect(() => {
    if (viewport.w !== state.viewport.w || viewport.h !== state.viewport.h) {
      dispatch({ type: "viewport", w: viewport.w, h: viewport.h });
    }
  }, [viewport, state.viewport]);

  // Debounced save so a drag doesn't write to storage on every frame.
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.windows));
      } catch {}
    }, 500);
  }, [state.windows]);

  const ctx: Ctx = {
    state,
    openApp: (appId, opts) => dispatch({ type: "open", appId, opts }),
    close: (id) => dispatch({ type: "close", id }),
    minimize: (id) => dispatch({ type: "minimize", id }),
    toggleMaximize: (id) => dispatch({ type: "toggleMaximize", id }),
    focus: (id) => dispatch({ type: "focus", id }),
    setRect: (id, rect) => dispatch({ type: "setRect", id, rect }),
    setMetadata: (id, patch) => dispatch({ type: "setMetadata", id, patch }),
    setTitle: (id, title) => dispatch({ type: "setTitle", id, title }),
    quitApp: (appId) => dispatch({ type: "quitApp", appId }),
    reset: (openApps) => dispatch({ type: "reset", windows: defaultWindows(state.viewport.w, state.viewport.h, openApps) }),
    focusedApp: state.focused ? (state.windows[state.focused]?.appId ?? null) : null,
  };

  return <WindowContext.Provider value={ctx}>{children}</WindowContext.Provider>;
}

export function useWindows() {
  const ctx = useContext(WindowContext);
  if (!ctx) throw new Error("useWindows must be used inside WindowManagerProvider");
  return ctx;
}

/** Inside an app: info about the window it's rendered in. */
type SelfCtx = { windowId: string; isFocused: boolean };
export const WindowSelfContext = createContext<SelfCtx>({ windowId: "", isFocused: true });

export function useWindowSelf() {
  const self = useContext(WindowSelfContext);
  const { close, setTitle, setMetadata, state } = useWindows();
  return {
    ...self,
    metadata: state.windows[self.windowId]?.metadata ?? {},
    close: () => close(self.windowId),
    setTitle: (t: string) => setTitle(self.windowId, t),
    setMetadata: (patch: WindowMetadata) => setMetadata(self.windowId, patch),
  };
}
