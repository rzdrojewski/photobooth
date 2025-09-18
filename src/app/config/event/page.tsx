"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

import { getDefaultEventTitle, useEventTitle } from "@/hooks/useEventTitle";

export default function EventSettingsPage() {
  const { rawTitle, setTitle, isReady, title } = useEventTitle();
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  const placeholder = useMemo(() => getDefaultEventTitle(), []);

  useEffect(() => {
    if (!isReady) return;
    setDraft(rawTitle);
  }, [isReady, rawTitle]);

  useEffect(() => {
    if (status !== "saved") return;
    const timeout = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [status]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTitle(draft);
    setStatus("saved");
  };

  const handleReset = () => {
    setTitle("");
    setStatus("saved");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="event-title" className="text-sm font-medium">
          Capture screen title
        </label>
        <input
          id="event-title"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          disabled={!isReady}
          className="w-full rounded-md border border-black/10 px-4 py-3 text-base dark:border-white/20"
        />
        <p className="text-xs text-muted-foreground">
          This text appears at the top of the home screen. Leave blank to use
          the default. Current default: {placeholder}.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!isReady || draft === rawTitle}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          Save title
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!isReady || title === placeholder}
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/20 disabled:opacity-60"
        >
          Reset to default
        </button>
        {status === "saved" && (
          <span className="text-xs text-foreground/70">Saved</span>
        )}
      </div>
    </form>
  );
}
