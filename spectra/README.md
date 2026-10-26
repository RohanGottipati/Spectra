# Spectra web app

Next.js 16 app for Spectra: the landing/marketing pages, the live agent dashboard, the API routes and the Fumadocs documentation site. See the [root README](../README.md) for an overview, environment variables and the full route list.

## Getting started

```bash
npm install      # runs `fumadocs-mdx` on postinstall
npm run dev      # http://localhost:3000
```

Create `.env.local` with at least `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` first. Pages create Supabase clients while prerendering, so `next build` also needs them.

## Layout

- `app/`: routes (`/`, `/dashboard`, `/login`, `/signup`, `/pricing`, `/sdk`, `/api`, `/waitlist`, `/support`, `/docs`), API routes under `app/api/`, Supabase auth callbacks under `app/auth/`
- `components/`: visual components, `ui/` primitives and `docs/` MDX components
- `content/docs/`: MDX pages for `/docs`
- `lib/`: Supabase clients (`supabase/`), auth hook (`auth.ts`), Solana integration (`solana/`), Fumadocs source (`source.ts`)

## Scripts

- `npm run dev`: dev server
- `npm run build`: production build
- `npm run start`: serve the build
- `npm run lint`: ESLint
