"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS = [
  {
    href: "/config/event",
    title: "Event title",
    description: "Set the headline text shown on the capture screen.",
  },
  {
    href: "/config/preview",
    title: "Preview lens",
    description:
      "Select which camera lens powers the live preview before each capture.",
  },
  {
    href: "/config/frames",
    title: "Frames",
    description:
      "Upload decorative frames and define the photo drop zones for each capture mode.",
  },
  {
    href: "/config/countdown",
    title: "Countdown",
    description: "Configure the on-screen countdown and shutter timing cues.",
  },
  {
    href: "/config/storage",
    title: "Storage",
    description:
      "Manage how long captures stay on disk and cleanup automation.",
  },
] as const;

type ConfigLayoutProps = {
  children: ReactNode;
};

export default function ConfigLayout({ children }: ConfigLayoutProps) {
  const pathname = usePathname();
  const activeTab =
    TABS.find((tab) => pathname?.startsWith(tab.href)) ?? TABS[0];

  return (
    <div className="min-h-screen p-8 flex justify-center">
      <main className="w-full max-w-[80%] space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Camera Settings</h1>
          <Link
            href="/"
            className="rounded-md border border-black/10 px-4 py-2 dark:border-white/20"
          >
            Back to booth
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">{activeTab.description}</p>
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
                    <span className="font-medium">{tab.title}</span>
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
