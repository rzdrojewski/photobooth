"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { useEventTitle } from "@/hooks/useEventTitle";

export default function EventSettingsPage() {
  const t = useTranslations("configEvent");
  const commonT = useTranslations("common");
  const { rawTitle, setTitle, isReady, title } = useEventTitle(
    commonT("eventTitleDefault"),
  );
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  const placeholder = useMemo(() => commonT("eventTitleDefault"), [commonT]);

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
          {t("label")}
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
          {t("helper", { defaultTitle: placeholder })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!isReady || draft === rawTitle}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {t("save")}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!isReady || title === placeholder}
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/20 disabled:opacity-60"
        >
          {t("reset")}
        </button>
        {status === "saved" && (
          <span className="text-xs text-foreground/70">{t("statusSaved")}</span>
        )}
      </div>
    </form>
  );
}
