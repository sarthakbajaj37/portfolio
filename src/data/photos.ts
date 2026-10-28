// Your own photos for the Photos app.
//
// How to add photos, Sarthak:
//   1. Drop image files into /public/photos (e.g. /public/photos/goa-2025.jpg).
//      Keep them reasonably small (≤ 2500px on the long edge, JPEG/WebP).
//   2. Add an entry below, e.g.
//        { src: "/photos/goa-2025.jpg", title: "Goa sunset", date: "2025-12-28", collection: "Travel" },
//   3. Photos with the same `collection` are grouped into an album in the sidebar.
//
// The macOS wallpapers already show up automatically as a "Wallpapers" album.

export type PhotoEntry = {
  /** path under /public, e.g. "/photos/goa-2025.jpg" */
  src: string;
  title: string;
  /** ISO date (YYYY-MM-DD) — used for the "This Year" / "This Month" filters */
  date: string;
  /** album name shown under Collections */
  collection: string;
  /** optional, shown in the info panel (otherwise read from the image) */
  width?: number;
  height?: number;
};

export const photos: PhotoEntry[] = [];
