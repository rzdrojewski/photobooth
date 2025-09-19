import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import type { FrameMode, FrameZone } from "@/lib/frame";
import { getFrameConfig, saveFrameConfig } from "@/lib/frame";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function assertFrameMode(mode: string | string[] | undefined): FrameMode {
  const value = Array.isArray(mode) ? mode[0] : mode;
  if (value === "single" || value === "burst") {
    return value;
  }
  throw new Error("Invalid frame mode");
}

export async function GET(
  _: Request,
  context: { params: Promise<{ mode?: string }> },
) {
  try {
    const mode = assertFrameMode((await context.params)?.mode);
    const config = await getFrameConfig(mode);
    return NextResponse.json(config);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load frame config";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function parseZones(raw: FormDataEntryValue | null): FrameZone[] | undefined {
  if (!raw) return undefined;
  if (typeof raw !== "string") {
    return undefined;
  }
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw) as FrameZone[];
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid zones payload");
  }
  return parsed.map((zone) => ({
    id: String(zone.id ?? randomUUID()),
    left: Number(zone.left ?? 0),
    top: Number(zone.top ?? 0),
    width: Number(zone.width ?? 0),
    height: Number(zone.height ?? 0),
  }));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ mode?: string }> },
) {
  try {
    const mode = assertFrameMode((await context.params)?.mode);
    const formData = await request.formData();
    let zones: FrameZone[] | undefined;
    try {
      zones = parseZones(formData.get("zones"));
    } catch (zoneErr) {
      const message =
        zoneErr instanceof Error ? zoneErr.message : "Invalid zones payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const file = formData.get("frame");
    let buffer: Buffer | undefined;
    if (file instanceof File) {
      if (file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    }

    if (!buffer && !zones) {
      return NextResponse.json(
        { error: "No changes provided" },
        { status: 400 },
      );
    }

    const saved = await saveFrameConfig({ mode, zones, imageBuffer: buffer });
    return NextResponse.json(saved, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to save frame config";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
