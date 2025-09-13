import { NextResponse } from "next/server";
import { join } from "node:path";
import { capturePhoto, ensureDir } from "@/lib/camera";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function makeId() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${ts}-${id}`;
}

export async function POST() {
  try {
    const id = makeId();
    const photosDir = join(process.cwd(), "public", "photos");
    ensureDir(photosDir);
    const filename = `${id}.jpg`;
    const absolutePath = join(photosDir, filename);

    const opts = {
      port: process.env.GPHOTO2_PORT,
      gphoto2Bin: process.env.GPHOTO2_BIN,
    } as const;
    console.log(`[capture] starting: file=${absolutePath} port=${opts.port ?? "<auto>"}`);
    const t0 = Date.now();
    await capturePhoto(absolutePath, opts);
    const dt = Date.now() - t0;
    console.log(`[capture] success in ${dt}ms -> /photos/${filename}`);

    const url = `/photos/${filename}`;
    return NextResponse.json({ id, url }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Capture failed";
    console.error(`[capture] error: ${message}`);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
