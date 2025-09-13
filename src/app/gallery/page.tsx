import Link from "next/link";
import { listPhotos } from "@/lib/photos";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const photos = listPhotos();
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-semibold">Gallery</h1>
        <Link className="underline" href="/">Back to booth</Link>
      </div>
      {photos.length === 0 ? (
        <p className="text-center text-sm opacity-80">No photos yet.</p>
      ) : (
        <ul className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {photos.map((p) => (
            <li key={p.filename} className="group">
              <Link href={`/gallery/${encodeURIComponent(p.id)}`} className="block">
                <img
                  src={p.url}
                  alt={p.filename}
                  loading="lazy"
                  className="w-full aspect-square object-cover rounded border border-black/10 dark:border-white/15 group-hover:opacity-90"
                />
                <div className="mt-1 text-xs opacity-70 truncate">{p.filename}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

