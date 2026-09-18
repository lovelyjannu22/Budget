-- MY BUDGET FINAL — Supabase schema + safe migration
-- Features: accounts, categories/subcategories, transactions, splits/reimbursements,
-- budgets (weekly/monthly/yearly), goals + contributions, recurring transactions,
-- reminders, calendar data, RLS.

create extension if not exists pgcrypto;

create table if not exists public.categories(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, type text not null default 'expense' check(type in('expense','income')),
 parent_id uuid references public.categories(id) on delete set null, icon text, color text, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,name,type)
);

create table if not exists public.accounts(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, type text not null default 'bank', opening_balance numeric(14,2) not null default 0,
 currency text not null default 'INR', icon text, color text, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,name)
);

create table if not exists public.people(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, phone text, email text, notes text, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,name)
);

create table if not exists public.transactions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 transaction_date date not null default current_date,
 type text not null check(type in('income','expense','transfer','reimbursement','split')),
 description text not null, amount numeric(14,2) not null check(amount>=0),
 account_id uuid references public.accounts(id) on delete restrict, category_id uuid references public.categories(id) on delete set null,
 notes text, to_account_id uuid references public.accounts(id) on delete restrict, person_id uuid references public.people(id) on delete set null,
 related_transaction_id uuid references public.transactions(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.split_transactions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 transaction_id uuid not null references public.transactions(id) on delete cascade,
 split_type text not null check(split_type in('equal','unequal')), total_amount numeric(14,2) not null check(total_amount>=0),
 my_share numeric(14,2) not null default 0 check(my_share>=0), created_at timestamptz not null default now(), unique(transaction_id)
);

create table if not exists public.split_participants(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 split_transaction_id uuid not null references public.split_transactions(id) on delete cascade,
 person_id uuid not null references public.people(id) on delete restrict, amount numeric(14,2) not null check(amount>=0),
 amount_paid numeric(14,2) not null default 0 check(amount_paid>=0), status text not null default 'pending' check(status in('pending','partial','paid')), created_at timestamptz not null default now()
);

create table if not exists public.reimbursements(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 person_id uuid not null references public.people(id) on delete restrict, transaction_id uuid references public.transactions(id) on delete set null,
 amount numeric(14,2) not null check(amount>0), reimbursement_date date not null default current_date,
 account_id uuid references public.accounts(id) on delete restrict, notes text, created_at timestamptz not null default now()
);

