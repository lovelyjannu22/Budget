# Settle button fix (final)

## 1. "Something went wrong with that action" when clicking Settle

Two separate bugs were stacked on top of each other:

**a) The real error was being hidden.**
When a save failed, the app correctly showed a specific error toast (e.g.
"Repayment cannot exceed outstanding ₹0.00"), but the code then re-threw the
error. Nothing caught that re-thrown error, so it became an unhandled
promise rejection. A global safety-net handler (added in an earlier fix) saw
that rejection and immediately overwrote the toast with a generic
"Something went wrong with that action. Please try again." — so you only
ever saw the unhelpful generic message, never the real reason. This is now
fixed: the specific message stays on screen, and the generic fallback only
appears for genuinely unexpected errors that nothing else already reported.

**b) The most likely real error underneath: a missing database column.**
Newer builds save a `direction` (received vs. repaid) on every repayment.
If your Supabase database was created before that feature was added and the
full SQL script was never re-run, the `reimbursements` table doesn't have
this column yet, and Supabase rejects the save with a schema-cache error.
The app now automatically falls back to saving without that column when
you're **receiving** money (exactly your Sandy/₹49.50/Cab example), so
Settle works immediately, no database change required.

If you ever use "Repay money to them" (you owe someone) and your database
is still missing the column, you'll now get a clear message asking you to
run **MIGRATION_ADD_DIRECTION.sql** in the Supabase SQL editor — this is
needed for that direction specifically, so it isn't silently recorded
backwards. Running it is quick and safe (`add column if not exists`).

## 2. Split transactions had no Settle button outside the Split tab

The dedicated Split tab always had a Settle button on each card. The same
split shown as a normal transaction row — in the Transactions tab (filtered
to "Split"), or in "All" — only had Edit/Delete. Both places now show a
Settle button whenever there's an outstanding amount, using the exact same
calculation as the Split tab, so the numbers always agree.

## Housekeeping
- `index.html` now loads `app.js?v=20260920d`. Hard refresh (Ctrl+F5 /
  Cmd+Shift+R) after replacing the files, or clear the site's cache if it's
  installed as a PWA.
- Optional but recommended: run `MIGRATION_ADD_DIRECTION.sql` in your
  Supabase SQL editor once, at your convenience.
