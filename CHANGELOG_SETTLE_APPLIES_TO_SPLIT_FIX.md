# Settle now applies to the split you clicked

## Cause
Repayments are stored per person and were applied to that person's oldest unpaid split first.
Clicking Settle on a newer split (e.g. Cab, Rs 49.50) therefore reduced an older split (e.g. Lunch)
instead, so the split you clicked still looked unsettled and the People cards only showed a lower total.

## Changes
1. **"Applies to split" field** on every repayment/settle form. The Settle button pre-selects its split.
   The choice is stored on the settlement's ledger transaction (`transactions.related_transaction_id`,
   an existing column - no SQL needed). That split is paid first; any overpayment, and settlements with
   "Oldest unpaid split first", spill to the oldest unpaid split as before.
2. **Fixing old settlements:** Transactions -> Reimbursement filter -> Edit -> pick the right split.
   Settlements recorded before this build stay "oldest first" until edited.
3. **Settle / "Settled" button on split rows in the Transactions tab** (it never appeared on normal split rows).
4. **People cards:** new "Split you repaid" tile (only when > 0) for splits someone else paid; the summary's
   "Split settled" now includes it.
5. **Budgets** use the same per-split settlement numbers as the Split tab and People.
6. **No half-saved settlements:** if the reimbursement row fails to save (e.g. missing `direction` column),
   the ledger transaction created just before it is now removed, so retries no longer pile up and change
   account balances.

## Housekeeping
- `index.html` loads `app.js?v=20260920f`. Hard refresh (Ctrl+F5) after replacing the files.
- Run `MIGRATION_ADD_DIRECTION.sql` once if you use "Repay money to them".
