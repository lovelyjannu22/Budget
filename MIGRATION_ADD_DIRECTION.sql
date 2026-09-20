-- Optional migration for existing My Budget Supabase databases.
--
-- Newer builds of My Budget record a "direction" on each repayment
-- (received from someone vs. repaid to someone). Databases created before
-- this feature was added don't have this column, which made Settle / Save
-- repayment fail with a generic "Something went wrong" error.
--
-- The app also contains a compatibility fallback: it will still save a
-- "Receive money from them" settlement even without this column. However,
-- "Repay money to them" cannot be saved correctly without it (there would
-- be no way to tell the two apart later), so please run this migration.
alter table public.reimbursements
  add column if not exists direction text not null default 'received';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.reimbursements'::regclass
      and conname = 'reimbursements_direction_check'
  ) then
    alter table public.reimbursements
      add constraint reimbursements_direction_check check (direction in ('received','sent'));
  end if;
end $$;
