# Finance Signal Studio

Finance Signal Studio is a standalone Next.js dashboard built for GitHub and Vercel deployment. It tracks one company, its related stocks, and the latest multi-source news signals in a highly interactive interface.

## What it does

- Shows a primary company quote and AI-generated signal summary
- Maps connected companies such as suppliers, manufacturers, customers, and competitors
- Pulls news from multiple sources
- Keeps X, Instagram, and Facebook connectors ready through optional Apify actors
- Works as a separate project folder so it does not interfere with the existing app in this repo

## Suggested free stack

- Market quotes and market news: Alpha Vantage free tier
- Extra mainstream news: News API developer plan for local development and testing, then replace or upgrade for public production
- AI summarization: Gemini free tier in Google AI Studio or Groq free tier
- Social ingestion: Apify free credits with platform-specific actors

## Local setup

1. Create a `.env.local` file inside `finance-signal-studio`.
2. Copy values from `.env.example`.
3. Start the app:

```bash
npm install
npm run dev
```

4. Open `http://localhost:3000`.

## Environment variables

```env
ALPHA_VANTAGE_API_KEY=
NEWS_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
APIFY_API_TOKEN=
X_SEARCH_ACTOR_ID=
INSTAGRAM_SEARCH_ACTOR_ID=
FACEBOOK_SEARCH_ACTOR_ID=
```

## Social-platform note

X, Instagram, and Facebook do not offer a simple fully-free public production API for unrestricted market-monitoring workflows. This project solves that by keeping those sources optional and pluggable. If you connect Apify actors or another approved ingestion service later, the dashboard can start pulling those feeds without changing the UI architecture.

## GitHub and Vercel deployment

1. Push the repo or the `finance-signal-studio` folder contents to GitHub.
2. Import the project into Vercel.
3. Set the Vercel project root to `finance-signal-studio` if the repo contains multiple apps.
4. Add the same environment variables in Vercel Project Settings.
5. Deploy.

## Extend it

- Add more relationship maps in `lib/mock/relationships.ts`
- Replace the social connectors with your preferred provider
- Add watchlists, alerts, or portfolio analytics
