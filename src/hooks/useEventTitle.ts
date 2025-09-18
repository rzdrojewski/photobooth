"use client";

import { useCallback, useEffect, useState } from "react";

import { DEFAULT_EVENT_TITLE } from "@/config/eventTitle";

const STORAGE_KEY = "photobooth.eventTitle";

type UseEventTitleResult = {
  title: string;
  rawTitle: string;
  setTitle: (value: string) => void;
  isReady: boolean;
};

export function useEventTitle(
  defaultTitle: string = DEFAULT_EVENT_TITLE,
): UseEventTitleResult {
  const [rawTitle, setRawTitle] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setRawTitle(stored);
    }
    setIsReady(true);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setRawTitle(event.newValue ?? "");
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setTitle = useCallback((value: string) => {
    setRawTitle(value);
    if (typeof window === "undefined") return;
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, value);
  }, []);

  const fallbackTitle =
    defaultTitle.trim().length > 0 ? defaultTitle : DEFAULT_EVENT_TITLE;
  const title = rawTitle.trim().length > 0 ? rawTitle : fallbackTitle;

  return { title, rawTitle, setTitle, isReady };
}

export function getDefaultEventTitle(fallbackTitle?: string): string {
  if (fallbackTitle && fallbackTitle.trim().length > 0) {
    return fallbackTitle;
  }
  return DEFAULT_EVENT_TITLE;
}
