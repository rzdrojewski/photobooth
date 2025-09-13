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
- Click “Take Photo”. The image is saved to `public/photos/<id>.jpg` and served at `/photos/<id>.jpg` with a QR code for easy download.

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

## Troubleshooting
- Camera not detected: `gphoto2 --auto-detect`. On macOS, close Photos and `killall PTPCamera`. On Linux, unmount auto-mounted camera (GVFS) and check udev permissions.
- Timeouts or empty capture: increase save delay in `src/lib/camera.ts` (`settleMs`, default 500ms), check cable/mode, or power cycle the camera.

## Notes & Safety
- Files are publicly accessible under `/photos/`. There is no authentication—do not expose this app publicly without access controls.
- The QR uses a public service; we can switch to a local generator if required.
