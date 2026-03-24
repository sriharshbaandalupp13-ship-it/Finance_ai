create extension if not exists pgcrypto;

create table if not exists signal_items (
  id text primary key,
  title text not null,
  url text not null,
  source text not null,
  source_kind text not null,
  published_at timestamptz not null,
  company_tags text[] not null default '{}',
  summary text not null,
  sentiment text not null,
  financial_event text not null,
  impact text not null,
  explanation text not null,
  confidence numeric not null
);

create table if not exists company_snapshots (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  sentiment_score numeric not null,
  sentiment_trend numeric not null,
  mention_volume integer not null,
  prediction_direction text not null,
  prediction_confidence numeric not null,
  why_moving text not null,
  generated_at timestamptz not null,
  payload jsonb not null
);
