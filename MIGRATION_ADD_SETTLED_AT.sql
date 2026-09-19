-- Optional migration for existing My Budget Supabase databases.
-- The app also contains a compatibility fallback to updated_at, so Settle/Edit
-- continues to work even if this migration is not run.
alter table public.money_held
  add column if not exists settled_at timestamptz;

create index if not exists idx_money_held_settled_at
  on public.money_held(user_id, settled_at);
