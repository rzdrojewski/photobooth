"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BURST_FRAME_COUNT = 4;

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

  const runCountdown = useCallback(async () => {
    if (countdownSeconds <= 0) {
      setCount(0);
      setIsCountingDown(false);
      return;
    }
    setIsCountingDown(true);
    setCount(countdownSeconds);
    await new Promise<void>((resolve) => {
      let remaining = countdownSeconds;
      setCount(remaining);
      const timer = setInterval(() => {
        remaining -= 1;
        setCount(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
          setIsCountingDown(false);
          resolve();
        }
      }, 1000);
    });
  }, [countdownSeconds]);

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
          await runCountdown();
        }
        await executor();
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
        const capturedIndices: number[] = [];
        for (let shot = 0; shot < BURST_FRAME_COUNT; shot += 1) {
          await runCountdown();
          const res = await fetch("/api/capture/burst", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "capture" }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || `Capture failed (${res.status})`);
          }
          const data = (await res.json()) as { index?: number };
          if (typeof data?.index !== "number") {
            throw new Error("Capture response missing index");
          }
          capturedIndices.push(data.index);
        }

        const assembleRes = await fetch("/api/capture/burst", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "assemble", indices: capturedIndices }),
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
        <h1 className="text-2xl font-semibold">Zdro Photobooth</h1>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={onCapture}
            disabled={isCapturing || isCountingDown}
            className="px-6 py-3 rounded-md bg-foreground text-background disabled:opacity-60"
          >
            {isCountingDown
              ? `Get ready… ${count}`
              : isCapturing && activeCapture === "single"
              ? "Capturing…"
              : "Take Photo"}
          </button>
          <button
            onClick={onBurstCapture}
            disabled={isCapturing || isCountingDown}
            className="px-6 py-3 rounded-md border border-black/10 dark:border-white/20 disabled:opacity-60"
          >
            {isCountingDown
              ? `Get ready… ${count}`
              : isCapturing && activeCapture === "burst"
              ? "Capturing strip…"
              : "Take Photo Strip"}
          </button>
          {isDebug && (
            <button
              onClick={onDetect}
              disabled={isDetecting || isCapturing || isCountingDown}
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
      </main>
      {isCountingDown && (
        <div className="fixed inset-0 grid place-items-center pointer-events-none">
          <div className="text-[20vmin] font-bold opacity-70 select-none">
            {count}
          </div>
        </div>
      )}
    </div>
  );
}

function getCaptureErrorMessage(error: unknown): string {
  void error;
  return "Capture failed. Please check the camera and try again.";
}
