import { getRequestConfig } from "next-intl/server";

import { defaultLocale, type Locale, locales } from "./config";

async function loadMessages(locale: Locale) {
  if (locale === "fr") {
    return (await import("../messages/fr.json")).default;
  }
  return (await import("../messages/en.json")).default;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolvedLocale = (await requestLocale) ?? defaultLocale;
  const normalizedLocale = locales.includes(resolvedLocale as Locale)
    ? (resolvedLocale as Locale)
    : defaultLocale;

  return {
    locale: normalizedLocale,
    messages: await loadMessages(normalizedLocale),
  };
});
