// macOS wallpapers (images in /public/wallpapers) plus a few CSS gradient ones.

export type Wallpaper = { id: string; name: string; css: string; thumb?: string };

const photo = (id: string, name: string): Wallpaper => ({
  id,
  name,
  css: `center / cover no-repeat url(/wallpapers/${id}-wallpaper.jpg), #1b2a6b`,
  thumb: `/wallpapers/thumbnails/${id}-wallpaper-thumb.jpg`,
});

export const wallpapers: Wallpaper[] = [
  photo("sierra", "Sierra"),
  photo("tahoe", "Tahoe"),
  photo("sequoia", "Sequoia"),
  photo("sonoma", "Sonoma"),
  photo("mojave", "Mojave"),
  photo("elcapitan", "El Capitan"),
  photo("yosemite", "Yosemite"),
  photo("mountain-lion", "Mountain Lion"),
  photo("lion", "Lion"),
  photo("snow-leopard", "Snow Leopard"),
  photo("leopard-server", "Leopard"),
  {
    id: "bloom",
    name: "Bloom",
    css: `radial-gradient(ellipse 80% 60% at 15% 85%, #ff7a59 0%, transparent 60%),
      radial-gradient(ellipse 70% 60% at 85% 20%, #7c5cff 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 70% 90%, #ff4fa0 0%, transparent 55%),
      radial-gradient(ellipse 90% 70% at 30% 10%, #2f7bff 0%, transparent 60%),
      linear-gradient(160deg, #1b2a6b 0%, #3b1f78 55%, #7a2d6b 100%)`,
  },
  {
    id: "dune",
    name: "Dune",
    css: `radial-gradient(ellipse 120% 60% at 50% 110%, #c2562c 0%, transparent 60%),
      radial-gradient(ellipse 90% 50% at 20% 70%, #e8945a 0%, transparent 60%),
      radial-gradient(ellipse 80% 50% at 80% 30%, #f6c98b 0%, transparent 60%),
      linear-gradient(180deg, #f9e0c0 0%, #e7a46b 55%, #9c3d22 100%)`,
  },
  {
    id: "lagoon",
    name: "Lagoon",
    css: `radial-gradient(ellipse 70% 60% at 20% 20%, #5ef2d6 0%, transparent 60%),
      radial-gradient(ellipse 80% 60% at 85% 80%, #1f6bff 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 60% 40%, #19c3e6 0%, transparent 55%),
      linear-gradient(150deg, #0b4a6b 0%, #0e2f6e 60%, #0a1a40 100%)`,
  },
  {
    id: "aurora",
    name: "Aurora",
    css: `radial-gradient(ellipse 60% 80% at 25% 30%, #3cffa0 0%, transparent 60%),
      radial-gradient(ellipse 50% 70% at 70% 25%, #29d4ff 0%, transparent 60%),
      radial-gradient(ellipse 70% 50% at 80% 70%, #b04dff 0%, transparent 60%),
      linear-gradient(180deg, #04121f 0%, #0a1f33 60%, #120a2b 100%)`,
  },
  {
    id: "peach",
    name: "Peach",
    css: `radial-gradient(ellipse 70% 60% at 20% 80%, #ffb199 0%, transparent 60%),
      radial-gradient(ellipse 70% 60% at 85% 20%, #ffd1e8 0%, transparent 60%),
      radial-gradient(ellipse 60% 60% at 60% 60%, #ff8fab 0%, transparent 60%),
      linear-gradient(160deg, #ffe7d6 0%, #ffc2c7 60%, #f39bb5 100%)`,
  },
  {
    id: "graphite",
    name: "Graphite",
    css: `radial-gradient(ellipse 80% 60% at 30% 20%, #5a6270 0%, transparent 60%),
      radial-gradient(ellipse 70% 60% at 80% 80%, #2d3340 0%, transparent 60%),
      linear-gradient(160deg, #3a3f4a 0%, #1f232b 60%, #121419 100%)`,
  },
];

/** Also accepts "url:<image url>" (e.g. a photo set as wallpaper from Photos). */
export function wallpaperCss(id: string): string {
  if (id.startsWith("url:")) return `center / cover no-repeat url("${id.slice(4)}"), #1b2a6b`;
  return (wallpapers.find((w) => w.id === id) ?? wallpapers[0]).css;
}
