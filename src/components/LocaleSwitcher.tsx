"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ChangeEvent, useCallback, useMemo } from "react";

import { type Locale, localeNames, locales } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/routing";

export function LocaleSwitcher() {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("common");

  const options = useMemo(
    () =>
      locales.map((code) => ({
        value: code,
        label: localeNames[code],
      })),
    [],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextLocale = event.target.value as Locale;
      if (nextLocale === currentLocale) return;
      const params = searchParams?.toString() ?? "";
      const href = params.length > 0 ? `${pathname}?${params}` : pathname;
      router.replace(href, { locale: nextLocale });
    },
    [currentLocale, pathname, router, searchParams],
  );

  return (
    <label className="inline-flex items-center gap-2 rounded-md bg-black/60 px-3 py-2 text-xs text-white shadow backdrop-blur">
      <span>{t("language")}</span>
      <select
        value={currentLocale}
        onChange={handleChange}
        className="rounded border border-white/40 bg-transparent px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-black"
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
