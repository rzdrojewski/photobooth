# Repository Guidelines

## Project Structure & Module Organization

- Source lives in `src/` using the Next.js App Router (`src/app/{layout,page}.tsx`, `globals.css`).
- Static assets go in `public/` (served at `/`).
- Build output is `.next/` (ignored). Core configs: `next.config.ts`, `tsconfig.json`, `biome.json`, `postcss.config.mjs`.
- TypeScript path alias: import with `@/*` (see `tsconfig.json`).

## Build, Test, and Development Commands

- `npm run dev` — Start local dev server with Turbopack at `http://localhost:3000`.
- `npm run build` — Create production build.
- `npm start` — Run the production server.
- `npm run lint` — Biome lint checks (Next/React rules enabled).
- `npm run format` — Biome format (writes changes).

## Coding Style & Naming Conventions

- Language: TypeScript (strict). Indentation: 2 spaces. Use ES modules.
- Components: PascalCase for React components; hooks `useX.ts`; utility modules `camelCase`.
- Next.js files: route entries are `page.tsx`; layouts `layout.tsx`. Co-locate small components next to usage or create `src/components/` when shared.
- Styling: Tailwind CSS v4 in `globals.css`. Prefer semantic class composition; avoid long, duplicated class strings.
- Imports: keep sorted/clean; Biome auto‑organizes.

## Testing Guidelines

- No test runner is configured yet. If you add tests, prefer Vitest + React Testing Library.
- Name tests `*.test.ts(x)` next to the file or under `src/__tests__/`.
- Aim for focused unit tests on components and utilities; keep assertions minimal and deterministic.

## Commit & Pull Request Guidelines

- Commits: short imperative subject (≤72 chars), e.g., "Add photo grid layout". Use body for context and breaking changes. Reference issues (`#123`) when relevant.
- PRs: include concise description, screenshots for UI changes, steps to validate, and linked issues. Ensure `npm run lint` and `npm run format` pass before requesting review.

## Security & Configuration Tips

- Use `.env.local` for secrets (never commit). Access via `process.env.NEXT_PUBLIC_*` for client-safe vars only.
- Validate and sanitize any user-supplied data before using it in UI or requests.

## Agent-Specific Notes

- Scope: these rules apply to the entire repository.
- Prefer minimal, surgical diffs aligned with the style above; do not reformat unrelated files.
- Keep track of the progress in the TODO.md file
