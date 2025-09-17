import { join, relative, sep } from "node:path";
import { NextResponse } from "next/server";

import { capturePhoto, ensureDir } from "@/lib/camera";
import { enqueueCapture } from "@/lib/capture-queue";
import { composeFrame } from "@/lib/frame";
import { makeId } from "@/lib/id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  return enqueueCapture(async () => {
    const id = makeId();
    const photoDirEnv = process.env.PHOTO_DIR || "public/photos";
    const photosDir = join(process.cwd(), photoDirEnv);
    ensureDir(photosDir);
    const filename = `${id}.jpg`;
    const absolutePath = join(photosDir, filename);

    const opts = {
      port: process.env.GPHOTO2_PORT,
      gphoto2Bin: process.env.GPHOTO2_BIN,
    } as const;
    console.log(
      `[capture] starting: file=${absolutePath} port=${opts.port ?? "<auto>"}`,
    );
    const t0 = Date.now();
    await capturePhoto(absolutePath, opts);
    const framed = await composeFrame("single", [absolutePath], absolutePath);
    if (framed) {
      console.log(`[capture] applied frame overlay for single capture`);
    }
    const dt = Date.now() - t0;
    console.log(`[capture] success in ${dt}ms -> /photos/${filename}`);

    // Derive a public URL if saved under public/
    const publicRoot = join(process.cwd(), "public");
    let url = `/photos/${filename}`;
    const relToPublic = relative(publicRoot, absolutePath);
    if (!relToPublic.startsWith("..")) {
      url = `/${relToPublic.split(sep).join("/")}`;
    }
    const base = process.env.BASE_URL;
    const absoluteUrl = base ? new URL(url, base).toString() : undefined;
    return NextResponse.json({ id, url, absoluteUrl }, { status: 200 });
  }).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "Capture failed";
    console.error(`[capture] error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  });
}
