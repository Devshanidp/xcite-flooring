-- Run this ONCE in your Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run

create table if not exists xcite_data (
  id      text primary key,
  data    jsonb not null,
  updated_at timestamptz default now()
);

-- Allow full access (single-user internal app, no auth required)
alter table xcite_data disable row level security;
