import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { QrImage } from "@/components/QrImage";
import { Link } from "@/i18n/routing";
import { getPhotoById } from "@/lib/photos";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function CaptureResultPage({ params }: Props) {
  const { locale, id } = await params;
  const photo = getPhotoById(id);
  if (!photo) return notFound();
  const t = await getTranslations({ locale, namespace: "captureResult" });

  return (
    <div className="grid h-screen grid-cols-5 overflow-hidden">
      <div className="box-border col-span-4 flex h-full min-h-0 w-full items-center justify-center overflow-hidden p-4">
        {/* biome-ignore lint/performance/noImgElement: Layout relies on object-contain sizing for arbitrary user uploads. */}
        <img
          src={photo.url}
          alt={photo.filename}
          className="max-h-full max-w-full rounded border border-black/10 object-contain dark:border-white/15"
        />
      </div>
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 border-l border-black/10 p-4 dark:border-white/15">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-center">{t("scanToDownload")}</p>
          <QrImage value={photo.url} size={240} />
        </div>
        <div className="flex w-full flex-col items-stretch gap-2">
          <Link
            href={{
              pathname: "/",
              query: { autoCapture: "single" },
            }}
            locale={locale}
            className="rounded-md bg-foreground px-4 py-2 text-center text-background"
          >
            {t("takeAnother")}
          </Link>
          <Link
            href={{
              pathname: "/",
              query: { autoCapture: "burst" },
            }}
            locale={locale}
            className="rounded-md border border-black/10 px-4 py-2 text-center dark:border-white/20"
          >
            {t("takeStrip")}
          </Link>
          <Link
            href="/gallery"
            locale={locale}
            className="rounded-md border border-black/10 px-4 py-2 text-center dark:border-white/20"
          >
            {t("viewGallery")}
          </Link>
        </div>
      </div>
    </div>
  );
}
