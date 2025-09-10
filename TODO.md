# Photobooth – TODO

Etat actuel (MVP en cours):
- [x] Monorepo pnpm configuré (`pnpm-workspace.yaml`).
- [x] Serveur Next.js (App Router) avec Prisma (SQLite) et libs (`env`, `db`, `s3`).
- [x] Schéma Prisma `Event`/`Photo` + migration init (voir README).
- [x] API: `POST /api/presign` (S3 ou local), `POST /api/upload-local`, `POST /api/photo/commit`.
- [x] API: `POST /api/send-email` (transport JSON nodemailer + rate-limit IP) – SMTP réel TODO.
- [x] API: `GET /api/qr/:slug` (SVG QR).
- [x] Page publique `/p/[slug]` (aperçu + télécharger + formulaire email).
- [x] Admin minimal `/admin` (mot de passe, liste + suppression).
- [x] Stockage local: écriture dans `apps/server/storage/...` et service via `/files/...`.
- [x] App client web (Vite + React): sélection fichier, upload (presign → upload → commit), affichage QR, overlay canvas optionnel.


Serveur (priorité)
- [x] S3 privé: ajouter un proxy GET `GET /api/file/[...key]` (AWS SDK GetObject, stream) et l’utiliser dans `/p/[slug]` lorsque le bucket n’est pas public.
- [x] Validation stricte: schémas Zod par route (presign, commit, send-email, upload-local) et réponses typées.
- [ ] Sécurité API: limiter `presign`/`commit` (rate limit simple par IP) et logs d’audit.
- [ ] CORS: si client sur autre domaine, ajouter un `middleware.ts` configurable (ou documenter déploiement même domaine).
- [ ] Télécharger: ajouter option “Download” avec `Content-Disposition: attachment` via un endpoint dédié si nécessaire.

Email
- [ ] Brancher SMTP réel (variables `.env`), fallback à JSON en dev.
- [ ] Template d’email (HTML + texte), marque/branding minimal.
- [ ] Double saisie d’email côté client (confirmation) + validation.

Admin
- [ ] Ajout actions: renvoi d’email, re-génération de QR (nouveau `qrSlug` + mise à jour `storageKey` si nécessaire), marquer `printed`.
- [ ] Logout + vérification cookie `admin` (expiration) + petite UI.
- [ ] Filtre/tri/recherche par event/date.

Client web
- [x] Capture webcam (getUserMedia) + prise de vue → pipeline d’upload existant.
- [ ] Champ email (opt-in) et envoi via `/api/send-email` après upload.
- [ ] Message d’état + erreurs UX (toasts) + loader.
- [ ] Option overlay: input URL ou fichier local, aperçu live.
- [ ] Redimensionnement/optimisation côté client (canvas), limites de taille.
- [ ] Compte à rebours configurable + son beep.
- [ ] PWA (optionnel): manifest + service worker.

Mode offline (web)
- [ ] File d’uploads locale (LocalStorage/IndexedDB) + retry au prochain lancement.
- [ ] (Optionnel) Background Sync via Service Worker (si supporté).

Stockage local
- [ ] Vérifier/forcer types MIME lors du service des fichiers.
- [ ] Ajout d’en-têtes de cache et de protection basique (si nécessaire).

Qualité/ops
- [ ] Scripts de build prod + README déploiement (Docker Compose avec MinIO, ou S3 managé).
- [ ] Variables d’env: documenter toutes les options (S3 privé/public, base URL, etc.).
- [ ] Monitoring léger (logs structurés) + gestion d’erreurs.

Nice-to-have
- [ ] Thèmes/overlays PNG (cadres, texte date) côté client.
- [ ] Filtres (N&B, sepia) côté client (canvas/CSS).
- [ ] GIF/boomerang à partir d’une rafale (nécessite côté capture; à reporter si kiosk revient).
- [ ] Diaporama live (`/slideshow`).
- [ ] Multi-format (bandelettes 2×3, 10×15, etc.).
- [ ] Export ZIP de l’événement.

Notes
- Le composant “kiosk” Electron est mis de côté. Les fonctionnalités liées (capture reflex, impression locale) seront réintroduites plus tard.
