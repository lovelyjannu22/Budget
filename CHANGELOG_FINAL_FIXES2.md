# Final fixes (this package)

1. **People card / Split amounts fixed.**
   The most recent `peopleBalances()` calculation had stopped returning the
   `splitPending`, `splitSettled`, `heldPending`, `heldSettled`, and
   `loanSent` fields that the People-tab cards read. As a result every
   person card showed **Split pending ₹0 / Held pending ₹0** no matter
   how much was actually outstanding. This is fixed — those fields are
   now calculated again from `split_participants` and `money_held`, so
   the People tab and the top "Split pending / Held / They owe you"
   summary show the correct live amounts.

2. **Money Held, Split, and Lend/Borrow in the Transactions tab.**
   Verified end‑to‑end (including an automated headless test against the
   real code, not just a visual check): the Transactions tab's "All"
   view already merges Money Held, Loans/Lend‑Borrow, and Split entries
   into the same list as ordinary income/expense/transfer rows, each
   with its own **Edit** and **Delete** buttons wired to the same
   functions used on the dedicated Money Held / Lend & Borrow pages
   (`editMoneyHeld`/`deleteMoneyHeld`, `editLoan`/`deleteLoan`,
   `editLoanRepayment`/`deleteLoanRepayment`). Editing or deleting from
   the Transactions tab calls the app's normal `render()` refresh, so
   the change is immediately reflected on the Money Held and Lend/Borrow
   pages too (they all read the same underlying data). There are also
   two quick chips — **Held for others** and **Lend / Borrow** — next to
   the type filters if you want to see just those.
   If you were not seeing these before, it was very likely a stale
   cached copy of `app.js` in the browser. `index.html` now loads
   `app.js?v=20260919b` (a new query string) to force a fresh download —
   do a hard refresh (or reinstall the PWA) after updating.

3. No other behaviour changed.
