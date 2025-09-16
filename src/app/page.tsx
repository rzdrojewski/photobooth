"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BURST_FRAME_COUNT = 4;
const PREVIEW_DEVICE_STORAGE_KEY = "photobooth.previewDeviceId";

export default function Home() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeCapture, setActiveCapture] = useState<"single" | "burst" | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const countdownSeconds = Number(process.env.NEXT_PUBLIC_COUNTDOWN_SECONDS ?? 3);
  const [count, setCount] = useState<number>(countdownSeconds);

  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAutoCapture = useRef(false);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const preferredDeviceIdRef = useRef<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [preferredDeviceId, setPreferredDeviceId] = useState<string | null>(null);

  const attachPreviewStream = useCallback(() => {
    if (previewVideoRef.current && previewStreamRef.current) {
      const video = previewVideoRef.current;
      if (video.srcObject !== previewStreamRef.current) {
        video.srcObject = previewStreamRef.current;
      }
      video.muted = true;
      video.playsInline = true;
      void video.play().catch((err) => {
        console.warn("Preview play interrupted", err);
      });
    }
  }, []);

  const ensurePreviewStream = useCallback(async () => {
    if (previewStreamRef.current) {
      attachPreviewStream();
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const storedDeviceId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(PREVIEW_DEVICE_STORAGE_KEY)
          : null;
      if (storedDeviceId && storedDeviceId !== preferredDeviceIdRef.current) {
        preferredDeviceIdRef.current = storedDeviceId;
        setPreferredDeviceId(storedDeviceId);
      }

      if (storedDeviceId) {
        try {
          const storedStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { deviceId: { exact: storedDeviceId } },
          });
          previewStreamRef.current = storedStream;
          preferredDeviceIdRef.current = storedDeviceId;
          setPreferredDeviceId(storedDeviceId);
          attachPreviewStream();
          return;
        } catch (storedErr) {
          console.warn("Stored preview device unavailable, falling back", storedErr);
        }
      }

      const initialStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
        },
      });

      let finalStream = initialStream;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((device) => device.kind === "videoinput");
        const currentTrack = initialStream.getVideoTracks()[0];
        const currentDeviceId = currentTrack?.getSettings().deviceId;
        const frontCandidates = videoInputs.filter((device) =>
          /front|user/i.test(device.label || ""),
        );
        const preferredDevice = frontCandidates.find(
          (device) => device.deviceId !== currentDeviceId && !/ultra\s*wide/i.test(device.label || ""),
        );
        if (preferredDevice) {
          const replacement = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              deviceId: { exact: preferredDevice.deviceId },
            },
          });
          initialStream.getTracks().forEach((track) => track.stop());
          finalStream = replacement;
          preferredDeviceIdRef.current = preferredDevice.deviceId;
          setPreferredDeviceId(preferredDevice.deviceId);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(PREVIEW_DEVICE_STORAGE_KEY, preferredDevice.deviceId);
          }
        }
      } catch (enumerateError) {
        console.warn("Preview device selection failed, falling back to default", enumerateError);
      }

      previewStreamRef.current = finalStream;
      const finalDeviceId = finalStream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
      if (finalDeviceId) {
        preferredDeviceIdRef.current = finalDeviceId;
        setPreferredDeviceId(finalDeviceId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(PREVIEW_DEVICE_STORAGE_KEY, finalDeviceId);
        }
      }
      attachPreviewStream();
    } catch (err) {
      console.error("Failed to start preview", err);
    }
  }, [attachPreviewStream]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(PREVIEW_DEVICE_STORAGE_KEY);
    preferredDeviceIdRef.current = stored;
    setPreferredDeviceId(stored);
    const handler = (event: StorageEvent) => {
      if (event.key === PREVIEW_DEVICE_STORAGE_KEY) {
        const value = event.newValue;
        preferredDeviceIdRef.current = value;
        setPreferredDeviceId(value);
      }
    };
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("storage", handler);
    };
  }, []);

  useEffect(() => {
    return () => {
      const stream = previewStreamRef.current;
      if (!stream) return;
      for (const track of stream.getTracks()) {
        track.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (showPreview) {
      attachPreviewStream();
    }
  }, [showPreview, attachPreviewStream]);

  const runCountdown = useCallback(async (
    trigger?: () => void | Promise<void>,
  ) => {
    if (countdownSeconds <= 0) {
      setCount(0);
      setIsCountingDown(false);
      setShowPreview(false);
      if (trigger) {
        await trigger();
      }
      return;
    }
    await ensurePreviewStream();
    setShowPreview(true);
    setIsCountingDown(true);
    setCount(countdownSeconds);
    let triggerPromise: Promise<void> | null = null;
    await new Promise<void>((resolve) => {
      let remaining = countdownSeconds;
      setCount(remaining);
      const timer = setInterval(() => {
        remaining -= 1;
        setCount(remaining);
        if (remaining === 1 && trigger && !triggerPromise) {
          try {
            const possible = trigger();
            triggerPromise = Promise.resolve(possible).then(() => {});
          } catch (err) {
            triggerPromise = Promise.reject(err);
          }
        }
        if (remaining <= 0) {
          clearInterval(timer);
          setIsCountingDown(false);
          setShowPreview(false);
          resolve();
        }
      }, 1000);
    });
    if (trigger && !triggerPromise) {
      try {
        const possible = trigger();
        triggerPromise = Promise.resolve(possible).then(() => {});
      } catch (err) {
        triggerPromise = Promise.reject(err);
      }
    }
    if (triggerPromise) {
      await triggerPromise;
    }
  }, [countdownSeconds, ensurePreviewStream]);

  const runCaptureFlow = useCallback(
    async (
      mode: "single" | "burst",
      executor: () => Promise<void>,
      options: { skipInitialCountdown?: boolean } = {},
    ) => {
      setError(null);
      setIsCapturing(true);
      setActiveCapture(mode);
      try {
        if (!options.skipInitialCountdown) {
          await runCountdown(() => executor());
        } else {
          await executor();
        }
      } catch (e: unknown) {
        console.error("Capture failed", e);
        setError(getCaptureErrorMessage(e));
      } finally {
        setIsCapturing(false);
        setActiveCapture(null);
      }
    },
    [runCountdown],
  );

  const onCapture = useCallback(async () => {
    await runCaptureFlow("single", async () => {
      const res = await fetch("/api/capture", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Capture failed (${res.status})`);
      }
      const data = (await res.json()) as { id?: string };
      if (!data?.id) {
        throw new Error("Capture response missing id");
      }
      router.push(`/capture/${data.id}`);
    });
  }, [router, runCaptureFlow]);

  const onBurstCapture = useCallback(async () => {
    await runCaptureFlow(
      "burst",
      async () => {
        for (let shot = 0; shot < BURST_FRAME_COUNT; shot += 1) {
          await runCountdown(async () => {
            const res = await fetch("/api/capture/burst", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "capture" }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body?.error || `Capture failed (${res.status})`);
            }
            const data = (await res.json()) as { success?: boolean };
            if (!data?.success) {
              throw new Error("Capture response missing success flag");
            }
          });
        }

        const assembleRes = await fetch("/api/capture/burst", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "assemble" }),
        });
        if (!assembleRes.ok) {
          const body = await assembleRes.json().catch(() => ({}));
          throw new Error(body?.error || `Capture failed (${assembleRes.status})`);
        }
        const assembleData = (await assembleRes.json()) as { id?: string };
        if (!assembleData?.id) {
          throw new Error("Capture response missing id");
        }
        router.push(`/capture/burst/${assembleData.id}`);
      },
      { skipInitialCountdown: true },
    );
  }, [router, runCaptureFlow, runCountdown]);

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

  useEffect(() => {
    if (hasAutoCapture.current) return;
    const mode = searchParams?.get("autoCapture");
    if (!mode) return;
    hasAutoCapture.current = true;
    if (mode === "burst") {
      void onBurstCapture();
    } else {
      void onCapture();
    }
    router.replace("/", { scroll: false });
  }, [onBurstCapture, onCapture, router, searchParams]);

  return (
    <div className="min-h-screen grid place-items-center p-8">
      <main className="flex flex-col items-center gap-6 w-full max-w-xl">
        {!isCountingDown && (
          <>
            <h1 className="text-2xl font-semibold">Zdro Photobooth</h1>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <button
                onClick={onCapture}
                disabled={isCapturing}
                className="px-6 py-3 rounded-md bg-foreground text-background disabled:opacity-60"
              >
                {isCapturing && activeCapture === "single" ? "Capturing…" : "Take Photo"}
              </button>
              <button
                onClick={onBurstCapture}
                disabled={isCapturing}
                className="px-6 py-3 rounded-md border border-black/10 dark:border-white/20 disabled:opacity-60"
              >
                {isCapturing && activeCapture === "burst" ? "Capturing strip…" : "Take Photo Strip"}
              </button>
              {isDebug && (
                <button
                  onClick={onDetect}
                  disabled={isDetecting || isCapturing}
                  className="px-6 py-3 rounded-md border border-black/10 dark:border-white/20 disabled:opacity-60"
                >
                  {isDetecting ? "Detecting…" : "Detect Camera"}
                </button>
              )}
              <Link
                href="/config"
                className="px-6 py-3 rounded-md border border-black/10 dark:border-white/20"
              >
                Camera settings
              </Link>
            </div>
          </>
        )}

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
      </main>
      {(showPreview || isCountingDown) && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          {showPreview && (
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover opacity-80"
            />
          )}
          {isCountingDown && (
            <div className="absolute text-[20vmin] font-bold opacity-70 select-none">
              {count}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getCaptureErrorMessage(error: unknown): string {
  void error;
  return "Capture failed. Please check the camera and try again.";
}
