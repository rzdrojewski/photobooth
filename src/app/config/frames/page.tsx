"use client";

import Image from "next/image";
import { type ChangeEvent, useCallback, useEffect, useState } from "react";

type FrameMode = "single" | "burst";

type Zone = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type FrameConfigResponse = {
  mode: FrameMode;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  zones: Zone[];
  updatedAt: string | null;
};

type FrameState = {
  loading: boolean;
  saving: boolean;
  loaded: boolean;
  imageUrl: string | null;
  zones: Zone[];
  width: number | null;
  height: number | null;
  dirty: boolean;
  error: string | null;
  status: string | null;
};

const MODE_LABELS: Record<FrameMode, string> = {
  single: "Single capture",
  burst: "Burst capture",
};

const DEFAULT_STATE: FrameState = {
  loading: false,
  saving: false,
  loaded: false,
  imageUrl: null,
  zones: [],
  width: null,
  height: null,
  dirty: false,
  error: null,
  status: null,
};

const DEFAULT_ZONES: Record<FrameMode, Zone[]> = {
  single: [
    {
      id: "zone-single",
      left: 0.1,
      top: 0.1,
      width: 0.8,
      height: 0.8,
    },
  ],
  burst: [
    { id: "zone-burst-1", left: 0.05, top: 0.05, width: 0.425, height: 0.425 },
    { id: "zone-burst-2", left: 0.525, top: 0.05, width: 0.425, height: 0.425 },
    { id: "zone-burst-3", left: 0.05, top: 0.525, width: 0.425, height: 0.425 },
    {
      id: "zone-burst-4",
      left: 0.525,
      top: 0.525,
      width: 0.425,
      height: 0.425,
    },
  ],
};

const MODE_BACKGROUND: Record<FrameMode, string> = {
  single: "white",
  burst: "white",
};

function createInitialState(): Record<FrameMode, FrameState> {
  return {
    single: { ...DEFAULT_STATE },
    burst: { ...DEFAULT_STATE },
  };
}

