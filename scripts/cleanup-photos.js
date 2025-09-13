#!/usr/bin/env node
/*
  Deletes photos older than PHOTO_TTL_HOURS from PHOTO_DIR.
  Defaults: PHOTO_DIR=public/photos, PHOTO_TTL_HOURS=12
*/
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const dirEnv = process.env.PHOTO_DIR || "public/photos";
const ttlHours = Number(process.env.PHOTO_TTL_HOURS || 12);
const now = Date.now();

const dir = path.join(cwd, dirEnv);
if (!fs.existsSync(dir)) {
  console.log(`[cleanup] Directory does not exist: ${dir}`);
  process.exit(0);
}

const exts = new Set([".jpg", ".jpeg", ".png", ".webp"]);
let deleted = 0;
let kept = 0;

for (const entry of fs.readdirSync(dir)) {
  const file = path.join(dir, entry);
  try {
    const st = fs.statSync(file);
    if (!st.isFile()) continue;
    const ext = path.extname(entry).toLowerCase();
    if (entry === ".gitkeep" || !exts.has(ext)) {
      kept++;
      continue;
    }
    const ageHours = (now - st.mtimeMs) / (1000 * 60 * 60);
    if (ageHours > ttlHours) {
      fs.unlinkSync(file);
      deleted++;
      console.log(`[cleanup] Deleted ${entry} (${ageHours.toFixed(1)}h old)`);
    } else {
      kept++;
    }
  } catch (e) {
    console.warn(`[cleanup] Skip ${entry}: ${(e && e.message) || e}`);
  }
}

console.log(`[cleanup] Done. Deleted=${deleted} Kept=${kept} Dir=${dir} TTL=${ttlHours}h`);

