import Link from "next/link";
import { notFound } from "next/navigation";

import { QrImage } from "@/components/QrImage";
import { getBurstById } from "@/lib/bursts";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function BurstResultPage({ params }: Props) {
  const burst = getBurstById(params.id);
  if (!burst) return notFound();

  return (
    <div className="grid h-screen grid-cols-5 overflow-hidden">
      <div className="box-border col-span-4 flex h-full min-h-0 w-full items-center justify-center overflow-hidden p-4">
        {/* biome-ignore lint/performance/noImgElement: Layout relies on object-contain sizing for arbitrary user uploads. */}
        <img
          src={burst.mosaic.url}
          alt={`Photo strip ${burst.id}`}
          className="max-h-full max-w-full rounded border border-black/10 object-contain dark:border-white/15"
        />
      </div>
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 border-l border-black/10 p-4 dark:border-white/15">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-center">Scan to download:</p>
          <QrImage value={burst.mosaic.url} size={240} />
        </div>
        <div className="flex w-full flex-col items-stretch gap-2">
          <Link
            href="/?autoCapture=burst"
            className="rounded-md bg-foreground px-4 py-2 text-center text-background"
          >
            Take another strip
          </Link>
          <Link
            href="/?autoCapture=single"
            className="rounded-md border border-black/10 px-4 py-2 text-center dark:border-white/20"
          >
            Take single photo
          </Link>
          <Link
            href="/gallery"
            className="rounded-md border border-black/10 px-4 py-2 text-center dark:border-white/20"
          >
            View gallery
          </Link>
        </div>
      </div>
    </div>
  );
}

