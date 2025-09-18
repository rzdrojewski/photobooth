import createMiddleware from "next-intl/middleware";

import { defaultLocale, localePrefix, locales } from "./src/i18n/config";

export default createMiddleware({
  defaultLocale,
  localePrefix,
  locales,
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
