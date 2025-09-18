"use client";

import { useEffect, useRef } from "react";

import { useEventTitle } from "@/hooks/useEventTitle";

export function EventTitleDocumentTitle() {
  const { title, isReady } = useEventTitle();
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
