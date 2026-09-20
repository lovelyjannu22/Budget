# Budget settlement + parent/subcategory filter fix

## 1. Budget card still showed a settled amount as "Unsettled"
Money received back from someone is saved per person in `reimbursements`
(it is not written into `split_participants.amount_paid`). The Budget card only
looked at `amount_paid`, so a bill you already collected (e.g. ₹750) still showed
"Unsettled: +₹750 receivable", even though the People tab correctly showed ₹0.

- Budget now applies the reimbursements received from each person to their split
  shares (oldest split first), the same basis the People tab uses.
- Partial payments work: ₹400 received of ₹750 shows "+₹350 receivable".
- "Repay to them" (direction = sent) does not settle money owed *to you*.
- When every shared amount in a budget is settled, the card shows
  "✓ All shared-bill amounts settled". Budgets with no split activity no longer show
  the "Unsettled: no receivable · no payable" line.

## 2. Parent category / subcategory not working (Transactions filter)
- Choosing a Parent category threw `categoryKeyMatch is not defined`: the helper was
  defined inside a different closure than the final Transactions renderer, so the filter
  silently did nothing (it appeared to keep showing everything). It is now defined where
  it is used and matches a parent to all of its subcategories.
- The Subcategory dropdown in the filter now follows the selected Parent
  (Parent = Food lists only Food's subcategories). With no Parent it lists all
  subcategories as "Parent → Sub".

## 3. Also fixed: "Record repayment" modal crashed
The Receive / Repay selector was being inserted outside the form, which threw an error when
the modal opened and left "Repay money to them" unavailable. It is now inside the form, so
both directions can be recorded and the Amount/Account labels update accordingly.

## Housekeeping
- `index.html` now loads `app.js?v=20260920a` so browsers fetch the new file.
  Do a hard refresh (Ctrl+F5) after replacing the files.
- No SQL changes. Nothing to re-run in Supabase.
