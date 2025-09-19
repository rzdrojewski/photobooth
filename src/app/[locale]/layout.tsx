import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  unstable_setRequestLocale,
} from "next-intl/server";
import type { ReactNode } from "react";

import { EventTitleDocumentTitle } from "@/components/EventTitleDocumentTitle";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { type Locale, localeNames, locales } from "@/i18n/config";

import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const balloonParty = localFont({
  src: [
    {
      path: "../../../public/fonts/balloon_party/Balloon Party.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-balloon-party",
  display: "swap",
});

type LocaleLayoutProps = {
  children: ReactNode;
  params: { locale: string };
};

type Params = LocaleLayoutProps["params"];

type LocaleMetadataProps = { params: Params };

type GenerateMetadataResult = Promise<Metadata>;

type StaticParams = Params;

function assertLocale(input: string): Locale {
  if (locales.includes(input as Locale)) {
    return input as Locale;
  }
  return notFound();
}

export function generateStaticParams(): StaticParams[] {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocaleMetadataProps): GenerateMetadataResult {
  const locale = assertLocale(params.locale);
  const t = await getTranslations({
    locale,
    namespace: "metadata",
  });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(locales.map((code) => [code, `/${code}`])),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
  } satisfies Metadata;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const locale = assertLocale(params.locale);
  unstable_setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-locale={locale}
      data-locale-name={localeNames[locale]}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${balloonParty.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <EventTitleDocumentTitle />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
