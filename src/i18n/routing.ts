import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

import { defaultLocale, localePrefix, locales } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix,
  pathnames: {
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
  },
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
