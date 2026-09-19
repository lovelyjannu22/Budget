# Split payer implementation

The Split workflow stores the payer for a split bill in `transactions.person_id` for `type='split'`.

- `NULL` means the current user paid.
- A person UUID means that person paid.

This intentionally avoids requiring `split_transactions.paid_by_person_id`, so the app works with an existing Supabase database where that column has not been added/refreshed in PostgREST.

For a split paid by another person, the transaction has no account allocation and only the current user's share is written to `transaction_categories`. Therefore the user's budget increases by their share while the user's account balance is unchanged until a repayment is recorded.

For a split paid by the current user, the full bill is allocated to the selected account and only the current user's share is allocated to the budget.

No database migration is required for this implementation because `transactions.person_id` already exists in the supplied schema.
