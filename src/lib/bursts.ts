import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

type FileInfo = {
  filename: string;
  url: string;
  mtimeMs: number;
  size: number;
};

export type BurstEntry = {
  id: string;
  mosaic: FileInfo;
  frames: FileInfo[];
};

function resolvePaths() {
  const cwd = process.cwd();
  const publicRoot = join(cwd, "public");
  const photoDirEnv = process.env.PHOTO_DIR || "public/photos";
  const photoDir = join(cwd, photoDirEnv);
  const burstDir = join(photoDir, "bursts");
  return { publicRoot, photoDir, burstDir };
}

function toUrl(publicRoot: string, filePath: string): string | null {
  const rel = relative(publicRoot, filePath);
  if (rel.startsWith("..")) return null;
  return "/" + rel.split(sep).join("/");
}

export function getBurstById(id: string): BurstEntry | null {
  if (!/^[A-Za-z0-9._-]+$/.test(id)) return null;
  const { publicRoot, photoDir, burstDir } = resolvePaths();

  const mosaic = ALLOWED_EXTS
    .map((ext) => ({ ext, path: join(photoDir, `${id}-mosaic${ext}`) }))
    .map(({ ext, path }) => {
      try {
        const stats = statSync(path);
        if (!stats.isFile()) return null;
        const url = toUrl(publicRoot, path);
        if (!url) return null;
        return {
          filename: `${id}-mosaic${ext}`,
          url,
          mtimeMs: stats.mtimeMs,
          size: stats.size,
        } satisfies FileInfo;
      } catch {
        return null;
      }
    })
    .find((entry) => entry !== null);

  if (!mosaic) return null;

  const framesDir = join(burstDir, id);
  let frames: FileInfo[] = [];
  try {
    const files = readdirSync(framesDir);
    frames = files
      .filter((file) => {
        const dot = file.lastIndexOf(".");
        if (dot === -1) return false;
        const ext = file.slice(dot).toLowerCase();
        return ALLOWED_EXTS.includes(ext);
      })
      .map((file) => {
        const path = join(framesDir, file);
        try {
          const stats = statSync(path);
          if (!stats.isFile()) return null;
          const url = toUrl(publicRoot, path);
          if (!url) return null;
          return {
            filename: file,
            url,
            mtimeMs: stats.mtimeMs,
            size: stats.size,
          } satisfies FileInfo;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is FileInfo => entry !== null)
      .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));
  } catch {
    frames = [];
  }

  return {
    id,
    mosaic,
    frames,
  };
}
