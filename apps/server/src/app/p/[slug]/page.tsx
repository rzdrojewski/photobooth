import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

async function getPhoto(slug: string) {
  return prisma.photo.findUnique({ where: { qrSlug: slug } });
}

export default async function PublicPhotoPage({ params }: { params: { slug: string } }) {
  const photo = await getPhoto(params.slug);
  if (!photo) return <div>Photo introuvable.</div>;

  const src = env.STORAGE_MODE === 'local'
    ? `/files/${photo.storageKey}`
    : `/api/file/${photo.storageKey}`; // proxy S3 (privé)

  const downloadHref = src;

  return (
    <main>
      <h1>Votre photo</h1>
      <img src={src} alt="Photo" style={{ maxWidth: '100%', height: 'auto', borderRadius: 8 }} />
      <div style={{ marginTop: 16 }}>
        <a href={downloadHref} download>
          Télécharger
        </a>
      </div>
      <div style={{ marginTop: 16 }}>
        <form action="/api/send-email" method="post" style={{ display: 'flex', gap: 8 }}>
          <input type="hidden" name="slug" value={photo.qrSlug} />
          <input name="email" type="email" placeholder="Votre email" required />
          <button type="submit">Envoyer par email</button>
        </form>
        <p style={{ fontSize: 12, color: '#666' }}>Envoi par email: limité pour éviter l'abus.</p>
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';
