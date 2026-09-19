# Split-aware Budget Fix

- Budget spending for payer-aware split allocations no longer double-scales the user's share.
- Budget cards now show split details for the selected budget period/category:
  - split bill total
  - user's share
  - share paid by the user
  - share paid by others
  - spending before split shares
  - spending after split shares
- Existing transaction/account logic was not changed by this patch.
- The split payer continues to be derived from `transactions.person_id`; no `paid_by_person_id` column is required.
