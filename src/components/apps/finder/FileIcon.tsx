/* eslint-disable @next/next/no-img-element -- tiny local thumbnails/icons, next/image adds nothing here */
import { File, FileCode, FileImage, FileJson, FileText, Folder, FolderGit2, Trash2 } from "lucide-react";
import { extOf, fileClass, TRASH, type VNode } from "@/lib/vfs";

const CODE_EXT = new Set([
  "java", "kt", "ts", "tsx", "js", "jsx", "mjs", "py", "go", "rs", "c", "h", "cpp", "cc", "hpp", "cs", "rb", "php",
  "swift", "sh", "zsh", "bash", "sql", "html", "css", "scss", "xml", "yml", "yaml", "toml", "gradle",
]);

/** macOS-ish icon for a VFS node. `size` is the pixel size of the glyph. */
export function FileIcon({ node, size }: { node: VNode; size: number }) {
  if (node.type === "app" && node.icon) {
    return <img src={node.icon} alt="" width={size} height={size} draggable={false} className="select-none object-contain" />;
  }
  if (node.path === TRASH) return <Trash2 size={size} strokeWidth={1.3} className="text-neutral-400" />;
  if (node.type === "dir") {
    const Glyph = node.repo ? FolderGit2 : Folder;
    return <Glyph size={size} strokeWidth={1.1} className="fill-sky-400/90 text-sky-500 dark:fill-sky-500/80 dark:text-sky-400" />;
  }
  if (node.icon && size >= 32) {
    return (
      <img
        src={node.icon}
        alt=""
        draggable={false}
        style={{ width: size, height: size * 0.66 }}
        className="select-none rounded-[3px] object-cover shadow-sm ring-1 ring-black/10"
      />
    );
  }
  const cls = fileClass(node.name);
  const ext = extOf(node.name);
  if (cls === "image") return <FileImage size={size} strokeWidth={1.2} className="text-violet-500" />;
  if (ext === "json") return <FileJson size={size} strokeWidth={1.2} className="text-amber-500" />;
  if (CODE_EXT.has(ext)) return <FileCode size={size} strokeWidth={1.2} className="text-emerald-600 dark:text-emerald-400" />;
  if (cls === "text") return <FileText size={size} strokeWidth={1.2} className="text-neutral-500 dark:text-neutral-400" />;
  return <File size={size} strokeWidth={1.2} className="text-neutral-400" />;
}
