"use server";
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

async function setAdmin(formData: FormData) {
  'use server';
  const pwd = formData.get('password');
  if (pwd === env.ADMIN_PASSWORD) {
    cookies().set('admin', '1', { httpOnly: true, sameSite: 'lax' });
  }
}

async function deletePhoto(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const admin = cookies().get('admin')?.value === '1';
  if (!admin) return;
  await prisma.photo.delete({ where: { id } });
}

export default async function AdminPage() {
  const isAdmin = cookies().get('admin')?.value === '1';
  const photos = isAdmin ? await prisma.photo.findMany({ orderBy: { createdAt: 'desc' } }) : [];

  return (
    <main>
      <h1>Admin</h1>
      {!isAdmin ? (
        <form action={setAdmin} style={{ display: 'flex', gap: 8 }}>
          <input type="password" name="password" placeholder="Mot de passe" required />
          <button>Entrer</button>
        </form>
      ) : (
        <div>
          <h2>Photos</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Slug</th>
                <th>Fichier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {photos.map(p => (
                <tr key={p.id}>
                  <td>{new Date(p.createdAt).toLocaleString()}</td>
                  <td>{p.eventId}</td>
                  <td>{p.qrSlug}</td>
                  <td>{p.filename}</td>
                  <td>
                    <form action={deletePhoto}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit">Supprimer</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

