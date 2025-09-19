import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { defaultLocale, locales } from "@/i18n/config";

type LanguageCandidate = {
  tag: string;
  quality: number;
  index: number;
};

function parseAcceptLanguage(value: string): LanguageCandidate[] {
  return value
    .split(",")
    .map((entry, index): LanguageCandidate | null => {
      const [rawTag, ...params] = entry.trim().split(";");
      const tag = rawTag.trim();
      if (!tag) return null;

      let quality = 1;
      for (const param of params) {
        const [key, rawValue] = param.split("=");
        if (key?.trim() === "q" && rawValue) {
          const parsed = Number.parseFloat(rawValue.trim());
          if (!Number.isNaN(parsed)) {
            quality = parsed;
          }
        }
      }

      return { tag, quality, index };
    })
    .filter((candidate): candidate is LanguageCandidate => {
      return candidate !== null && candidate.quality > 0;
    })
    .sort((a, b) => {
      if (b.quality !== a.quality) {
        return b.quality - a.quality;
      }
      return a.index - b.index;
    });
}

function matchLocale(tag: string): Locale | null {
  const normalized = tag.toLowerCase();
  const exact = locales.find((locale) => locale === normalized);
  if (exact) {
    return exact;
  }

  const base = normalized.split("-")[0];
  const baseMatch = locales.find((locale) => locale === base);
  return baseMatch ?? null;
}

function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  const candidates = parseAcceptLanguage(acceptLanguage);
  for (const candidate of candidates) {
    if (candidate.tag === "*") {
      break;
    }
    const matched = matchLocale(candidate.tag);
    if (matched) {
      return matched;
    }
  }

  return defaultLocale;
}

export default async function RootRedirect() {
  const headerList = await headers();
  const acceptLanguage = headerList.get("accept-language");
  const locale = detectLocale(acceptLanguage);

  redirect(`/${locale}`);
}
