"use client";

/* eslint-disable @next/next/no-img-element -- remote iTunes artwork, no next/image config */

import { useMemo, useState } from "react";
import {
  Clock,
  Grid2x2,
  Heart,
  ListMusic,
  Music2,
  Pause,
  Play,
  PlayCircle,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { AppProps } from "@/components/desktop/types";
import { allTracks, playlists, type Playlist, type Track } from "@/data/music";
import { toggleFavourite, useFavourites, useMusic, useRecentlyPlayed } from "./MusicProvider";

type View =
  | { kind: "listen" }
  | { kind: "browse" }
  | { kind: "recent" }
  | { kind: "favourites" }
  | { kind: "playlist"; id: string };

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

function sameView(a: View, b: View) {
  return a.kind === b.kind && (a.kind !== "playlist" || (b.kind === "playlist" && a.id === b.id));
}

export function MusicApp({ mobile }: AppProps) {
  const [view, setView] = useState<View>({ kind: "listen" });
  const [query, setQuery] = useState("");

  const nav: { view: View; label: string; icon: React.ReactNode }[] = [
    { view: { kind: "listen" }, label: "Listen Now", icon: <PlayCircle className="h-4 w-4 text-rose-500" /> },
    { view: { kind: "browse" }, label: "Browse", icon: <Grid2x2 className="h-4 w-4 text-rose-500" /> },
    { view: { kind: "recent" }, label: "Recently Played", icon: <Clock className="h-4 w-4 text-rose-500" /> },
    { view: { kind: "favourites" }, label: "Favourites", icon: <Heart className="h-4 w-4 text-rose-500" /> },
  ];

  const searching = query.trim().length > 0;

  return (
    <div className="flex h-full flex-col bg-white text-[13px] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="flex min-h-0 flex-1">
        {!mobile && (
          <aside className="flex w-52 shrink-0 flex-col gap-4 overflow-y-auto border-r border-black/5 bg-neutral-50/80 px-2.5 py-3 dark:border-white/10 dark:bg-neutral-900/60">
            <label className="flex items-center gap-1.5 rounded-md bg-black/5 px-2 py-1 dark:bg-white/10">
              <Search className="h-3.5 w-3.5 text-neutral-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-neutral-500"
              />
            </label>
            <div>
              <div className="px-2 pb-1 text-[11px] font-semibold text-neutral-400">Apple Music</div>
              {nav.slice(0, 2).map((n) => (
                <SidebarItem key={n.label} active={!searching && sameView(view, n.view)} icon={n.icon} label={n.label} onClick={() => { setQuery(""); setView(n.view); }} />
              ))}
            </div>
            <div>
              <div className="px-2 pb-1 text-[11px] font-semibold text-neutral-400">Library</div>
              {nav.slice(2).map((n) => (
                <SidebarItem key={n.label} active={!searching && sameView(view, n.view)} icon={n.icon} label={n.label} onClick={() => { setQuery(""); setView(n.view); }} />
              ))}
            </div>
            <div>
              <div className="px-2 pb-1 text-[11px] font-semibold text-neutral-400">Playlists</div>
              {playlists.map((p) => (
                <SidebarItem
                  key={p.id}
                  active={!searching && sameView(view, { kind: "playlist", id: p.id })}
                  icon={<ListMusic className="h-4 w-4 text-neutral-500" />}
                  label={p.name}
                  onClick={() => { setQuery(""); setView({ kind: "playlist", id: p.id }); }}
                />
              ))}
            </div>
          </aside>
        )}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {mobile && (
            <div className="sticky top-0 z-10 space-y-2 border-b border-black/5 bg-white/90 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-neutral-900/90">
              <label className="flex items-center gap-1.5 rounded-lg bg-black/5 px-2 py-1.5 dark:bg-white/10">
                <Search className="h-4 w-4 text-neutral-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full bg-transparent text-[15px] outline-none placeholder:text-neutral-500" />
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {[...nav.map((n) => ({ v: n.view, l: n.label })), ...playlists.map((p) => ({ v: { kind: "playlist", id: p.id } as View, l: p.name }))].map((x) => (
                  <button
                    key={x.l}
                    type="button"
                    onClick={() => { setQuery(""); setView(x.v); }}
                    className={
                      !searching && sameView(view, x.v)
                        ? "shrink-0 rounded-full bg-rose-500 px-3 py-1 text-[13px] font-medium text-white"
                        : "shrink-0 rounded-full bg-black/5 px-3 py-1 text-[13px] dark:bg-white/10"
                    }
                  >
                    {x.l}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className={mobile ? "p-3" : "p-6"}>
            {searching ? (
              <SearchView query={query} mobile={mobile} />
            ) : view.kind === "listen" ? (
              <ListenNow onOpen={(id) => setView({ kind: "playlist", id })} mobile={mobile} />
            ) : view.kind === "browse" ? (
              <Browse mobile={mobile} />
            ) : view.kind === "recent" ? (
              <RecentView mobile={mobile} />
            ) : view.kind === "favourites" ? (
              <FavouritesView mobile={mobile} />
            ) : (
              <PlaylistView playlist={playlists.find((p) => p.id === view.id) ?? playlists[0]} mobile={mobile} />
            )}
          </div>
        </main>
      </div>
      <NowPlayingBar mobile={mobile} />
    </div>
  );
}

function SidebarItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex w-full items-center gap-2 rounded-md bg-black/10 px-2 py-1 text-left dark:bg-white/15"
          : "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-black/5 dark:hover:bg-white/5"
      }
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function PlaylistCover({ playlist, className }: { playlist: Playlist; className: string }) {
  const arts = playlist.tracks.slice(0, 4).map((t) => t.artwork);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${playlist.gradient} ${className}`}>
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 opacity-90 mix-blend-luminosity">
        {arts.map((a, i) => (
          <img key={i} src={a} alt="" className="h-full w-full object-cover" loading="lazy" />
        ))}
      </div>
      <div className={`absolute inset-0 bg-gradient-to-br ${playlist.gradient} opacity-70`} />
      <div className="absolute inset-x-0 bottom-0 p-3 text-left text-[15px] font-bold leading-tight text-white drop-shadow">{playlist.name}</div>
    </div>
  );
}

function ListenNow({ onOpen, mobile }: { onOpen: (id: string) => void; mobile?: boolean }) {
  const recent = useRecentlyPlayed();
  const { playQueue } = useMusic();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Listen Now</h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">Playlists Sarthak keeps on rotation. 30-second previews via Apple Music.</p>
      </div>
      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Top Picks</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {playlists.map((p) => (
            <div key={p.id} className="group">
              <button type="button" onClick={() => onOpen(p.id)} className="relative block w-full">
                <PlaylistCover playlist={p} className="aspect-square w-full rounded-xl shadow-md" />
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Play ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    playQueue(p.tracks);
                  }}
                  className={
                    mobile
                      ? "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow"
                      : "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-500 opacity-0 shadow transition group-hover:opacity-100"
                  }
                >
                  <Play className="h-4 w-4 fill-current" />
                </span>
              </button>
              <div className="mt-2 font-medium">{p.name}</div>
              <div className="line-clamp-2 text-[12px] text-neutral-500 dark:text-neutral-400">{p.description}</div>
            </div>
          ))}
        </div>
      </section>
      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Recently Played</h2>
          <TrackShelf tracks={recent.slice(0, 10)} />
        </section>
      )}
    </div>
  );
}

function TrackShelf({ tracks }: { tracks: Track[] }) {
  const { playTrack, current, isPlaying } = useMusic();
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {tracks.map((t) => (
        <button key={t.id} type="button" onClick={() => playTrack(t, tracks)} className="group w-32 shrink-0 text-left">
          <div className="relative">
            <img src={t.artwork} alt="" className="aspect-square w-32 rounded-lg object-cover shadow" loading="lazy" />
            {current?.id === t.id && isPlaying && <EqualizerBadge />}
          </div>
          <div className="mt-1.5 truncate font-medium">{t.title}</div>
          <div className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">{t.artist}</div>
        </button>
      ))}
    </div>
  );
}

function EqualizerBadge() {
  return (
    <div className="absolute bottom-1.5 right-1.5 flex h-6 items-end gap-[2px] rounded bg-black/50 px-1.5 pb-1">
      <span className="h-2 w-[3px] animate-pulse bg-white" />
      <span className="h-3 w-[3px] animate-pulse bg-white [animation-delay:150ms]" />
      <span className="h-1.5 w-[3px] animate-pulse bg-white [animation-delay:300ms]" />
    </div>
  );
}

function Browse({ mobile }: { mobile?: boolean }) {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Browse</h1>
      {playlists.map((p) => (
        <section key={p.id}>
          <h2 className="mb-3 text-[15px] font-semibold">{p.name}</h2>
          <TrackShelf tracks={p.tracks} />
        </section>
      ))}
      {!mobile && <p className="text-[12px] text-neutral-400">{allTracks.length} songs</p>}
    </div>
  );
}

function RecentView({ mobile }: { mobile?: boolean }) {
  const recent = useRecentlyPlayed();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Recently Played</h1>
      {recent.length ? <TrackTable tracks={recent} mobile={mobile} /> : <Empty text="Songs you play will show up here." />}
    </div>
  );
}

function FavouritesView({ mobile }: { mobile?: boolean }) {
  const favs = useFavourites();
  const tracks = useMemo(() => favs.map((id) => allTracks.find((t) => t.id === id)).filter((t): t is Track => !!t), [favs]);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Favourites</h1>
      {tracks.length ? <TrackTable tracks={tracks} mobile={mobile} /> : <Empty text="Tap the heart on a song to add it here." />}
    </div>
  );
}

function SearchView({ query, mobile }: { query: string; mobile?: boolean }) {
  const q = query.trim().toLowerCase();
  const tracks = allTracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q));
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Results for “{query.trim()}”</h1>
      {tracks.length ? <TrackTable tracks={tracks} mobile={mobile} /> : <Empty text="No songs match your search." />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-neutral-500 dark:text-neutral-400">
      <Music2 className="h-8 w-8" />
      <p>{text}</p>
    </div>
  );
}

function PlaylistView({ playlist, mobile }: { playlist: Playlist; mobile?: boolean }) {
  const { playQueue } = useMusic();
  const total = playlist.tracks.reduce((s, t) => s + t.durationMs, 0) / 60000;
  return (
    <div>
      <div className={mobile ? "mb-5 flex flex-col items-center gap-3 text-center" : "mb-6 flex items-end gap-5"}>
        <PlaylistCover playlist={playlist} className={mobile ? "h-44 w-44 rounded-xl shadow-lg" : "h-44 w-44 shrink-0 rounded-xl shadow-lg"} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{playlist.name}</h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">{playlist.description}</p>
          <p className="mt-1 text-[12px] text-neutral-400">
            {playlist.tracks.length} songs · {Math.round(total)} min
          </p>
          <div className={mobile ? "mt-3 flex justify-center gap-2" : "mt-3 flex gap-2"}>
            <button type="button" onClick={() => playQueue(playlist.tracks)} className="flex items-center gap-1.5 rounded-md bg-rose-500 px-4 py-1.5 font-medium text-white hover:bg-rose-600">
              <Play className="h-3.5 w-3.5 fill-current" /> Play
            </button>
            <button type="button" onClick={() => playQueue(playlist.tracks, 0, true)} className="flex items-center gap-1.5 rounded-md bg-rose-500/10 px-4 py-1.5 font-medium text-rose-500 hover:bg-rose-500/20">
              <Shuffle className="h-3.5 w-3.5" /> Shuffle
            </button>
          </div>
        </div>
      </div>
      <TrackTable tracks={playlist.tracks} mobile={mobile} />
    </div>
  );
}

function TrackTable({ tracks, mobile }: { tracks: Track[]; mobile?: boolean }) {
  const { playTrack, current, isPlaying, toggle } = useMusic();
  const favs = useFavourites();
  return (
    <div className="divide-y divide-black/5 dark:divide-white/5">
      {!mobile && (
        <div className="grid grid-cols-[2rem_minmax(0,2fr)_minmax(0,1.3fr)_3rem_2rem] gap-3 px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          <span>#</span>
          <span>Song</span>
          <span>Album</span>
          <span className="text-right">Time</span>
          <span />
        </div>
      )}
      {tracks.map((t, i) => {
        const active = current?.id === t.id;
        const fav = favs.includes(t.id);
        return (
          <div
            key={t.id}
            onDoubleClick={() => (active ? toggle() : playTrack(t, tracks))}
            onClick={() => mobile && (active ? toggle() : playTrack(t, tracks))}
            className={
              mobile
                ? "group grid cursor-default grid-cols-[minmax(0,1fr)_2rem] items-center gap-3 rounded-md px-1 py-2"
                : "group grid cursor-default grid-cols-[2rem_minmax(0,2fr)_minmax(0,1.3fr)_3rem_2rem] items-center gap-3 rounded-md px-2 py-1.5 even:bg-black/[0.02] hover:bg-black/5 dark:even:bg-white/[0.02] dark:hover:bg-white/5"
            }
          >
            {!mobile && (
              <button type="button" onClick={() => (active ? toggle() : playTrack(t, tracks))} className="flex h-6 w-6 items-center justify-center text-neutral-400" aria-label={`Play ${t.title}`}>
                {active && isPlaying ? (
                  <Pause className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                ) : (
                  <>
                    <span className={active ? "text-rose-500 group-hover:hidden" : "group-hover:hidden"}>{i + 1}</span>
                    <Play className="hidden h-3.5 w-3.5 fill-current group-hover:block" />
                  </>
                )}
              </button>
            )}
            <div className="flex min-w-0 items-center gap-2.5">
              <img src={t.artwork} alt="" className="h-9 w-9 shrink-0 rounded object-cover" loading="lazy" />
              <div className="min-w-0">
                <div className={active ? "truncate font-medium text-rose-500" : "truncate font-medium"}>{t.title}</div>
                <div className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">{t.artist}</div>
              </div>
            </div>
            {!mobile && <div className="truncate text-neutral-500 dark:text-neutral-400">{t.album}</div>}
            {!mobile && <div className="text-right tabular-nums text-neutral-500 dark:text-neutral-400">{fmt(t.durationMs / 1000)}</div>}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavourite(t.id);
              }}
              aria-label={fav ? "Remove from Favourites" : "Add to Favourites"}
              className={fav || mobile ? "flex justify-center" : "flex justify-center opacity-0 group-hover:opacity-100"}
            >
              <Heart className={fav ? "h-4 w-4 fill-rose-500 text-rose-500" : "h-4 w-4 text-neutral-400"} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function NowPlayingBar({ mobile }: { mobile?: boolean }) {
  const { current, isPlaying, toggle, next, prev, currentTime, duration, seek, volume, setVolume } = useMusic();
  const favs = useFavourites();
  const VolIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const controls = (
    <div className="flex items-center gap-1">
      <button type="button" onClick={prev} disabled={!current} aria-label="Previous" className="rounded-full p-2 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10">
        <SkipBack className="h-4 w-4 fill-current" />
      </button>
      <button type="button" onClick={toggle} disabled={!current} aria-label={isPlaying ? "Pause" : "Play"} className="rounded-full p-2 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10">
        {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
      </button>
      <button type="button" onClick={next} disabled={!current} aria-label="Next" className="rounded-full p-2 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10">
        <SkipForward className="h-4 w-4 fill-current" />
      </button>
    </div>
  );

  return (
    <div className="shrink-0 border-t border-black/10 bg-neutral-50/95 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-neutral-800/95">
      <div className={mobile ? "flex items-center gap-2" : "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4"}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-700">
            {current ? <img src={current.artwork} alt="" className="h-full w-full object-cover" /> : <Music2 className="absolute inset-0 m-auto h-4 w-4 text-neutral-400" />}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{current?.title ?? "Not Playing"}</div>
            <div className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">{current ? `${current.artist} — ${current.album}` : "Pick something to play"}</div>
          </div>
          {current && (
            <button type="button" onClick={() => toggleFavourite(current.id)} aria-label="Favourite" className="shrink-0 p-1">
              <Heart className={favs.includes(current.id) ? "h-4 w-4 fill-rose-500 text-rose-500" : "h-4 w-4 text-neutral-400"} />
            </button>
          )}
        </div>
        {mobile ? (
          controls
        ) : (
          <div className="flex w-[min(420px,40vw)] flex-col items-center">
            {controls}
            <div className="flex w-full items-center gap-2 text-[11px] tabular-nums text-neutral-500">
              <span className="w-8 text-right">{fmt(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 30}
                step={0.1}
                value={Math.min(currentTime, duration || 30)}
                disabled={!current}
                onChange={(e) => seek(Number(e.target.value))}
                className="h-1 flex-1 accent-rose-500"
                aria-label="Seek"
              />
              <span className="w-8">{fmt(duration)}</span>
            </div>
          </div>
        )}
        {!mobile && (
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setVolume(volume === 0 ? 0.8 : 0)} aria-label="Mute" className="text-neutral-500">
              <VolIcon className="h-4 w-4" />
            </button>
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="h-1 w-24 accent-rose-500" aria-label="Volume" />
          </div>
        )}
      </div>
      {mobile && current && (
        <input
          type="range"
          min={0}
          max={duration || 30}
          step={0.1}
          value={Math.min(currentTime, duration || 30)}
          onChange={(e) => seek(Number(e.target.value))}
          className="mt-1 h-1 w-full accent-rose-500"
          aria-label="Seek"
        />
      )}
    </div>
  );
}
