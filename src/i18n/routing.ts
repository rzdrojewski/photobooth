import { createLocalizedPathnamesNavigation } from "next-intl/navigation";

import { localePrefix, locales } from "./config";

export const pathnames = {
  "/": "/",
  "/capture/[id]": "/capture/[id]",
  "/capture/burst/[id]": "/capture/burst/[id]",
  "/gallery": "/gallery",
  "/gallery/[id]": "/gallery/[id]",
  "/config": "/config",
  "/config/event": "/config/event",
  "/config/preview": "/config/preview",
  "/config/frames": "/config/frames",
  "/config/countdown": "/config/countdown",
  "/config/storage": "/config/storage",
} as const;

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createLocalizedPathnamesNavigation({
    locales,
    localePrefix,
    pathnames,
  });
