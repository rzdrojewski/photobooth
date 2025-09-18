"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { useEventTitle } from "@/hooks/useEventTitle";

export function EventTitleDocumentTitle() {
  const t = useTranslations("common");
  const fallbackTitle = t("eventTitleDefault");
  const { title, isReady } = useEventTitle(fallbackTitle);
  const previousTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (previousTitleRef.current === null) {
      previousTitleRef.current = document.title;
    }
    document.title = title;
    return () => {
      if (previousTitleRef.current !== null) {
        document.title = previousTitleRef.current;
      }
    };
  }, [isReady, title]);

  return null;
}
