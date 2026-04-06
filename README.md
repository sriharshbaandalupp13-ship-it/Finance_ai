# Finance Signal Studio

Finance Signal Studio is a full-stack AI-powered financial intelligence and stock prediction platform built with Next.js, Tailwind CSS, React Flow, Google Gemini, Alpha Vantage, Reddit, RSS feeds, and optional Supabase persistence.

## Features

- Multi-source ingestion from RSS feeds, News API, and Reddit
- Gemini-driven processing for summary, sentiment, event extraction, impact, and explanation
- Dynamic market sentiment engine with mention volume and trend scoring
- Stock prediction engine with confidence and AI explanation
- React Flow workflow canvas from News to Prediction to Related Companies
- Related-company graph for competitors, suppliers, partners, and chain reactions
- Stock dashboard with price history, volume, SMA, and momentum
- Trending companies and alert panels for sudden sentiment spikes
- Optional Supabase persistence for signals and generated snapshots

## Folder Structure

- `app/` Next.js routes and API endpoints
- `frontend/` dashboard and workflow UI modules
- `backend/` orchestration, engines, and repositories
- `components/` reusable presentation components
- `services/` external integrations and AI/market connectors
- `utils/` formatting and helper utilities
- `data/` contracts, watchlist seed data, and SQL schema

## API Endpoints

- `GET /api/intelligence/[symbol]` returns the full intelligence payload for one company
- `GET /api/trending` returns trending companies based on current buzz scoring

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values you want to enable.

```env
ALPHA_VANTAGE_API_KEY=
NEWS_API_KEY=
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

If you want persistence:

1. Create a Supabase project.
2. Open the SQL editor.
3. Run the schema in `data/schema.sql`.
4. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.

## Vercel Deployment

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Add the same environment variables in Vercel Project Settings.
4. Deploy.

## Notes

- Gemini is the primary AI engine. If the API key is missing or parsing fails, the app falls back to heuristics.
- News API free usage is suitable for development and testing; review their production restrictions before going live.
- Reddit is fetched from public JSON endpoints for `r/stocks`, `r/investing`, and `r/wallstreetbets`.
- Use `SUPABASE_URL` for the server-side admin client. `NEXT_PUBLIC_SUPABASE_URL` remains supported only as a fallback.

## Validation

```bash
npm run lint
npx tsc --noEmit --incremental false
```

## Deployment Procedure

1. Copy `.env.example` to `.env.local`.
2. Fill in the API keys you want to enable.
3. If you want persistence, create a Supabase project and run `data/schema.sql`.
4. Run `npm run lint`.
5. Run `npx tsc --noEmit --incremental false`.
6. Run `npm run build`.
7. Push the repo to GitHub.
8. Import the repo into Vercel as a Next.js project.
9. Add the same environment variables in Vercel. Use `SUPABASE_URL` for the server-side admin client; `NEXT_PUBLIC_SUPABASE_URL` is only a fallback.
10. Deploy.
11. Verify `/`, `/api/trending`, and `/api/intelligence/NVDA`.
