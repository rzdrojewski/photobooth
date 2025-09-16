import { join, relative, sep } from "node:path";
import { NextResponse } from "next/server";

import { downloadFramesRange, ensureDir, triggerCaptureAndGetIndex } from "@/lib/camera";
import { enqueueCapture } from "@/lib/capture-queue";
import { makeId } from "@/lib/id";
import { createMosaic } from "@/lib/mosaic";

const FRAME_COUNT = 4;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestPayload = {
  action?: "capture" | "assemble";
  indices?: unknown;
};

export async function POST(request: Request) {
  let payload: RequestPayload = {};
  try {
    payload = (await request.json()) as RequestPayload;
  } catch {
    payload = {};
  }

  const opts = {
    port: process.env.GPHOTO2_PORT,
    gphoto2Bin: process.env.GPHOTO2_BIN,
  } as const;

  if (payload.action === "assemble") {
    return enqueueCapture(async () => {
      const rawIndices = Array.isArray(payload.indices) ? payload.indices : [];
      const parsedIndices = rawIndices
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
      if (!parsedIndices.length) {
        return NextResponse.json({ error: "No frame indices provided" }, { status: 400 });
      }
      if (parsedIndices.length !== FRAME_COUNT) {
        return NextResponse.json({ error: `Expected ${FRAME_COUNT} frames` }, { status: 400 });
      }

      const id = makeId();
      const photoDirEnv = process.env.PHOTO_DIR || "public/photos";
      const photosDir = join(process.cwd(), photoDirEnv);
      const framesDir = join(photosDir, "bursts", id);
      ensureDir(framesDir);

      const framePaths = await downloadFramesRange(parsedIndices, framesDir, opts);
      if (framePaths.length !== parsedIndices.length) {
        throw new Error("Failed to retrieve burst frames");
      }

      const mosaicFilename = `${id}-mosaic.jpg`;
      const mosaicPath = join(photosDir, mosaicFilename);
      console.log(`[capture-burst] building mosaic ${mosaicPath}`);
      await createMosaic(framePaths, mosaicPath);

      const publicRoot = join(process.cwd(), "public");
      let url = `/photos/${mosaicFilename}`;
      const relToPublic = relative(publicRoot, mosaicPath);
      if (!relToPublic.startsWith("..")) {
        url = "/" + relToPublic.split(sep).join("/");
      }
      const base = process.env.BASE_URL;
      const absoluteUrl = base ? new URL(url, base).toString() : undefined;

      return NextResponse.json({ id, url, absoluteUrl }, { status: 200 });
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Capture failed";
      console.error(`[capture-burst] assemble error: ${message}`);
      return NextResponse.json({ error: message }, { status: 500 });
    });
  }

  return enqueueCapture(async () => {
    const index = await triggerCaptureAndGetIndex(opts);
    return NextResponse.json({ index }, { status: 200 });
  }).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "Capture failed";
    console.error(`[capture-burst] capture error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  });
}
