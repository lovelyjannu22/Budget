# Unified All-Transactions Ledger & Balance Fix

- All Transactions now includes normal transactions plus Split, Lend/Borrow, Loan Repayments, and Money Held records in the same chronological list.
- Special rows retain Edit/Delete (and Settle/Undo for Money Held).
- Lend/Borrow and loan-repayment rows now appear in All, not only under the special filter.
- Special transactions show the account balance after the transaction when an account is involved.
- Splits paid by someone else explicitly show that there is no account movement at the time of the split.
- Existing CRUD functions and financial tables were preserved.
