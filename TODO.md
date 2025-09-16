# Photobooth TODO

High-level goal: One-click capture via gphoto2, show preview, and display a QR code to download the saved photo.

## Milestone 1 — Functional Prototype

- [x] Create `public/photos/` directory (git-keep as needed).
- [x] Add API route `src/app/api/capture/route.ts` (POST) that:
  - [x] Invokes `gphoto2` (trigger strategy: `--trigger-capture`, wait 0.5s, `--list-files`, `--get-file`).
  - [x] Saves to `public/photos/<id>.jpg` (UUID timestamp).
  - [x] Returns JSON: `{ id, url }`.
- [x] Update `src/app/page.tsx` UI:
  - [x] Add "Take Photo" button (disable while capturing).
  - [x] Show captured image preview.
  - [x] Render QR code pointing to photo URL.
- [x] Add lightweight camera wrapper `src/lib/camera.ts` using `child_process.execFile`.

## Milestone 2 — UX & Reliability

- [x] Add server-side mutex/queue to prevent concurrent gphoto2 runs.
- [x] Handle timeouts, non-zero exits, and missing camera errors with friendly messages.
- [x] Debounce/disable button to avoid double-clicks.
- [x] Simple loading state and error messaging.
- [x] Add configurable countdown before capture (`NEXT_PUBLIC_COUNTDOWN_SECONDS`, default 3).

## Milestone 3 — Ops & Housekeeping

- [x] Env vars: `PHOTO_DIR`, `BASE_URL`, `GPHOTO2_BIN`, `GPHOTO2_PORT`.
- [x] Cleanup script to purge old photos: `npm run cleanup:photos` with `PHOTO_TTL_HOURS`.
- [x] No PIN/auth in app. Keep on trusted network; add external auth if needed.
- [x] Documentation updated (README: envs, cleanup, debug/countdown).
- [x] Split configuration into dedicated sections with a shared navigation layout.

## Setup Notes

- Install gphoto2:
  - macOS: `brew install gphoto2`
  - Debian/Ubuntu: `sudo apt-get install gphoto2`
- Permissions:
  - Linux udev: ensure your user can access the camera USB device.
  - macOS: grant Terminal/Node “Full Disk Access” if needed for downloads.

## Implementation Pointers

- gphoto2 quick sequence (faster):
  - `gphoto2 --trigger-capture`
  - wait ~0.5s for save to complete
  - `gphoto2 --list-files` → pick last index
  - `gphoto2 --get-file <index> --filename <file> --force-overwrite`
- Route handler lives at: `src/app/api/capture/route.ts` (export `POST`).
- QR generation: use local `qrcode` package to render a data URL on the client (no external service).

## Validation Checklist

- [ ] Single click captures within ~2–5s.
- [ ] Photo accessible at `BASE_URL/photos/<id>.jpg`.
- [ ] QR scans and downloads on mobile.
- [ ] Errors are shown clearly and recover gracefully.

## Milestone 4 — Gallery & Sharing

- [ ] Server-side photo listing utility:
  - [ ] Read `PHOTO_DIR` and collect files with extensions: jpg/jpeg/png/webp.
  - [ ] Sort by modified time (newest first) and expose `{ id, url, mtime }`.
- [ ] Gallery page (`src/app/gallery/page.tsx`):
  - [ ] Display responsive grid of thumbnails, link each to a detail page.
  - [ ] Lazy-load images; show filename or relative time as caption.
- [ ] Photo detail page (`src/app/gallery/[id]/page.tsx`):
  - [ ] Render larger image, download link, and local QR (reuse `qrcode`).
  - [ ] “Back to gallery” link; keyboard-accessible focus states.
- [ ] Navigation:
  - [ ] Add link to Gallery from the homepage.
- [ ] Safety & correctness:
  - [ ] Validate `id` to prevent path traversal; serve only files from `PHOTO_DIR`.
- [ ] Optional optimizations:
  - [ ] Simple pagination or infinite scroll when many photos.
  - [ ] Thumbnail sizing via CSS now; consider pre-generating thumbnails later (e.g., with `sharp`).

## Milestone 5 — Photo Strips

- [x] Allow burst capture of four photos and merge into a mosaic result.
- [ ] Generate GIF/video animations from burst frames.
- [ ] Provide UI to review individual frames before composing.
