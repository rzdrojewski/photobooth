"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { CurvedTitle } from "@/components/CurvedTitle";
import { ImageLine } from "@/components/icons/ImageLine";
import { MultiImageLine } from "@/components/icons/MultiImageLine";
import { useEventTitle } from "@/hooks/useEventTitle";
import { useRouter } from "@/i18n/routing";

export const BURST_FRAME_COUNT = 3;
const PREVIEW_DEVICE_STORAGE_KEY = "photobooth.previewDeviceId";

function HomeContent() {
  const t = useTranslations("home");
  const commonT = useTranslations("common");
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeCapture, setActiveCapture] = useState<"single" | "burst" | null>(
    null,
  );
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countdownSeconds = Number(
    process.env.NEXT_PUBLIC_COUNTDOWN_SECONDS ?? 3,
  );
  const [count, setCount] = useState<number>(countdownSeconds);

  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAutoCapture = useRef(false);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const preferredDeviceIdRef = useRef<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [, setPreferredDeviceId] = useState<string | null>(null);
  const { title } = useEventTitle(commonT("eventTitleDefault"));

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
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    )
      return;
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
          console.warn(
            "Stored preview device unavailable, falling back",
            storedErr,
          );
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
        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput",
        );
        const currentTrack = initialStream.getVideoTracks()[0];
        const currentDeviceId = currentTrack?.getSettings().deviceId;
        const frontCandidates = videoInputs.filter((device) =>
          /front|user/i.test(device.label || ""),
        );
        const preferredDevice = frontCandidates.find(
          (device) =>
            device.deviceId !== currentDeviceId &&
            !/ultra\s*wide/i.test(device.label || ""),
        );
        if (preferredDevice) {
          const replacement = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              deviceId: { exact: preferredDevice.deviceId },
            },
          });
          initialStream.getTracks().forEach((track) => {
            track.stop();
          });
          finalStream = replacement;
          preferredDeviceIdRef.current = preferredDevice.deviceId;
          setPreferredDeviceId(preferredDevice.deviceId);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              PREVIEW_DEVICE_STORAGE_KEY,
              preferredDevice.deviceId,
            );
          }
        }
      } catch (enumerateError) {
        console.warn(
          "Preview device selection failed, falling back to default",
          enumerateError,
        );
      }

      previewStreamRef.current = finalStream;
      const finalDeviceId =
        finalStream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
      if (finalDeviceId) {
        preferredDeviceIdRef.current = finalDeviceId;
        setPreferredDeviceId(finalDeviceId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            PREVIEW_DEVICE_STORAGE_KEY,
            finalDeviceId,
          );
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

  const runCountdown = useCallback(
    async (trigger?: () => void | Promise<void>) => {
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
    },
    [countdownSeconds, ensurePreviewStream],
  );

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
        setError(t("errors.captureFailed"));
      } finally {
        setIsCapturing(false);
        setActiveCapture(null);
      }
    },
    [runCountdown, t],
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
      router.push({ pathname: "/capture/[id]", params: { id: data.id } });
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
          throw new Error(
            body?.error || `Capture failed (${assembleRes.status})`,
          );
        }
        const assembleData = (await assembleRes.json()) as { id?: string };
        if (!assembleData?.id) {
          throw new Error("Capture response missing id");
        }
        router.push({
          pathname: "/capture/burst/[id]",
          params: { id: assembleData.id },
        });
      },
      { skipInitialCountdown: true },
    );
  }, [router, runCaptureFlow, runCountdown]);

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
    router.replace({ pathname: "/" }, { scroll: false });
  }, [onBurstCapture, onCapture, router, searchParams]);

  return (
    <div
      className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url(/wallpaper/wallpaper.png)" }}
    >
      <div className="absolute inset-0 bg-black/45" />
      {!isCountingDown && (
        <div className="relative z-10 flex min-h-screen flex-col items-center p-8">
          <div className="flex w-full max-w-3xl flex-1 flex-col items-center gap-10">
            <header className="w-full pt-8 text-center text-white drop-shadow-lg">
              <CurvedTitle
                text={title}
                className="mx-auto max-w-2xl text-[16rem]"
                radius={800}
              />
            </header>
            <main className="mb-16 flex w-full flex-1 flex-col items-center justify-end gap-6 text-white">
              <div className="flex w-full flex-col items-stretch gap-4 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={onCapture}
                  disabled={isCapturing}
                  className="flex flex-col items-center flex-1 rounded-2xl bg-foreground px-10 py-6 text-xl font-semibold text-background transition disabled:opacity-60 sm:text-2xl"
                >
                  <ImageLine width={120} />
                  {isCapturing && activeCapture === "single"
                    ? t("actions.capturingSingle")
                    : t("actions.takeSingle")}
                </button>
                <button
                  type="button"
                  onClick={onBurstCapture}
                  disabled={isCapturing}
                  className="flex flex-col items-center flex-1 rounded-2xl border border-white/60 bg-white/10 px-10 py-6 text-xl font-semibold text-white transition disabled:opacity-60 sm:text-2xl"
                >
                  <MultiImageLine width={120} />
                  {isCapturing && activeCapture === "burst"
                    ? t("actions.capturingBurst")
                    : t("actions.takeBurst")}
                </button>
              </div>
              {error && (
                <p className="max-w-prose text-center text-2xl text-red-200">
                  {error}
                </p>
              )}
            </main>
          </div>
        </div>
      )}
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
            <div className="absolute select-none text-[20vmin] font-bold text-white opacity-70">
              {count}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
