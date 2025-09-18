import { dirname } from "node:path";

import sharp from "sharp";

import { ensureDir } from "@/lib/camera";

const MOSAIC_COLUMNS = 2;
const MOSAIC_ROWS = 2;
const MOSAIC_BACKGROUND = { r: 0, g: 0, b: 0 };

export async function createMosaic(framePaths: string[], outputPath: string) {
  if (framePaths.length !== MOSAIC_COLUMNS * MOSAIC_ROWS) {
    throw new Error(
      `Expected ${MOSAIC_COLUMNS * MOSAIC_ROWS} frames, received ${framePaths.length}`,
    );
  }

  ensureDir(dirname(outputPath));

  const metadatas = await Promise.all(
    framePaths.map(async (path) => {
      const metadata = await sharp(path).metadata();
      return {
        path,
        width: metadata.width ?? 1200,
        height: metadata.height ?? 800,
      };
    }),
  );

  const cellWidth = Math.max(...metadatas.map((m) => m.width));
  const cellHeight = Math.max(...metadatas.map((m) => m.height));

  const composites = await Promise.all(
    metadatas.map(async (meta, idx) => {
      const buffer = await sharp(meta.path)
        .resize(cellWidth, cellHeight, {
          fit: "contain",
          background: MOSAIC_BACKGROUND,
        })
        .toBuffer();
      const col = idx % MOSAIC_COLUMNS;
      const row = Math.floor(idx / MOSAIC_COLUMNS);
      return {
        input: buffer,
        left: col * cellWidth,
        top: row * cellHeight,
      } as const;
    }),
  );

  await sharp({
    create: {
      width: cellWidth * MOSAIC_COLUMNS,
      height: cellHeight * MOSAIC_ROWS,
      channels: 3,
      background: MOSAIC_BACKGROUND,
    },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}
