"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Link } from "@/i18n/routing";

const TABS = [
  {
    href: "/config/event",
    titleKey: "tabs.event.title",
    descriptionKey: "tabs.event.description",
  },
  {
    href: "/config/preview",
    titleKey: "tabs.preview.title",
    descriptionKey: "tabs.preview.description",
  },
  {
    href: "/config/frames",
    titleKey: "tabs.frames.title",
    descriptionKey: "tabs.frames.description",
  },
  {
    href: "/config/countdown",
    titleKey: "tabs.countdown.title",
    descriptionKey: "tabs.countdown.description",
  },
  {
    href: "/config/storage",
    titleKey: "tabs.storage.title",
    descriptionKey: "tabs.storage.description",
  },
] as const;

type ConfigLayoutProps = {
  children: ReactNode;
};

export default function ConfigLayout({ children }: ConfigLayoutProps) {
  const pathname = usePathname();
  const t = useTranslations("config");
  const activeTab =
    TABS.find((tab) => pathname?.startsWith(tab.href)) ?? TABS[0];

  return (
    <div className="min-h-screen p-8 flex justify-center">
      <main className="w-full max-w-[80%] space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <Link
            href="/"
            className="rounded-md border border-black/10 px-4 py-2 dark:border-white/20"
          >
            {t("backToBooth")}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(activeTab.descriptionKey)}
        </p>
        <div className="flex flex-col gap-6 sm:flex-row">
          <aside className="sm:w-60">
            <nav className="flex flex-col gap-2">
              {TABS.map((tab) => {
                const isActive = pathname?.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`rounded-md border px-4 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "border-foreground bg-foreground text-background"
                        : "border-black/10 text-foreground hover:border-foreground/50 dark:border-white/20"
                    }`}
                  >
                    <span className="font-medium">{t(tab.titleKey)}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
          <section className="flex-1 space-y-4">{children}</section>
        </div>
      </main>
    </div>
  );
}
