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

    await capturePhoto(absolutePath);

    const url = `/photos/${filename}`;
    return NextResponse.json({ id, url }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Capture failed";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

