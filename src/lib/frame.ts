import { constants as fsConstants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import { ensureDir } from "@/lib/camera";

export type FrameMode = "single" | "burst";

export type FrameZone = {
  id: string;
  left: number; // normalized 0-1
  top: number; // normalized 0-1
  width: number; // normalized 0-1
  height: number; // normalized 0-1
};

export type FrameConfig = {
  mode: FrameMode;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  zones: FrameZone[];
  updatedAt: string | null;
};

const FRAME_PUBLIC_DIR = join(process.cwd(), "public", "frames");
const FRAME_META_DIR = join(process.cwd(), "frame-data");

type StoredFrameConfig = {
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  zones: FrameZone[];
  updatedAt: string | null;
};

const DEFAULT_STORED_CONFIG: StoredFrameConfig = {
  imageUrl: null,
  width: null,
  height: null,
  zones: [],
  updatedAt: null,
};

function getMetaPath(mode: FrameMode) {
  return join(FRAME_META_DIR, `${mode}.json`);
}

function getImagePath(mode: FrameMode) {
  return join(FRAME_PUBLIC_DIR, `${mode}.png`);
}

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function sanitizeZone(zone: FrameZone): FrameZone {
  const left = clamp01(zone.left);
  const top = clamp01(zone.top);
  const width = clamp01(zone.width);
  const height = clamp01(zone.height);
  const adjustedWidth = clamp01(width > 0 ? Math.min(width, 1 - left) : 0);
  const adjustedHeight = clamp01(height > 0 ? Math.min(height, 1 - top) : 0);
  return {
    id: zone.id,
    left,
    top,
    width: adjustedWidth,
    height: adjustedHeight,
  };
}

function sanitizeZones(zones: FrameZone[] | null | undefined): FrameZone[] {
  if (!zones || !Array.isArray(zones)) return [];
  return zones
    .map((zone) => sanitizeZone(zone))
    .filter((zone) => zone.width > 0 && zone.height > 0);
}

async function fileExists(path: string) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readStoredConfig(mode: FrameMode): Promise<StoredFrameConfig> {
  try {
    const raw = await readFile(getMetaPath(mode), "utf-8");
    const parsed = JSON.parse(raw) as StoredFrameConfig;
    return {
      ...DEFAULT_STORED_CONFIG,
      ...parsed,
      zones: sanitizeZones(parsed.zones),
    };
  } catch (err: unknown) {
    if (isErrorWithCode(err) && err.code === "ENOENT") {
      return { ...DEFAULT_STORED_CONFIG };
    }
    throw err;
  }
}

function isErrorWithCode(err: unknown): err is { code?: string } {
  return typeof err === "object" && err !== null && "code" in err;
}

async function persistConfig(mode: FrameMode, config: StoredFrameConfig) {
  await ensureDir(FRAME_META_DIR);
  await writeFile(getMetaPath(mode), JSON.stringify(config, null, 2), "utf-8");
}

export async function getFrameConfig(mode: FrameMode): Promise<FrameConfig> {
  const stored = await readStoredConfig(mode);
  return {
    mode,
    imageUrl: stored.imageUrl,
    width: stored.width,
    height: stored.height,
    zones: stored.zones,
    updatedAt: stored.updatedAt,
  };
}

type SaveFrameOptions = {
  mode: FrameMode;
  zones?: FrameZone[];
  imageBuffer?: Buffer;
};

export async function saveFrameConfig(
  options: SaveFrameOptions,
): Promise<FrameConfig> {
  const { mode, zones, imageBuffer } = options;
  const current = await readStoredConfig(mode);
  let updated = { ...current };

  if (zones) {
    updated = {
      ...updated,
      zones: sanitizeZones(zones),
    };
  }

  if (imageBuffer) {
    await ensureDir(FRAME_PUBLIC_DIR);
    const pngBuffer = await sharp(imageBuffer).png().toBuffer();
    await writeFile(getImagePath(mode), pngBuffer);
    const metadata = await sharp(pngBuffer).metadata();
    updated = {
      ...updated,
      imageUrl: `/frames/${mode}.png`,
      width: metadata.width ?? updated.width ?? null,
      height: metadata.height ?? updated.height ?? null,
    };
  }

  const timestamp = new Date().toISOString();
  updated.updatedAt = timestamp;

  await persistConfig(mode, updated);

  return {
    mode,
    imageUrl: updated.imageUrl,
    width: updated.width,
    height: updated.height,
    zones: updated.zones,
    updatedAt: updated.updatedAt,
  };
}

type CompositeOptions = {
  background?: {
    r: number;
    g: number;
    b: number;
  };
};

export async function composeFrame(
  mode: FrameMode,
  sourcePaths: string[],
  outputPath: string,
  options: CompositeOptions = {},
): Promise<boolean> {
  if (!sourcePaths.length) return false;

  try {
    const config = await getFrameConfig(mode);
    if (!config.imageUrl) return false;
    const absoluteFramePath = join(
      process.cwd(),
      "public",
      config.imageUrl.replace(/^\/+/, ""),
    );
    if (!(await fileExists(absoluteFramePath))) return false;

    const metadata = await sharp(absoluteFramePath).metadata();
    const frameWidth = metadata.width;
    const frameHeight = metadata.height;
    if (!frameWidth || !frameHeight) return false;

    const zones = config.zones.slice(0, sourcePaths.length);
    if (zones.length !== sourcePaths.length) return false;

    const composites = await Promise.all(
      zones.map(async (zone, idx) => {
        const zoneWidth = Math.round(zone.width * frameWidth);
        const zoneHeight = Math.round(zone.height * frameHeight);
        if (zoneWidth <= 0 || zoneHeight <= 0) {
          return null;
        }
        const left = Math.round(zone.left * frameWidth);
        const top = Math.round(zone.top * frameHeight);

        const buffer = await sharp(sourcePaths[idx])
          .resize(zoneWidth, zoneHeight, { fit: "cover", position: "center" })
          .toBuffer();
        return {
          input: buffer,
          left,
          top,
        } as const;
      }),
    );

    const validComposites = composites.filter(
      (item): item is { input: Buffer; left: number; top: number } =>
        Boolean(item),
    );
    if (!validComposites.length) return false;

    const frameBuffer = await sharp(absoluteFramePath).png().toBuffer();

    const base = sharp({
      create: {
        width: frameWidth,
        height: frameHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    const background = options.background ?? { r: 255, g: 255, b: 255 };

    await base
      .composite([...validComposites, { input: frameBuffer, left: 0, top: 0 }])
      .flatten({ background })
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    return true;
  } catch (err) {
    console.error(`[frame] failed to compose frame for ${mode}:`, err);
    return false;
  }
}
