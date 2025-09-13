import { readdirSync, statSync } from "node:fs";
import { extname, join, relative, sep, basename } from "node:path";

const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export type PhotoEntry = {
  id: string; // filename without extension
  filename: string; // with extension
  url: string; // relative URL from /public root
  mtimeMs: number;
  size: number;
};

function getDirs() {
  const cwd = process.cwd();
  const publicRoot = join(cwd, "public");
  const photoDirEnv = process.env.PHOTO_DIR || "public/photos";
  const absDir = join(cwd, photoDirEnv);
  return { cwd, publicRoot, absDir };
}

export function listPhotos(): PhotoEntry[] {
  const { absDir, publicRoot } = getDirs();
  let entries: PhotoEntry[] = [];
  try {
    const files = readdirSync(absDir);
    for (const file of files) {
      const p = join(absDir, file);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (!st.isFile()) continue;
      const ext = extname(file).toLowerCase();
      if (!ALLOWED_EXTS.has(ext)) continue;
      const relToPublic = relative(publicRoot, p);
      if (relToPublic.startsWith("..")) continue; // only serve if under public/
      const url = "/" + relToPublic.split(sep).join("/");
      const id = basename(file, ext);
      entries.push({ id, filename: file, url, mtimeMs: st.mtimeMs, size: st.size });
    }
  } catch {
    // ignore
  }
  return entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export function getPhotoById(id: string): PhotoEntry | null {
  if (!/^[A-Za-z0-9._-]+$/.test(id)) return null;
  const { absDir, publicRoot } = getDirs();
  const exts = [".jpg", ".jpeg", ".png", ".webp"];
  for (const ext of exts) {
    const file = id + ext;
    const p = join(absDir, file);
    try {
      const st = statSync(p);
      if (!st.isFile()) continue;
      const relToPublic = relative(publicRoot, p);
      if (relToPublic.startsWith("..")) return null;
      const url = "/" + relToPublic.split(sep).join("/");
      return { id, filename: file, url, mtimeMs: st.mtimeMs, size: st.size };
    } catch {
      // try next ext
    }
  }
  return null;
}

