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
- [ ] Env vars: `PHOTO_DIR=public/photos`, `BASE_URL`, `GPHOTO2_BIN=gphoto2`.
- [ ] Add cleanup script to purge old photos (e.g., older than N hours).
- [ ] Optional PIN/secret for API access if exposed beyond localhost.
- [ ] Document usage in README (quickstart + troubleshooting).

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