function normalizeZone(zone: Zone): Zone {
  const clamp = (value: number) => {
    if (Number.isNaN(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  };
  const left = clamp(zone.left);
  const top = clamp(zone.top);
  let width = clamp(zone.width);
  let height = clamp(zone.height);
  if (left + width > 1) {
    width = clamp(1 - left);
  }
  if (top + height > 1) {
    height = clamp(1 - top);
  }
  return { ...zone, left, top, width, height };
}

function toPercent(value: number) {
  return Math.round(value * 1000) / 10;
}

function fromPercent(value: number) {
  return Math.max(0, Math.min(100, value)) / 100;
}

function ensureId(base: string) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${base}-${Date.now()}-${Math.round(Math.random() * 10_000)}`;
}

export default function FrameSettingsPage() {
  const [mode, setMode] = useState<FrameMode>("single");
  const [states, setStates] =
    useState<Record<FrameMode, FrameState>>(createInitialState);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const state = states[mode];
  const fileInputId = `frame-upload-${mode}`;

  useEffect(() => {
    if (state.loading) return;
    if (state.zones.length === 0) {
      setSelectedZoneId(null);
      return;
    }
    setSelectedZoneId((current) => {
      if (!current) return state.zones[0]?.id ?? null;
      const exists = state.zones.some((zone) => zone.id === current);
      return exists ? current : (state.zones[0]?.id ?? null);
    });
  }, [state.loading, state.zones]);

  const fetchConfig = useCallback(async (target: FrameMode) => {
    setStates((prev) => ({
      ...prev,
      [target]: { ...prev[target], loading: true, error: null, status: null },
    }));
    try {
      const res = await fetch(`/api/config/frame/${target}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to load configuration (${res.status})`);
      }
      const data = (await res.json()) as FrameConfigResponse;
      setStates((prev) => ({
        ...prev,
        [target]: {
          ...prev[target],
          loading: false,
          loaded: true,
          imageUrl: data.imageUrl
            ? `${data.imageUrl}${data.updatedAt ? `?v=${encodeURIComponent(data.updatedAt)}` : ""}`
            : null,
          zones: (data.zones ?? []).map((zone) => normalizeZone(zone)),
          width: data.width ?? null,
          height: data.height ?? null,
          dirty: false,
          error: null,
          status: null,
        },
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load configuration";
      setStates((prev) => ({
        ...prev,
        [target]: {
          ...prev[target],
          loading: false,
          loaded: true,
          error: message,
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (!state.loaded && !state.loading) {
      void fetchConfig(mode);
    }
  }, [fetchConfig, mode, state.loaded, state.loading]);

  const handleModeChange = useCallback((next: FrameMode) => {
    setMode(next);
    setSelectedZoneId(null);
  }, []);

  const updateState = useCallback(
    (
      updater: (current: FrameState) => FrameState,
      targetMode: FrameMode = mode,
    ) => {
      setStates((prev) => ({
        ...prev,
        [targetMode]: updater(prev[targetMode]),
      }));
    },
    [mode],
  );

  const handleZoneChange = useCallback(
    (zoneId: string, field: keyof Zone, percentValue: number) => {
      updateState((current) => {
        const zones = current.zones.map((zone) => {
          if (zone.id !== zoneId) return zone;
          const normalizedValue = fromPercent(percentValue);
          const updatedZone = normalizeZone({
            ...zone,
            [field]: normalizedValue,
          });
          return updatedZone;
        });
        return {
          ...current,
          zones,
          dirty: true,
          status: null,
        };
      });
    },
    [updateState],
  );

  const handleAddZone = useCallback(() => {
    const id = ensureId(`zone-${mode}`);
    const newZone = normalizeZone({
      id,
      left: 0.1,
      top: 0.1,
      width: 0.3,
      height: 0.3,
    });
    updateState((current) => ({
      ...current,
      zones: [...current.zones, newZone],
      dirty: true,
      status: null,
    }));
    setSelectedZoneId(id);
  }, [mode, updateState]);

  const handleRemoveZone = useCallback(
    (zoneId: string) => {
      updateState((current) => {
        const zones = current.zones.filter((zone) => zone.id !== zoneId);
        return {
          ...current,
          zones,
          dirty: true,
          status: null,
        };
      });
      setSelectedZoneId((current) => (current === zoneId ? null : current));
    },
    [updateState],
  );

  const handleResetZones = useCallback(() => {
    const zones = DEFAULT_ZONES[mode].map((zone) => ({
      ...zone,
      id: ensureId(zone.id),
    }));
    updateState((current) => ({
      ...current,
      zones,
      dirty: true,
      status: null,
    }));
    setSelectedZoneId(zones[0]?.id ?? null);
  }, [mode, updateState]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      if (!file) return;
      updateState((current) => ({
        ...current,
        saving: true,
        error: null,
        status: null,
      }));
      try {
        const formData = new FormData();
        formData.append("frame", file);
        if (state.zones.length > 0) {
          formData.append("zones", JSON.stringify(state.zones));
        }
        const res = await fetch(`/api/config/frame/${mode}`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || `Upload failed (${res.status})`);
        }
        const data = (await res.json()) as FrameConfigResponse;
        setStates((prev) => ({
          ...prev,
          [mode]: {
            ...prev[mode],
            saving: false,
            loaded: true,
            imageUrl: data.imageUrl
              ? `${data.imageUrl}${data.updatedAt ? `?v=${encodeURIComponent(data.updatedAt)}` : ""}`
              : null,
            zones: (data.zones ?? []).map((zone) => normalizeZone(zone)),
            width: data.width ?? null,
            height: data.height ?? null,
            dirty: false,
            error: null,
            status: "Frame uploaded",
          },
        }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        updateState((current) => ({
          ...current,
          saving: false,
          error: message,
        }));
      } finally {
        input.value = "";
      }
    },
    [mode, state.zones, updateState],
  );

  const handleSaveZones = useCallback(async () => {
    updateState((current) => ({
      ...current,
      saving: true,
      error: null,
      status: null,
    }));
    try {
      const formData = new FormData();
      formData.append("zones", JSON.stringify(state.zones));
      const res = await fetch(`/api/config/frame/${mode}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Save failed (${res.status})`);
      }
      const data = (await res.json()) as FrameConfigResponse;
      setStates((prev) => ({
        ...prev,
        [mode]: {
          ...prev[mode],
          saving: false,
          imageUrl: data.imageUrl
            ? `${data.imageUrl}${data.updatedAt ? `?v=${encodeURIComponent(data.updatedAt)}` : ""}`
            : prev[mode].imageUrl,
          zones: (data.zones ?? []).map((zone) => normalizeZone(zone)),
          width: data.width ?? prev[mode].width,
          height: data.height ?? prev[mode].height,
          dirty: false,
          error: null,
          status: "Zones saved",
        },
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      updateState((current) => ({ ...current, saving: false, error: message }));
    }
  }, [mode, state.zones, updateState]);

  const previewBackground = MODE_BACKGROUND[mode];

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(Object.keys(MODE_LABELS) as FrameMode[]).map((key) => {
          const isActive = key === mode;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleModeChange(key)}
              className={`rounded-md border px-4 py-2 text-sm ${
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-black/10 text-foreground hover:border-foreground/50 dark:border-white/20"
              }`}
            >
              {MODE_LABELS[key]}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-black/10 p-4 dark:border-white/20">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="space-y-3 sm:w-60">
            <div>
              <label
                htmlFor={fileInputId}
                className="block text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Frame image
              </label>
              <input
                type="file"
                accept="image/png"
                id={fileInputId}
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a transparent PNG sized exactly how you want the final
                output.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Zones</h2>
                <button
                  type="button"
                  onClick={handleAddZone}
                  className="text-xs text-foreground underline"
                >
                  Add zone
                </button>
              </div>
              {state.zones.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No zones yet. Add one to get started.
                </p>
              )}
              <div className="space-y-3">
                {state.zones.map((zone, index) => {
                  const isSelected = zone.id === selectedZoneId;
                  return (
                    <div
                      key={zone.id}
                      className={`rounded-md border px-3 py-2 text-xs ${
                        isSelected
                          ? "border-foreground bg-foreground/5"
                          : "border-black/10 dark:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          className="font-medium"
                          onClick={() => setSelectedZoneId(zone.id)}
                        >
                          Zone {index + 1}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveZone(zone.id)}
                          className="text-xs text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1">
                          <span>Left (%)</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={toPercent(zone.left)}
                            onChange={(event) =>
                              handleZoneChange(
                                zone.id,
                                "left",
                                Number(event.target.value),
                              )
                            }
                            className="rounded border border-black/10 px-2 py-1 text-xs dark:border-white/20"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span>Top (%)</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={toPercent(zone.top)}
                            onChange={(event) =>
                              handleZoneChange(
                                zone.id,
                                "top",
                                Number(event.target.value),
                              )
                            }
                            className="rounded border border-black/10 px-2 py-1 text-xs dark:border-white/20"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span>Width (%)</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={toPercent(zone.width)}
                            onChange={(event) =>
                              handleZoneChange(
                                zone.id,
                                "width",
                                Number(event.target.value),
                              )
                            }
                            className="rounded border border-black/10 px-2 py-1 text-xs dark:border-white/20"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span>Height (%)</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={toPercent(zone.height)}
                            onChange={(event) =>
                              handleZoneChange(
                                zone.id,
                                "height",
                                Number(event.target.value),
                              )
                            }
                            className="rounded border border-black/10 px-2 py-1 text-xs dark:border-white/20"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleResetZones}
                className="text-xs text-muted-foreground underline"
              >
                Reset zones to default layout
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="rounded-lg border border-black/10 bg-black/5 p-2 dark:border-white/20">
              {state.imageUrl ? (
                <div
                  className="relative w-full overflow-hidden rounded bg-white"
                  style={{ background: previewBackground }}
                >
                  <Image
                    src={state.imageUrl}
                    alt="Frame preview"
                    width={state.width ?? 1200}
                    height={state.height ?? 1200}
                    className="h-auto w-full"
                    priority
                  />
                  {state.zones.map((zone, index) => {
                    const isActive = zone.id === selectedZoneId;
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        className={`absolute border-2 ${
                          isActive ? "border-emerald-500" : "border-sky-500/70"
                        } bg-sky-500/10 text-[10px] text-sky-900 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                        style={{
                          left: `${zone.left * 100}%`,
                          top: `${zone.top * 100}%`,
                          width: `${zone.width * 100}%`,
                          height: `${zone.height * 100}%`,
                        }}
                        onClick={() => setSelectedZoneId(zone.id)}
                      >
                        #{index + 1}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  Upload a frame PNG to configure zones.
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Zones are applied in order. Zone 1 receives the first photo, zone
              2 the next, and so on.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSaveZones}
          disabled={state.saving || !state.dirty}
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
        >
          {state.saving ? "Saving…" : "Save zones"}
        </button>
        {state.status && (
          <span className="text-xs text-emerald-600">{state.status}</span>
        )}
        {state.error && (
          <span className="text-xs text-red-500">{state.error}</span>
        )}
      </div>
    </div>
  );
}
