## Zdro Photobooth

A minimal web photobooth. Click a button to trigger a connected camera via `gphoto2`, download the photo to the server, preview it on the page, and display a QR code to fetch the file on your phone.

## Requirements
- Node.js 18+ and npm
- `gphoto2` installed and a supported camera connected over USB
  - macOS: `brew install gphoto2`
  - Debian/Ubuntu: `sudo apt-get install gphoto2`

## Quick Start
```bash
npm install
npm run dev
# open http://localhost:3000
```
- Connect a camera (often needs “PC/remote” mode).
- Click “Detect Camera” to view ports and a device summary.
- Click “Take Photo”. A brief countdown appears, then the image is captured, saved to `public/photos/<id>.jpg`, and served at `/photos/<id>.jpg` with a QR code for easy download.

## How It Works
- UI: `src/app/page.tsx` renders the button, preview, and a locally generated QR (using the `qrcode` package to create a data URL).
- API: `POST /api/capture` (`src/app/api/capture/route.ts`) triggers capture using `gphoto2`:
  1) `--trigger-capture` 2) wait ~0.5s 3) `--list-files` to find the last file 4) `--get-file <index>` to `public/photos`.
- Wrapper: `src/lib/camera.ts` runs `gphoto2` and ensures directories exist. Configure binary with `GPHOTO2_BIN` if needed.

## Production
```bash
npm run build
npm start
```

## Environment Variables
- `PHOTO_DIR` (default `public/photos`) — Directory to save photos. For public access, keep it inside `public/`.
- `BASE_URL` (optional) — If set, API also returns an absolute URL in `absoluteUrl`.
- `GPHOTO2_BIN` (optional) — Path to `gphoto2` binary.
- `GPHOTO2_PORT` (optional) — e.g., `usb:001,005`. Overrides auto-detect.
- `PHOTO_TTL_HOURS` (default `12`) — Used by cleanup script; age threshold for deletion.
- `NEXT_PUBLIC_COUNTDOWN_SECONDS` (default `3`) — Countdown seconds in the UI.
- `NEXT_PUBLIC_DEBUG_PHOTOBOOTH` (off) — Show detect button and camera info.
- `DEBUG_GPHOTO2` (off) — Verbose server logs for gphoto2 calls.

## Troubleshooting
- Camera not detected: `gphoto2 --auto-detect`. On macOS, close Photos and `killall PTPCamera`. On Linux, unmount auto-mounted camera (GVFS) and check udev permissions.
- Timeouts or empty capture: increase save delay in `src/lib/camera.ts` (`settleMs`, default 500ms), check cable/mode, or power cycle the camera.
- Device not found from the app but works in terminal:
  - Set the port explicitly using the value from `gphoto2 --auto-detect`:
    - `export GPHOTO2_PORT=usb:001,005 && npm run dev`
  - Or hardcode a port in code via `capturePhoto(..., { port: 'usb:001,005' })`.
  - Ensure the environment running Next.js has USB access (same user/session as your terminal).

## Debug Mode
- Enable verbose server logging for gphoto2 calls:
  - `DEBUG_GPHOTO2=1 npm run dev`
- Show the “Detect Camera” button and camera info panel in the UI:
  - `NEXT_PUBLIC_DEBUG_PHOTOBOOTH=1 npm run dev`
- You can set both to get UI tools and server logs at once:
  - `DEBUG_GPHOTO2=1 NEXT_PUBLIC_DEBUG_PHOTOBOOTH=1 npm run dev`
- Configure countdown seconds (default 3):
  - `NEXT_PUBLIC_COUNTDOWN_SECONDS=5 npm run dev`

## Cleanup Old Photos
- Remove files older than `PHOTO_TTL_HOURS` from `PHOTO_DIR`:
```bash
npm run cleanup:photos
# e.g., PHOTO_TTL_HOURS=24 npm run cleanup:photos
```
- Set up a cron/systemd timer in production to run periodically.

## Security Notes
- The capture endpoint is unauthenticated by design; keep this app on a trusted network or behind your own reverse proxy with auth if needed.

## Notes & Safety
- Files are publicly accessible under `/photos/`. There is no authentication—do not expose this app publicly without access controls.
- The QR uses a public service; we can switch to a local generator if required.
