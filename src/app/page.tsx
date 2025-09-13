"use client";

import { useCallback, useMemo, useState } from "react";

export default function Home() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const absolutePhotoUrl = useMemo(() => {
    if (!photoUrl) return null;
    if (typeof window === "undefined") return photoUrl;
    try {
      return new URL(photoUrl, window.location.origin).toString();
    } catch {
      return photoUrl;
    }
  }, [photoUrl]);

  const qrSrc = useMemo(() => {
    if (!absolutePhotoUrl) return null;
    const data = encodeURIComponent(absolutePhotoUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${data}`;
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

  return (
    <div className="min-h-screen grid place-items-center p-8">
      <main className="flex flex-col items-center gap-6 w-full max-w-xl">
        <h1 className="text-2xl font-semibold">Zdro Photobooth</h1>
        <button
          onClick={onCapture}
          disabled={isCapturing}
          className="px-6 py-3 rounded-md bg-foreground text-background disabled:opacity-60"
        >
          {isCapturing ? "Capturing…" : "Take Photo"}
        </button>

        {error && (
          <p className="text-red-600 text-sm text-center max-w-prose">{error}</p>
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
              {qrSrc ? (
                <img
                  src={qrSrc}
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
