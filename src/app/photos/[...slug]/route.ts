import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { slug?: string[] } },
) {
  const slugParts = params.slug ?? [];
  if (slugParts.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Prevent path traversal by resolving within the configured photo directory.
  const photoDirEnv = process.env.PHOTO_DIR || "public/photos";
  const photoRoot = path.resolve(photoDirEnv);
  const targetPath = path.resolve(photoRoot, ...slugParts);

  if (
    targetPath === photoRoot ||
    !targetPath.startsWith(`${photoRoot}${path.sep}`)
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const stat = await fs.stat(targetPath);
    if (!stat.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const fileBuffer = await fs.readFile(targetPath);
  const filename = slugParts.at(-1);
  if (!filename) {
    return new NextResponse("Not found", { status: 404 });
  }
  const fileExt = path.extname(filename).toLowerCase();
  const contentType = MIME_TYPES[fileExt] ?? "application/octet-stream";
  const encodedFilename = encodeURIComponent(filename);
  const contentDisposition = `attachment; filename="${filename.replace(/"/g, "'")}"; filename*=UTF-8''${encodedFilename}`;

  const arrayBuffer = new ArrayBuffer(fileBuffer.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(fileBuffer);

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
      "Content-Length": String(fileBuffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
