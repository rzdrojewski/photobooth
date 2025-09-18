export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localePrefix = "always";

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};
