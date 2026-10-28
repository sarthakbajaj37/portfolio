"use client";

import { createContext, useContext, useReducer, type ReactNode } from "react";

export type AppId = "notes" | "finder" | "terminal" | "textedit" | "mail";

export type Rect = { x: number; y: number; w: number; h: number };

export type WindowState = {
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  z: number;
  rect: Rect;
};

type State = {
  windows: Record<AppId, WindowState>;
  topZ: number;
  focused: AppId | null;
};

type Action =
  | { type: "open"; id: AppId }
  | { type: "close"; id: AppId }
  | { type: "minimize"; id: AppId }
  | { type: "toggleMaximize"; id: AppId }
  | { type: "focus"; id: AppId }
  | { type: "setRect"; id: AppId; rect: Rect };

// Brings a window to the front by giving it the next-highest z-index.
function raise(state: State, id: AppId, patch: Partial<WindowState> = {}): State {
  const topZ = state.topZ + 1;
  return {
    ...state,
    topZ,
    focused: id,
    windows: { ...state.windows, [id]: { ...state.windows[id], ...patch, z: topZ } },
  };
}

// After a window closes/minimizes, focus whichever visible window is on top.
function nextFocused(windows: State["windows"]): AppId | null {
  let best: AppId | null = null;
  for (const [id, w] of Object.entries(windows) as [AppId, WindowState][]) {
    if (w.open && !w.minimized && (!best || w.z > windows[best].z)) best = id;
  }
  return best;
}

function reducer(state: State, action: Action): State {
  const win = state.windows[action.id];
  switch (action.type) {
    case "open":
    case "focus":
      return raise(state, action.id, { open: true, minimized: false });
    case "close":
    case "minimize": {
      const windows = {
        ...state.windows,
        [action.id]:
          action.type === "close"
            ? { ...win, open: false, minimized: false, maximized: false }
            : { ...win, minimized: true },
      };
      return { ...state, windows, focused: nextFocused(windows) };
    }
    case "toggleMaximize":
      return raise(state, action.id, { maximized: !win.maximized });
    case "setRect":
      return { ...state, windows: { ...state.windows, [action.id]: { ...win, rect: action.rect } } };
  }
}

type Ctx = {
  state: State;
  open: (id: AppId) => void;
  close: (id: AppId) => void;
  minimize: (id: AppId) => void;
  toggleMaximize: (id: AppId) => void;
  focus: (id: AppId) => void;
  setRect: (id: AppId, rect: Rect) => void;
};

const WindowContext = createContext<Ctx | null>(null);

export function WindowManagerProvider({
  initial,
  children,
}: {
  initial: State["windows"];
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initial, (windows) => {
    const zs = Object.values(windows).map((w) => w.z);
    return { windows, topZ: Math.max(...zs), focused: nextFocused(windows) };
  });

  const ctx: Ctx = {
    state,
    open: (id) => dispatch({ type: "open", id }),
    close: (id) => dispatch({ type: "close", id }),
    minimize: (id) => dispatch({ type: "minimize", id }),
    toggleMaximize: (id) => dispatch({ type: "toggleMaximize", id }),
    focus: (id) => dispatch({ type: "focus", id }),
    setRect: (id, rect) => dispatch({ type: "setRect", id, rect }),
  };

  return <WindowContext.Provider value={ctx}>{children}</WindowContext.Provider>;
}

export function useWindows() {
  const ctx = useContext(WindowContext);
  if (!ctx) throw new Error("useWindows must be used inside WindowManagerProvider");
  return ctx;
}
