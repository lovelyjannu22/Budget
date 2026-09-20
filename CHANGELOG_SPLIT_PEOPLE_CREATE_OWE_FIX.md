# Split "you owe" in People + Create button in Transactions

## 1. "Split I owe them" was missing from the People overview
- The summary card at the top of People never included what you owe from splits:
  "You owe" and "To pay" only counted loans, so a split paid by someone else showed ₹0.
- Added a **Split you owe** tile, and **To pay** now = split you owe + loans you owe.
  The two loan tiles are labelled "Loans: they owe you / Loans: you owe" so they are not confused with splits.
- Person cards show both directions when both exist ("They owe you ₹X · You owe them ₹Y") and
  have a new "Split you owe" metric.
- The Home page tiles use the same numbers ("To pay" includes split amounts you owe).
- A payer's own participant row is no longer counted as money that person owes you.
- Splits whose payer was saved only in `split_transactions.paid_by_person_id` are now recognised
  everywhere, and recording a repayment for them no longer fails with "cannot exceed outstanding ₹0".

## 2. Create button on split transactions in the Transactions tab
- Split rows in the Transactions tab now have the same **＋ Create / ↶ Undo** button as the Split tab.
  Normal expenses, income, transfers etc. do not get it. The Home "recent" list does not get it either.
- The Split tab and Transactions tab share one saved state (the Split tab was reading a different
  storage key, so its button never flipped). Marks saved by the previous build are kept.
- The Split tab **Edit** button called a function that did not exist; it now opens the split editor.

## 3. Settled amounts on Split cards / Settle button
- Split cards ignored repayments already received or sent (e.g. "Others owe you ₹750" after ₹750 was
  repaid). All screens (People, Split, Home, Budget) now use one settlement calculation:
  repayments are applied to that person's splits oldest first.
- The Settle button pre-fills the same outstanding amount that the card shows.

No SQL changes. `index.html` loads `app.js?v=20260920b`; hard refresh (Ctrl+F5) after replacing files.
