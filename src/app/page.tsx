"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as QRCode from "qrcode";

export default function Home() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [cameraInfo, setCameraInfo] = useState<null | {
    ports: string[];
    selectedPort: string | null;
    autoDetectRaw: string;
    summaryRaw: string | null;
  }>(null);

  const isDebug =
    (process.env.NEXT_PUBLIC_DEBUG_PHOTOBOOTH ?? "") === "1" ||
    (process.env.NEXT_PUBLIC_DEBUG_PHOTOBOOTH ?? "").toLowerCase() === "true";

  const absolutePhotoUrl = useMemo(() => {
    if (!photoUrl) return null;
    if (typeof window === "undefined") return photoUrl;
    try {
      return new URL(photoUrl, window.location.origin).toString();
    } catch {
      return photoUrl;
    }
  }, [photoUrl]);

  useEffect(() => {
    let cancelled = false;
    async function gen() {
      setQrDataUrl(null);
      if (!absolutePhotoUrl) return;
      try {
        const dataUrl = await QRCode.toDataURL(absolutePhotoUrl, {
          width: 240,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (e) {
        if (!cancelled) setError("Failed to generate QR code");
      }
    }
    gen();
    return () => {
      cancelled = true;
    };
  }, [absolutePhotoUrl]);

  const onCapture = useCallback(async () => {
    setIsCapturing(true);
    setError(null);
    setPhotoUrl(null);
    try {
      const res = await fetch("/api/capture", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Capture failed (${res.status})`);
      }
      const data = (await res.json()) as { url: string };
      setPhotoUrl(data.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const onDetect = useCallback(async () => {
    setIsDetecting(true);
    setError(null);
    setCameraInfo(null);
    try {
      const res = await fetch("/api/camera-info");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Detect failed (${res.status})`);
      }
      const data = await res.json();
      setCameraInfo(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setIsDetecting(false);
    }
  }, []);

  return (
    <div className="min-h-screen grid place-items-center p-8">
      <main className="flex flex-col items-center gap-6 w-full max-w-xl">
        <h1 className="text-2xl font-semibold">Zdro Photobooth</h1>
        <div className="flex gap-3">
          <button
            onClick={onCapture}
            disabled={isCapturing}
            className="px-6 py-3 rounded-md bg-foreground text-background disabled:opacity-60"
          >
            {isCapturing ? "Capturing…" : "Take Photo"}
          </button>
          {isDebug && (
            <button
              onClick={onDetect}
              disabled={isDetecting}
              className="px-6 py-3 rounded-md border border-black/10 dark:border-white/20 disabled:opacity-60"
            >
              {isDetecting ? "Detecting…" : "Detect Camera"}
            </button>
          )}
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center max-w-prose">{error}</p>
        )}

        {isDebug && cameraInfo && (
          <div className="w-full max-w-xl">
            <h2 className="text-lg font-medium mb-2">Camera Info</h2>
            <div className="text-sm mb-2">
              <div>Ports: {cameraInfo.ports?.length ? cameraInfo.ports.join(", ") : "(none)"}</div>
              <div>Selected Port: {cameraInfo.selectedPort ?? "(none)"}</div>
            </div>
            <details className="mb-2">
              <summary className="cursor-pointer">Auto-detect Output</summary>
              <pre className="text-xs whitespace-pre-wrap p-2 rounded bg-black/5 dark:bg-white/5 overflow-auto max-h-64">{cameraInfo.autoDetectRaw}</pre>
            </details>
            {cameraInfo.summaryRaw && (
              <details>
                <summary className="cursor-pointer">Summary</summary>
                <pre className="text-xs whitespace-pre-wrap p-2 rounded bg-black/5 dark:bg-white/5 overflow-auto max-h-64">{cameraInfo.summaryRaw}</pre>
              </details>
            )}
          </div>
        )}

        {photoUrl && (
          <div className="flex flex-col items-center gap-4 w-full">
            <img
              src={photoUrl}
              alt="Captured photo"
              className="w-full max-w-md rounded border border-black/10 dark:border-white/15"
            />
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm">Scan to download:</p>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR code to download photo"
                  width={240}
                  height={240}
                />
              ) : null}
              {absolutePhotoUrl && (
                <a
                  className="underline text-sm break-all"
                  href={absolutePhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {absolutePhotoUrl}
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
