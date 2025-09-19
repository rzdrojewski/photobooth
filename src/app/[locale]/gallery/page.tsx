import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { listPhotos } from "@/lib/photos";

export const dynamic = "force-dynamic";

type GalleryPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery" });
  const photos = listPhotos();
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Link className="underline" href="/" locale={locale}>
          {t("backToBooth")}
        </Link>
      </div>
      {photos.length === 0 ? (
        <p className="text-center text-sm opacity-80">{t("empty")}</p>
      ) : (
        <ul
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          }}
        >
          {photos.map((p) => (
            <li key={p.filename} className="group">
              <Link
                href={{ pathname: "/gallery/[id]", params: { id: p.id } }}
                locale={locale}
                className="block"
              >
                <Image
                  src={p.url}
                  alt={p.filename}
                  loading="lazy"
                  width={160}
                  height={160}
                  className="w-full aspect-square object-cover rounded border border-black/10 dark:border-white/15 group-hover:opacity-90"
                />
                <div className="mt-1 text-xs opacity-70 truncate">
                  {p.filename}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
