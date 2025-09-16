"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "photobooth.previewDeviceId";

type VideoDevice = Pick<MediaDeviceInfo, "deviceId" | "label">;

export default function PreviewSettingsPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnumerating, setIsEnumerating] = useState(false);

  const stopPreview = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startPreview = useCallback(
    async (deviceId: string) => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("Camera APIs are not supported in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { deviceId: { exact: deviceId } },
        });
        stopPreview();
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          await videoRef.current.play().catch(() => {});
        }
        setError(null);
      } catch (err) {
        console.error("Preview start failed", err);
        setError("Impossible de démarrer l’aperçu pour cet objectif.");
      }
    },
    [stopPreview],
  );

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Camera APIs are not supported in this browser.");
      return;
    }
    setIsEnumerating(true);
    setError(null);
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });
      permissionStream.getTracks().forEach((track) => track.stop());

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({ deviceId: device.deviceId, label: device.label }));
      setDevices(videoDevices);

      const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const initial = stored && videoDevices.some((device) => device.deviceId === stored)
        ? stored
        : videoDevices[0]?.deviceId ?? null;
      setSelectedId(initial);
    } catch (err) {
      console.error("Device enumeration failed", err);
      setError("Impossible de récupérer la liste des caméras. Autorisez l’accès à la caméra.");
    } finally {
      setIsEnumerating(false);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    return () => {
      stopPreview();
    };
  }, [refreshDevices, stopPreview]);

  useEffect(() => {
    if (!selectedId) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      stopPreview();
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, selectedId);
    }
    void startPreview(selectedId);
  }, [selectedId, startPreview, stopPreview]);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="sm:w-64 space-y-3">
          <button
            type="button"
            onClick={refreshDevices}
            className="w-full rounded-md border border-black/10 px-4 py-2 text-sm dark:border-white/20"
            disabled={isEnumerating}
          >
            {isEnumerating ? "Refreshing…" : "Refresh list"}
          </button>
          <div className="space-y-2">
            {devices.length === 0 && <p className="text-sm">No cameras detected yet.</p>}
            {devices.map((device) => (
              <label key={device.deviceId} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="preview-camera"
                  value={device.deviceId}
                  checked={device.deviceId === selectedId}
                  onChange={() => setSelectedId(device.deviceId)}
                />
                <span>{device.label || `Camera ${device.deviceId.slice(-4)}`}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-lg border border-black/10 bg-black/80 aspect-video overflow-hidden dark:border-white/20">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </>
  );
}