create table if not exists public.budgets(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, category_id uuid references public.categories(id) on delete cascade, subcategory_id uuid references public.categories(id) on delete set null, amount numeric(14,2) not null check(amount>=0),
 period text not null default 'monthly' check(period in('weekly','monthly','yearly')), year integer, month integer check(month between 1 and 12),
 start_date date, end_date date, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.budgets add column if not exists subcategory_id uuid references public.categories(id) on delete set null;

create table if not exists public.goals(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, target_amount numeric(14,2) not null check(target_amount>0), saved_amount numeric(14,2) not null default 0 check(saved_amount>=0),
 duration_months integer not null default 1 check(duration_months>0), target_date date, icon text, color text, notes text, is_completed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.goal_contributions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 goal_id uuid not null references public.goals(id) on delete cascade, amount numeric(14,2) not null check(amount>0),
 contribution_date date not null default current_date, account_id uuid references public.accounts(id) on delete restrict,
 transaction_id uuid references public.transactions(id) on delete set null, notes text, created_at timestamptz not null default now()
);

create table if not exists public.recurring_transactions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, type text not null check(type in('income','expense','transfer')), amount numeric(14,2) not null check(amount>0), description text not null,
 account_id uuid references public.accounts(id) on delete restrict, to_account_id uuid references public.accounts(id) on delete restrict,
 category_id uuid references public.categories(id) on delete set null, frequency text not null default 'monthly' check(frequency in('daily','weekly','monthly','yearly')),
 next_date date not null, last_generated_date date, active boolean not null default true, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Compatibility upgrades for an already-created test database.
alter table public.recurring_transactions add column if not exists name text;
alter table public.recurring_transactions add column if not exists type text;
alter table public.recurring_transactions add column if not exists amount numeric(14,2);
alter table public.recurring_transactions add column if not exists description text;
alter table public.recurring_transactions add column if not exists account_id uuid;
alter table public.recurring_transactions add column if not exists to_account_id uuid;
alter table public.recurring_transactions add column if not exists category_id uuid;
alter table public.recurring_transactions add column if not exists frequency text;
alter table public.recurring_transactions add column if not exists next_date date;
alter table public.recurring_transactions add column if not exists last_generated_date date;
alter table public.recurring_transactions add column if not exists active boolean default true;
alter table public.recurring_transactions add column if not exists notes text;



create table if not exists public.reminders(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null, due_date date not null, note text, completed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.loans(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 person_id uuid not null references public.people(id) on delete restrict,
 direction text not null check(direction in('lend','borrow')),
 amount numeric(14,2) not null check(amount>0),
 account_id uuid references public.accounts(id) on delete restrict,
 loan_date date not null default current_date,
 notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.loan_repayments(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 loan_id uuid references public.loans(id) on delete set null,
 person_id uuid not null references public.people(id) on delete restrict,
 direction text not null check(direction in('received','sent')),
 amount numeric(14,2) not null check(amount>0),
 account_id uuid references public.accounts(id) on delete restrict,
 repayment_date date not null default current_date,
 notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Migration: allow daily recurring transactions in databases created by earlier versions.
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='public.recurring_transactions'::regclass and conname='recurring_transactions_frequency_check') then
    alter table public.recurring_transactions drop constraint recurring_transactions_frequency_check;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.recurring_transactions'::regclass and conname='recurring_frequency_allowed') then
    alter table public.recurring_transactions add constraint recurring_frequency_allowed check(frequency in('daily','weekly','monthly','yearly'));
  end if;
end $$;

-- Migrations for databases created by earlier My Budget versions.
alter table public.transactions add column if not exists goal_id uuid references public.goals(id) on delete set null;
alter table public.transactions add column if not exists recurring_id uuid references public.recurring_transactions(id) on delete set null;
alter table public.goal_contributions add column if not exists transaction_id uuid references public.transactions(id) on delete set null;
alter table public.goals add column if not exists duration_months integer default 1;
update public.goals set duration_months=1 where duration_months is null;
alter table public.goals alter column duration_months set default 1;
alter table public.goals alter column duration_months set not null;
do $$ begin if not exists (select 1 from pg_constraint where conname='goals_duration_months_positive') then alter table public.goals add constraint goals_duration_months_positive check(duration_months>0); end if; end $$;

-- Tax is intentionally not part of the final app.
alter table public.transactions drop column if exists tax_amount;

create index if not exists idx_transactions_user_date on public.transactions(user_id,transaction_date);
create index if not exists idx_transactions_account on public.transactions(account_id);
create index if not exists idx_transactions_category_date on public.transactions(category_id,transaction_date);
create index if not exists idx_split_participants_person on public.split_participants(person_id);
create index if not exists idx_reimbursements_person on public.reimbursements(person_id);
create index if not exists idx_goal_contributions_goal on public.goal_contributions(goal_id);
create index if not exists idx_recurring_next on public.recurring_transactions(user_id,next_date);
create index if not exists idx_reminders_date on public.reminders(user_id,due_date);
create index if not exists idx_loans_person on public.loans(user_id,person_id);
create index if not exists idx_loan_repayments_person on public.loan_repayments(user_id,person_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;

do $$ begin
 if not exists(select 1 from pg_trigger where tgname='categories_updated_at') then create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at(); end if;
 if not exists(select 1 from pg_trigger where tgname='accounts_updated_at') then create trigger accounts_updated_at before update on public.accounts for each row execute function public.set_updated_at(); end if;
 if not exists(select 1 from pg_trigger where tgname='transactions_updated_at') then create trigger transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at(); end if;
 if not exists(select 1 from pg_trigger where tgname='budgets_updated_at') then create trigger budgets_updated_at before update on public.budgets for each row execute function public.set_updated_at(); end if;
 if not exists(select 1 from pg_trigger where tgname='goals_updated_at') then create trigger goals_updated_at before update on public.goals for each row execute function public.set_updated_at(); end if;
 if not exists(select 1 from pg_trigger where tgname='recurring_updated_at') then create trigger recurring_updated_at before update on public.recurring_transactions for each row execute function public.set_updated_at(); end if;
 if not exists(select 1 from pg_trigger where tgname='reminders_updated_at') then create trigger reminders_updated_at before update on public.reminders for each row execute function public.set_updated_at(); end if;
end $$;

create or replace function public.recalc_goal_saved_amount() returns trigger security definer set search_path=public language plpgsql as $$
declare gid uuid; total numeric(14,2);
begin
 gid := coalesce(new.goal_id,old.goal_id);
 select coalesce(sum(amount),0) into total from public.goal_contributions where goal_id=gid;
 update public.goals set saved_amount=total,is_completed=(total>=target_amount),updated_at=now() where id=gid;
 if tg_op='UPDATE' and old.goal_id is distinct from new.goal_id then
  select coalesce(sum(amount),0) into total from public.goal_contributions where goal_id=old.goal_id;
  update public.goals set saved_amount=total,is_completed=(total>=target_amount),updated_at=now() where id=old.goal_id;
 end if;
 return coalesce(new,old);
end $$;

do $$ begin
 if not exists(select 1 from pg_trigger where tgname='goal_contributions_recalc') then
  create trigger goal_contributions_recalc after insert or update or delete on public.goal_contributions for each row execute function public.recalc_goal_saved_amount();
 end if;
end $$;

-- Owner-only RLS for browser access using the authenticated user's JWT.
do $$ declare t text; begin
 for t in select unnest(array['categories','accounts','people','transactions','split_transactions','split_participants','reimbursements','budgets','goals','goal_contributions','recurring_transactions','reminders','loans','loan_repayments']) loop
  execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;

do $$ declare t text; p text; begin
 for t in select unnest(array['categories','accounts','people','transactions','split_transactions','split_participants','reimbursements','budgets','goals','goal_contributions','recurring_transactions','reminders','loans','loan_repayments']) loop
  for p in select unnest(array['select','insert','update','delete']) loop
   execute format('drop policy if exists %I on public.%I',t||'_'||p,t);
  end loop;
  execute format('create policy %I on public.%I for select using(auth.uid()=user_id)',t||'_select',t);
  execute format('create policy %I on public.%I for insert with check(auth.uid()=user_id)',t||'_insert',t);
  execute format('create policy %I on public.%I for update using(auth.uid()=user_id) with check(auth.uid()=user_id)',t||'_update',t);
  execute format('create policy %I on public.%I for delete using(auth.uid()=user_id)',t||'_delete',t);
 end loop;
end $$;

-- Starter categories are created by the app per signed-in user.
-- If you do not want email confirmation during personal testing:
-- Supabase Dashboard -> Authentication -> Providers -> Email -> disable Confirm email.


-- MY BUDGET vNext migration
-- Safe additive migration for the current app. Existing transaction/account data is preserved.
-- Run this ONCE in Supabase SQL Editor before deploying the matching frontend.

create extension if not exists pgcrypto;

-- 1) Categories: allow a parent category to apply to both income and expense.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid='public.categories'::regclass
      and contype='c'
      and pg_get_constraintdef(oid) ilike '%type%'
      and pg_get_constraintdef(oid) ilike '%income%'
  loop
    execute format('alter table public.categories drop constraint if exists %I',c.conname);
  end loop;
end $$;
alter table public.categories drop constraint if exists categories_type_allowed;
alter table public.categories add constraint categories_type_allowed check(type in('expense','income','both'));

-- Add the shared "Both" parent for every existing user, without changing their data.
insert into public.categories(user_id,name,type,icon,color,is_active)
select u.id,'Both','both','🔄','#7666cf',true
from auth.users u
where not exists (
  select 1 from public.categories c
  where c.user_id=u.id and lower(c.name)='both' and c.type='both'
);

-- 2) Multiple-category allocation for one income/expense/split transaction.
create table if not exists public.transaction_categories(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 transaction_id uuid not null references public.transactions(id) on delete cascade,
 category_id uuid not null references public.categories(id) on delete restrict,
 amount numeric(14,2) not null check(amount>0),
 created_at timestamptz not null default now(),
 unique(transaction_id,category_id)
);
create index if not exists idx_transaction_categories_tx on public.transaction_categories(transaction_id);
create index if not exists idx_transaction_categories_category on public.transaction_categories(category_id);

-- Backfill the existing single category into the new allocation table.
insert into public.transaction_categories(user_id,transaction_id,category_id,amount)
select t.user_id,t.id,t.category_id,t.amount
from public.transactions t
where t.category_id is not null
  and not exists(select 1 from public.transaction_categories tc where tc.transaction_id=t.id);

-- 3) Goals: keep "existing amount" separate from future contributions.
alter table public.goals add column if not exists existing_amount numeric(14,2) not null default 0;
update public.goals set existing_amount=coalesce(saved_amount,0)
where coalesce(existing_amount,0)=0 and coalesce(saved_amount,0)>0;

create or replace function public.recalc_goal_saved_amount()
returns trigger security definer set search_path=public language plpgsql as $$
declare gid uuid; total numeric(14,2); base numeric(14,2);
begin
  gid:=coalesce(new.goal_id,old.goal_id);
  select coalesce(existing_amount,0) into base from public.goals where id=gid;
  select coalesce(sum(amount),0) into total from public.goal_contributions where goal_id=gid;
  update public.goals
    set saved_amount=coalesce(base,0)+total,
        is_completed=(coalesce(base,0)+total>=target_amount),
        updated_at=now()
    where id=gid;
  if tg_op='UPDATE' and old.goal_id is distinct from new.goal_id then
    select coalesce(existing_amount,0) into base from public.goals where id=old.goal_id;
    select coalesce(sum(amount),0) into total from public.goal_contributions where goal_id=old.goal_id;
    update public.goals
      set saved_amount=coalesce(base,0)+total,
          is_completed=(coalesce(base,0)+total>=target_amount),
          updated_at=now()
      where id=old.goal_id;
  end if;
  return coalesce(new,old);
end $$;

-- 4) Money Held: money belonging to another person temporarily held in your account.
create table if not exists public.money_held(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 person_id uuid not null references public.people(id) on delete restrict,
 amount numeric(14,2) not null check(amount>0),
 purpose text,
 account_id uuid references public.accounts(id) on delete restrict,
 received_date date not null default current_date,
 status text not null default 'pending' check(status in('pending','settled')),
 settled_date date,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_money_held_user_status on public.money_held(user_id,status);
create index if not exists idx_money_held_person on public.money_held(user_id,person_id);

-- Keep updated_at working.
do $$
begin
 if not exists(select 1 from pg_trigger where tgname='money_held_updated_at') then
   create trigger money_held_updated_at before update on public.money_held
   for each row execute function public.set_updated_at();
 end if;
end $$;

-- Keep updated_at working for loans and loan repayments as well.
do $$
begin
 if not exists(select 1 from pg_trigger where tgname='loans_updated_at') then
   create trigger loans_updated_at before update on public.loans
   for each row execute function public.set_updated_at();
 end if;
 if not exists(select 1 from pg_trigger where tgname='loan_repayments_updated_at') then
   create trigger loan_repayments_updated_at before update on public.loan_repayments
   for each row execute function public.set_updated_at();
 end if;
end $$;

-- RLS + browser grants.
alter table public.transaction_categories enable row level security;
alter table public.money_held enable row level security;

drop policy if exists transaction_categories_select on public.transaction_categories;
drop policy if exists transaction_categories_insert on public.transaction_categories;
drop policy if exists transaction_categories_update on public.transaction_categories;
drop policy if exists transaction_categories_delete on public.transaction_categories;
create policy transaction_categories_select on public.transaction_categories for select using(auth.uid()=user_id);
create policy transaction_categories_insert on public.transaction_categories for insert with check(auth.uid()=user_id);
create policy transaction_categories_update on public.transaction_categories for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy transaction_categories_delete on public.transaction_categories for delete using(auth.uid()=user_id);

drop policy if exists money_held_select on public.money_held;
drop policy if exists money_held_insert on public.money_held;
drop policy if exists money_held_update on public.money_held;
drop policy if exists money_held_delete on public.money_held;
create policy money_held_select on public.money_held for select using(auth.uid()=user_id);
create policy money_held_insert on public.money_held for insert with check(auth.uid()=user_id);
create policy money_held_update on public.money_held for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy money_held_delete on public.money_held for delete using(auth.uid()=user_id);

grant usage on schema public to authenticated;
grant select,insert,update,delete on table public.transaction_categories,public.money_held to authenticated;

-- Update reset RPC so Reset Data also clears the new tables.
create or replace function public.reset_my_budget_data()
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 delete from public.loan_repayments where user_id=uid;
 delete from public.loans where user_id=uid;
 delete from public.money_held where user_id=uid;
 delete from public.split_participants where user_id=uid;
 delete from public.split_transactions where user_id=uid;
 delete from public.goal_contributions where user_id=uid;
 delete from public.reimbursements where user_id=uid;
 delete from public.transaction_categories where user_id=uid;
 delete from public.transactions where user_id=uid;
 delete from public.recurring_transactions where user_id=uid;
 delete from public.budgets where user_id=uid;
 delete from public.goals where user_id=uid;
 delete from public.reminders where user_id=uid;
 delete from public.people where user_id=uid;
 delete from public.categories where user_id=uid;
 delete from public.accounts where user_id=uid;
end $$;
revoke all on function public.reset_my_budget_data() from public;
grant execute on function public.reset_my_budget_data() to authenticated;
notify pgrst,'reload schema';


-- =========================================================
-- My Budget vNext+ additive migration
-- Multiple account allocations, budget subcategories, recurring occurrences,
-- and partial Money Held settlements. Safe to run on existing data.
-- =========================================================

alter table public.budgets add column if not exists subcategory_id uuid references public.categories(id) on delete cascade;
alter table public.money_held add column if not exists settled_amount numeric(14,2) not null default 0;
update public.money_held set settled_amount=case when status='settled' then amount else coalesce(settled_amount,0) end where coalesce(settled_amount,0)=0;
do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.money_held'::regclass and conname='money_held_settled_amount_valid') then alter table public.money_held add constraint money_held_settled_amount_valid check(settled_amount>=0 and settled_amount<=amount) not valid; end if; end $$;

create table if not exists public.transaction_accounts(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 transaction_id uuid not null references public.transactions(id) on delete cascade,
 account_id uuid not null references public.accounts(id) on delete restrict,
 amount numeric(14,2) not null check(amount>0),
 created_at timestamptz not null default now(),
 unique(transaction_id,account_id)
);
create index if not exists idx_transaction_accounts_tx on public.transaction_accounts(transaction_id);
create index if not exists idx_transaction_accounts_account on public.transaction_accounts(account_id);

insert into public.transaction_accounts(user_id,transaction_id,account_id,amount)
select t.user_id,t.id,t.account_id,t.amount
from public.transactions t
where t.account_id is not null
  and t.type in('income','expense','split','reimbursement')
  and not exists(select 1 from public.transaction_accounts ta where ta.transaction_id=t.id);

create table if not exists public.recurring_occurrences(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 recurring_id uuid not null references public.recurring_transactions(id) on delete cascade,
 due_date date not null,
 status text not null default 'due' check(status in('due','recorded','skipped')),
 transaction_id uuid references public.transactions(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(recurring_id,due_date)
);
create index if not exists idx_recurring_occurrences_user_date on public.recurring_occurrences(user_id,due_date,status);

alter table public.transaction_accounts enable row level security;
alter table public.recurring_occurrences enable row level security;

drop policy if exists transaction_accounts_select on public.transaction_accounts;
drop policy if exists transaction_accounts_insert on public.transaction_accounts;
drop policy if exists transaction_accounts_update on public.transaction_accounts;
drop policy if exists transaction_accounts_delete on public.transaction_accounts;
create policy transaction_accounts_select on public.transaction_accounts for select using(auth.uid()=user_id);
create policy transaction_accounts_insert on public.transaction_accounts for insert with check(auth.uid()=user_id);
create policy transaction_accounts_update on public.transaction_accounts for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy transaction_accounts_delete on public.transaction_accounts for delete using(auth.uid()=user_id);

drop policy if exists recurring_occurrences_select on public.recurring_occurrences;
drop policy if exists recurring_occurrences_insert on public.recurring_occurrences;
drop policy if exists recurring_occurrences_update on public.recurring_occurrences;
drop policy if exists recurring_occurrences_delete on public.recurring_occurrences;
create policy recurring_occurrences_select on public.recurring_occurrences for select using(auth.uid()=user_id);
create policy recurring_occurrences_insert on public.recurring_occurrences for insert with check(auth.uid()=user_id);
create policy recurring_occurrences_update on public.recurring_occurrences for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy recurring_occurrences_delete on public.recurring_occurrences for delete using(auth.uid()=user_id);

grant usage on schema public to authenticated;
grant select,insert,update,delete on table public.accounts,public.categories,public.people,public.transactions,public.transaction_categories,public.transaction_accounts,public.budgets,public.goals,public.goal_contributions,public.split_transactions,public.split_participants,public.reimbursements,public.recurring_transactions,public.recurring_occurrences,public.reminders,public.loans,public.loan_repayments,public.money_held to authenticated;

-- Extend the reset RPC to clear allocation/occurrence rows first.
create or replace function public.reset_my_budget_data()
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 delete from public.recurring_occurrences where user_id=uid;
 delete from public.transaction_accounts where user_id=uid;
 delete from public.loan_repayments where user_id=uid;
 delete from public.loans where user_id=uid;
 delete from public.money_held where user_id=uid;
 delete from public.split_participants where user_id=uid;
 delete from public.split_transactions where user_id=uid;
 delete from public.goal_contributions where user_id=uid;
 delete from public.reimbursements where user_id=uid;
 delete from public.transaction_categories where user_id=uid;
 delete from public.transactions where user_id=uid;
 delete from public.recurring_transactions where user_id=uid;
 delete from public.budgets where user_id=uid;
 delete from public.goals where user_id=uid;
 delete from public.reminders where user_id=uid;
 delete from public.people where user_id=uid;
 delete from public.categories where user_id=uid;
 delete from public.accounts where user_id=uid;
end $$;
revoke all on function public.reset_my_budget_data() from public;
grant execute on function public.reset_my_budget_data() to authenticated;
notify pgrst,'reload schema';


-- vNext+Plus reliability patch: owner-checked browser RPCs for transaction edits and recurring occurrence bookkeeping.
create or replace function public.update_my_transaction(p_id uuid, p_patch jsonb)
returns public.transactions
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid:=auth.uid(); r public.transactions;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  update public.transactions
  set amount=case when p_patch ? 'amount' then (p_patch->>'amount')::numeric else amount end,
      description=case when p_patch ? 'description' then coalesce(p_patch->>'description','') else description end,
      transaction_date=case when p_patch ? 'transaction_date' then (p_patch->>'transaction_date')::date else transaction_date end,
      account_id=case when p_patch ? 'account_id' then nullif(p_patch->>'account_id','')::uuid else account_id end,
      category_id=case when p_patch ? 'category_id' then nullif(p_patch->>'category_id','')::uuid else category_id end,
      notes=case when p_patch ? 'notes' then nullif(p_patch->>'notes','') else notes end,
      to_account_id=case when p_patch ? 'to_account_id' then nullif(p_patch->>'to_account_id','')::uuid else to_account_id end,
      person_id=case when p_patch ? 'person_id' then nullif(p_patch->>'person_id','')::uuid else person_id end,
      goal_id=case when p_patch ? 'goal_id' then nullif(p_patch->>'goal_id','')::uuid else goal_id end,
      updated_at=now()
  where id=p_id and user_id=uid
  returning * into r;
  if r.id is null then raise exception 'Transaction not found or not permitted'; end if;
  return r;
end $$;
revoke all on function public.update_my_transaction(uuid,jsonb) from public;
grant execute on function public.update_my_transaction(uuid,jsonb) to authenticated;

create or replace function public.record_recurring_occurrence(p_occurrence_id uuid, p_transaction_id uuid)
returns public.recurring_occurrences
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  r public.recurring_occurrences;
  rid uuid;
  due date;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if not exists(select 1 from public.transactions t where t.id=p_transaction_id and t.user_id=uid) then
    raise exception 'Transaction not found or not permitted';
  end if;

  if p_occurrence_id is not null then
    update public.recurring_occurrences
       set status='recorded', transaction_id=p_transaction_id
     where id=p_occurrence_id and user_id=uid;
    select * into r from public.recurring_occurrences where id=p_occurrence_id and user_id=uid;
    if r.id is not null then return r; end if;
  end if;

  -- When the user taps Use directly from the calendar, an occurrence may not
  -- have been generated yet. Derive the recurring schedule and transaction date
  -- and create/record the occurrence atomically.
  select t.recurring_id, t.transaction_date into rid, due
    from public.transactions t
   where t.id=p_transaction_id and t.user_id=uid;

  if rid is null then return null; end if;
  if not exists(select 1 from public.recurring_transactions r0 where r0.id=rid and r0.user_id=uid) then
    raise exception 'Recurring schedule not found or not permitted';
  end if;

  insert into public.recurring_occurrences(user_id,recurring_id,due_date,status,transaction_id)
  values(uid,rid,due,'recorded',p_transaction_id)
  on conflict(recurring_id,due_date) do update
    set status='recorded', transaction_id=excluded.transaction_id
  returning * into r;
  return r;
end $$;
revoke all on function public.record_recurring_occurrence(uuid,uuid) from public;
grant execute on function public.record_recurring_occurrence(uuid,uuid) to authenticated;


-- Shared expense payer/settlement support (additive)
alter table public.split_transactions add column if not exists paid_by_person_id uuid references public.people(id) on delete restrict;
alter table public.reimbursements add column if not exists direction text not null default 'received';
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.reimbursements'::regclass and conname='reimbursements_direction_check') then
    alter table public.reimbursements add constraint reimbursements_direction_check check(direction in('received','sent'));
  end if;
end $$;
notify pgrst,'reload schema';
