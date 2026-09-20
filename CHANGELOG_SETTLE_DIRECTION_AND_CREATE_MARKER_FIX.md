# Settle error (real cause) + Create marker persistence

## 1. "Could not find the 'direction' column of 'transactions'"

Now that the previous fix stopped the error message from being hidden, the
real cause was visible: saving a repayment sent a `direction` field to the
**`transactions`** table update/insert — but `direction` was only ever meant
to be a column on **`reimbursements`**. No database has (or needs) a
`direction` column on `transactions`, so every single repayment/settle save
failed with this schema error, for everyone, regardless of which database
version they were on.

Fixed at the source: the object sent to `transactions` no longer includes
`direction`; the object sent to `reimbursements` still does, exactly as
before. Settle and Save repayment now work normally. (The previous
fallback for an old `reimbursements` table without the `direction` column
is still in place as a safety net, but was not the actual cause here.)

## 2. "+ Create" marker resetting after refresh / after a new deployment

The ✚ Create / ↶ Undo marker on split rows was stored only in the browser's
`localStorage`. That works for simple refreshes in the same browser, but
does **not** survive: a different browser or device, a private/incognito
window, clearing site data, or any hosting/preview setup that doesn't keep
localStorage between loads — which matches what you were seeing.

This marker is now saved to the database (a new `phonepe_created` column on
`split_transactions`), the same way every other change in the app is saved,
so it persists properly everywhere and survives new deployments. If your
database hasn't run the migration below yet, the app automatically falls
back to the old local-only behavior, so nothing breaks in the meantime.

**Action needed:** run `MIGRATION_ADD_PHONEPE_CREATED.sql` in your Supabase
SQL editor once, so the Create marker starts persisting properly. It's a
one-line, idempotent `add column if not exists` — safe to run anytime.

## Housekeeping
- `index.html` now loads `app.js?v=20260920e`. Hard refresh (Ctrl+F5 /
  Cmd+Shift+R) after replacing the files.
- Run both `MIGRATION_ADD_PHONEPE_CREATED.sql` and, if you haven't already,
  `MIGRATION_ADD_DIRECTION.sql` in Supabase. Neither is strictly required
  for the transactions-table fix above, but both make the app fully robust
  going forward.
