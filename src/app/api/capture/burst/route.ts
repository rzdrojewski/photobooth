import { join, relative, sep } from "node:path";
import { NextResponse } from "next/server";

import {
  downloadFramesRange,
  ensureDir,
  getLatestIndices,
  triggerCapture,
} from "@/lib/camera";
import { enqueueCapture } from "@/lib/capture-queue";
import { composeFrame } from "@/lib/frame";
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
      const id = makeId();
      const photoDirEnv = process.env.PHOTO_DIR || "public/photos";
      const photosDir = join(process.cwd(), photoDirEnv);
      const framesDir = join(photosDir, "bursts", id);
      ensureDir(framesDir);

      console.log(`[capture-burst] assembling id=${id}`);
      const latestIndices = await getLatestIndices(FRAME_COUNT, opts);
      if (latestIndices.length !== FRAME_COUNT) {
        console.warn(
          `[capture-burst] insufficient frames latest=${latestIndices.join(",")} expected=${FRAME_COUNT}`,
        );
        return NextResponse.json(
          { error: "Not enough frames captured" },
          { status: 400 },
        );
      }
      console.log(`[capture-burst] latest indices=${latestIndices.join(",")}`);

      const framePaths = await downloadFramesRange(
        latestIndices,
        framesDir,
        opts,
      );
      if (framePaths.length !== latestIndices.length) {
        console.error(
          `[capture-burst] download mismatch expected=${latestIndices.length} actual=${framePaths.length}`,
        );
        throw new Error("Failed to retrieve burst frames");
      }
      console.log(
        `[capture-burst] downloaded ${framePaths.length} frames into ${framesDir}`,
      );

      const mosaicFilename = `${id}-mosaic.jpg`;
      const mosaicPath = join(photosDir, mosaicFilename);
      console.log(`[capture-burst] building mosaic ${mosaicPath}`);
      const framed = await composeFrame("burst", framePaths, mosaicPath);
      if (framed) {
        console.log(`[capture-burst] applied burst frame overlay`);
      } else {
        await createMosaic(framePaths, mosaicPath);
      }

      const publicRoot = join(process.cwd(), "public");
      let url = `/photos/${mosaicFilename}`;
      const relToPublic = relative(publicRoot, mosaicPath);
      if (!relToPublic.startsWith("..")) {
        url = `/${relToPublic.split(sep).join("/")}`;
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
    console.log(`[capture-burst] trigger capture request`);
    await triggerCapture(opts);
    console.log(`[capture-burst] trigger capture succeeded`);
    return NextResponse.json({ success: true }, { status: 200 });
  }).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "Capture failed";
    console.error(`[capture-burst] capture error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  });
}
