"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ChangeEvent, useCallback, useMemo } from "react";

import { type Locale, localeNames, locales } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/routing";

export function LocaleSwitcher() {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeParams = useParams();
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
      const queryEntries = searchParams
        ? Array.from(searchParams.entries())
        : [];
      const query =
        queryEntries.length > 0 ? Object.fromEntries(queryEntries) : undefined;
      const routeParamEntries = Object.entries(routeParams ?? {}).filter(
        ([key]) => key !== "locale",
      );
      const params =
        routeParamEntries.length > 0
          ? Object.fromEntries(
              routeParamEntries.map(([key, value]) => [
                key,
                Array.isArray(value) ? value[0] : value,
              ]),
            )
          : undefined;
      type ReplaceHref = Parameters<typeof router.replace>[0];
      const hrefForReplace: ReplaceHref = (() => {
        if (params && query) {
          return { pathname, params, query } as ReplaceHref;
        }
        if (params) {
          return { pathname, params } as ReplaceHref;
        }
        if (query) {
          return { pathname, query } as ReplaceHref;
        }
        return pathname as ReplaceHref;
      })();
      router.replace(hrefForReplace, { locale: nextLocale });
    },
    [currentLocale, pathname, routeParams, router, searchParams],
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
