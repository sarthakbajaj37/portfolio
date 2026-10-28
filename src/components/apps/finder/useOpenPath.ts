"use client";

import { useCallback } from "react";
import { useWindows } from "@/components/desktop/WindowManager";
import type { OpenOptions, WindowState } from "@/components/desktop/types";
import type { AppId } from "@/components/desktop/types";
import { addRecent, displayName, normalize, openTarget, stat, statAsync, type VNode } from "@/lib/vfs";

type OpenApp = (appId: AppId, opts?: OpenOptions) => void;

/** Open a resolved node with the right app. Returns an error message, if any. */
export function openNode(
  node: VNode,
  openApp: OpenApp,
  windows: Record<string, WindowState>,
  focus: (id: string) => void,
): string | null {
  const t = openTarget(node);
  switch (t.app) {
    case "launch":
      openApp(t.appId);
      return null;
    case "finder": {
      // Focus a Finder window already showing this folder, else open a new one.
      const existing = Object.values(windows).find((w) => w.appId === "finder" && w.open && normalize(String(w.metadata.path ?? "")) === t.path);
      if (existing) focus(existing.id);
      else openApp("finder", { metadata: { path: t.path }, title: displayName(t.path) });
      return null;
    }
    case "textedit":
      addRecent(t.path);
      openApp("textedit", { key: t.path, metadata: { path: t.path }, title: t.name });
      return null;
    case "preview":
      addRecent(t.path);
      openApp("preview", { key: t.path, metadata: { path: t.path, src: t.src }, title: t.name });
      return null;
    case "external":
      window.open(t.url, "_blank", "noopener,noreferrer");
      return null;
    case "none":
      return t.reason;
  }
}

/**
 * Returns `(path) => void` that opens any VFS path like Finder would:
 * folders in Finder, text in TextEdit, images/PDFs in Preview, apps launch.
 * GitHub paths are fetched first if needed.
 */
export function useOpenPath(): (path: string) => void {
  const { openApp, focus, state } = useWindows();
  const windows = state.windows;
  return useCallback(
    (path: string) => {
      const p = normalize(path);
      const node = stat(p);
      if (node) {
        openNode(node, openApp, windows, focus);
        return;
      }
      void statAsync(p).then((n) => {
        if (n) openNode(n, openApp, windows, focus);
        else if (p.includes("/Projects/")) openApp("finder", { metadata: { path: p }, title: displayName(p) });
      });
    },
    [openApp, focus, windows],
  );
}
