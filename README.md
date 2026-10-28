# sarthak's desktop 🖥️

My personal portfolio, built as a macOS desktop — draggable/resizable windows, a dock, a working menu bar, and a few apps (Notes, Finder, Terminal, TextEdit, Mail). On phones it turns into an iOS-style home screen.

Inspired by [alanagoyal's macOS desktop portfolio](https://www.alanagoyal.com/).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · lucide-react · deployed on Vercel.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build    # same build Vercel runs
```

## Editing content

| What | Where |
| --- | --- |
| Bio, experience, skills, links | `src/data/profile.ts` |
| Projects (Finder window) | `src/data/projects.ts` — add one object per project |
| Apps in the dock / desktop | `src/components/desktop/apps.tsx` |
| Terminal commands | `src/components/apps/Terminal.tsx` → `commands` |
| Wallpaper | `.wallpaper` in `src/app/globals.css` |

## How it's put together

- `WindowManager.tsx` — context + reducer holding every window's open/minimized/maximized state, position, size and z-index.
- `Window.tsx` — the window chrome; drag and resize use pointer events with `setPointerCapture`.
- `Desktop.tsx` — reads the viewport with `useSyncExternalStore` and renders either the desktop (≥ 768px) or the mobile home screen.
