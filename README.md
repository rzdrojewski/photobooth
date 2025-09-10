# Photobooth Monorepo

 Monorepo TypeScript (pnpm workspaces) avec:

 - `apps/server`: Next.js 14 (App Router) + Prisma (SQLite) + API (presign, commit, email, upload-local) + pages publiques `/p/[slug]` et admin minimal.
 - `apps/client`: Vite + React (navigateur) pour sélectionner une photo, uploader vers le serveur et afficher le QR.

## Setup macOS

Prérequis matériel: utilisez de préférence un hub USB alimenté pour le reflex.

1) Installer gphoto2 via Homebrew

```bash
brew install gphoto2
```

2) Tester la caméra

```bash
gphoto2 --auto-detect
# Selon certains boîtiers, les commandes "capture-image" / "capture-image-and-download"
# peuvent segfault. Dans l'app, on utilise le flux suivant qui est stable:
#   1) gphoto2 --trigger-capture
#   2) gphoto2 --list-files (on prend l'index le plus récent)
#   3) gphoto2 --get-file <index>

# Test manuel minimal:
gphoto2 --trigger-capture && sleep 1 && gphoto2 --list-files | tail -n 20
```

## Installation

```bash
pnpm i

# Server
cp apps/server/.env.example apps/server/.env
# → Remplir les variables MinIO / S3 ou mettre STORAGE_MODE=local

pnpm -C apps/server prisma migrate dev --name init

# Démarrer
pnpm dev:server   # http://localhost:3000
pnpm dev:kiosk
```

## Scripts racine

- `pnpm dev:server`: lance Next.js
- `pnpm dev:client`: lance l’app web (http://localhost:5173), proxie `/api` vers le serveur
- `pnpm build`: build server
- `pnpm typecheck`: vérifie les types

## Flux de test

- Côté client: choisir une image → Uploader → QR → ouvrir `/p/<slug>`
- Côté serveur: `/admin` pour voir les photos (mot de passe ADMIN_PASSWORD)

### Capture Reflex (gphoto2)

- Dans l’app client, utilisez le bouton "Prendre avec reflex" pour déclencher le boîtier relié en USB.
- Côté serveur, l’API `/api/capture-gphoto` appelle:
  - `gphoto2 --trigger-capture`
  - attend ~1.2s
  - `gphoto2 --list-files` pour trouver le dernier index
  - `gphoto2 --get-file <index>` pour rapatrier le JPEG
- Le client reçoit l’image, l’affiche en aperçu, puis vous pouvez l’uploader comme d’habitude (S3 ou local).

## Notes

- Mode stockage local: fichiers écrits dans `apps/server/storage/<eventId>/<qrSlug>/<filename>` et servis via `/files/...`.
- Email: implémentation nodemailer avec SMTP fictif (TODO: brancher SMTP réel).
- Impression: à traiter plus tard avec le kiosk.
