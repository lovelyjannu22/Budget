-- Optional migration for existing My Budget Supabase databases.
--
-- The "+ Create" / "Undo" marker on split transactions (used to remember
-- which splits you've already created as a PhonePe/UPI request, or similar)
-- used to live only in the browser's localStorage. That meant it could
-- appear to "reset" after a refresh in a different browser, a different
-- device, an incognito/private window, or any environment that doesn't
-- keep localStorage between page loads.
--
-- Running this migration lets the app save that marker to the database
-- instead, so it persists properly everywhere. The app also contains a
-- compatibility fallback to localStorage, so the button keeps working even
-- if this migration is not run — it just won't be as reliable.
alter table public.split_transactions
  add column if not exists phonepe_created boolean not null default false;
