# Final Transaction / Budget / Filter Fix

Base: user-uploaded latest My Budget package `48250ded-3019-46a5-a931-2874a055572b.zip`

## Changes
- Budget split logic:
  - Remaining Before Split uses normal expenses plus settled split share/repayments.
  - Remaining After Split adds unsettled amounts owed to the user and subtracts unsettled amounts the user owes.
  - Split payer direction is respected.
- Transaction ledger:
  - All includes loan/borrow records and loan repayments.
  - Money Held settlement is rendered as its own ledger event.
  - Ledger ordering uses Recorded timestamp first.
- Transaction filters:
  - Parent category filter is robust.
  - Added subcategory filter.
  - Recurring filter returns only transactions with a recurring link.
- Mobile transaction icons:
  - Uses visible text symbols (+, −, ⇄, ÷, ↩, ↗, ↙) instead of emoji-only icons.
  - Explicit mobile CSS keeps the icon bubble visible.
- Existing Edit/Delete/Settle/Undo actions preserved.
