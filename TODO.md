# Photobooth TODO

High-level goal: One-click capture via gphoto2, show preview, and display a QR code to download the saved photo.

## Milestone 1 — Functional Prototype
- [ ] Create `public/photos/` directory (git-keep as needed).
- [ ] Add API route `src/app/api/capture/route.ts` (POST) that:
  - [ ] Invokes `gphoto2` to capture and download a photo.
  - [ ] Saves to `public/photos/<id>.jpg` (UUID timestamp).
  - [ ] Returns JSON: `{ id, url }`.
- [ ] Update `src/app/page.tsx` UI:
  - [ ] Add "Take Photo" button (disable while capturing).
  - [ ] Show captured image preview.
  - [ ] Render QR code pointing to photo URL.
- [ ] Add lightweight camera wrapper `src/lib/camera.ts` using `child_process.execFile`.

## Milestone 2 — UX & Reliability
- [ ] Add server-side mutex/queue to prevent concurrent gphoto2 runs.
- [ ] Handle timeouts, non-zero exits, and missing camera errors with friendly messages.
- [ ] Debounce/disable button to avoid double-clicks.
- [ ] Simple loading state and error toasts.

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
- gphoto2 command example:
  - `gphoto2 --capture-image-and-download --filename <file> --force-overwrite`
- Route handler lives at: `src/app/api/capture/route.ts` (export `POST`).
- Generate QR: add `qrcode` package and render `<img src={qrDataUrl} />`.

## Validation Checklist
- [ ] Single click captures within ~2–5s.
- [ ] Photo accessible at `BASE_URL/photos/<id>.jpg`.
- [ ] QR scans and downloads on mobile.
- [ ] Errors are shown clearly and recover gracefully.
