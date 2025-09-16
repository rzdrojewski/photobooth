import Link from "next/link";
import { notFound } from "next/navigation";

import { QrImage } from "@/components/QrImage";
import { getPhotoById } from "@/lib/photos";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function CaptureResultPage({ params }: Props) {
  const photo = getPhotoById(params.id);
  if (!photo) return notFound();

  return (
    <div className="h-screen grid" style={{ gridTemplateRows: "auto 1fr" }}>
      <div className="p-3 flex items-center justify-between gap-3">
        <Link href="/" className="px-4 py-2 rounded-md bg-foreground text-background">
          Take another photo
        </Link>
        <Link
          href="/gallery"
          className="px-4 py-2 rounded-md border border-black/10 dark:border-white/20"
        >
          View gallery
        </Link>
      </div>
      <div className="h-full min-h-0 grid grid-cols-5 overflow-hidden">
        <div className="box-border col-span-4 flex h-full min-h-0 w-full items-center justify-center overflow-hidden p-4">
          {/* biome-ignore lint/performance/noImgElement: Layout relies on object-contain sizing for arbitrary user uploads. */}
          <img
            src={photo.url}
            alt={photo.filename}
            className="max-h-full max-w-full rounded border border-black/10 object-contain dark:border-white/15"
          />
        </div>
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm">Scan to download:</p>
            <QrImage value={photo.url} size={240} />
          </div>
        </div>
      </div>
    </div>
  );
}
