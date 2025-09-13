import { notFound } from "next/navigation";
import Link from "next/link";
import { getPhotoById } from "@/lib/photos";
import { QrImage } from "@/components/QrImage";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function PhotoDetailPage({ params }: Props) {
  const photo = getPhotoById(params.id);
  if (!photo) return notFound();
  return (
    <div className="h-screen grid" style={{ gridTemplateRows: "auto 1fr" }}>
      <div className="p-3 flex items-center">
        <Link href="/gallery" className="px-4 py-2 rounded-md bg-foreground text-background">
          Back to gallery
        </Link>
      </div>
      <div className="h-full min-h-0 grid" style={{ gridTemplateColumns: "80% 20%" }}>
        <div className="h-full w-full p-4 flex items-center justify-center">
          <img
            src={photo.url}
            alt={photo.filename}
            className="max-w-full max-h-full object-contain rounded border border-black/10 dark:border-white/15"
          />
        </div>
        <div className="h-full w-full p-4 flex flex-col items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm">Scan to download:</p>
            <QrImage value={photo.url} size={240} />
          </div>
        </div>
      </div>
    </div>
  );
}
