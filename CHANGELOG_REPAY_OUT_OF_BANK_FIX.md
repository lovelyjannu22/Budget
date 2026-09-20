# Paying someone you owe now takes money OUT of the bank account

## Cause
A repayment you send ("Repay money to them") was saved correctly as `sent` on the reimbursements table,
but the matching ledger transaction has no direction column. Every balance/ledger calculation therefore
treated all `reimbursement` transactions as money coming IN, so paying Ravi Rs 100 raised the account by
Rs 100 (and showed "+Rs 100" in the ledger).

## Changes
- On load/refresh, each reimbursement transaction is tagged with its direction from the reimbursements table.
- Account balances, Home/Accounts totals, the ledger sign/colour/icon and the per-account effects used for
  balance-after now treat a sent repayment as money out. Received repayments still add.
- Existing repayments are corrected automatically - no data change or SQL needed.
- Editing an already-applied repayment no longer fails with "Repayment cannot exceed outstanding Rs 0"
  (its own amount is now given back before the limit is checked).

`index.html` loads `app.js?v=20260920g`. Hard refresh (Ctrl+F5) after replacing the files.
