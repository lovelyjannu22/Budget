## v14 — Mobile transaction entry forms
- Made Income, Expense, Transfer, Split and Recurring entry forms responsive on phones.
- Removed horizontal overflow by stacking grouped fields on small screens.
- Improved split-person rows and touch targets for narrow screens.
- Preserved existing transaction calculations and Supabase logic.

## v10 latest UI fixes
- Calendar recurring heading matches Reminders size.
- Split pending amount uses the same orange as Money held.
- To pay amount uses the same red as You owe.
- Budget card Spent/Budget/Remaining amounts have stronger highlighted blocks.

# My Budget vNextPlus — v7

## Latest fixes
- Calendar recurring heading reduced to match the Reminders heading.
- Home "To receive" and "To pay" are forced onto the same row on desktop/tablet; responsive fallback remains for narrow screens.
- Removed the visible Saving/Updating busy-message concept completely. Operations continue normally without the intrusive overlay.
- Previous v6 functionality retained, including budget amount highlighting and recurring-use fixes.


## v8
- Fixed package root/name so it is no longer packaged under the v5 folder name.
- Fixed final requested UI overrides.
- Removed busy Saving/Updating/Deleting overlay behavior.

## v9 — final UI polish
- Calendar recurring heading now uses the same 18px heading treatment as Reminders.
- Home people metrics use a six-column desktop grid so To receive and To pay stay on the same row.
- Budget amount blocks have stronger visual highlighting and clearer amount typography.
- Saving/Updating busy-banner concept remains fully disabled; normal success/error toasts are retained.

## v13 mobile transaction + calendar heading polish
- Calendar recurring heading matches the Reminders/Transactions heading scale and uses a distinct blue color.
- Calendar Reminders remain amber and Transactions remain purple.
- Transaction rows now use a mobile-safe layout with constrained content, wrapped text, and wrapped action buttons to prevent horizontal page movement on phones.
- The mobile transaction fix applies to Home, Transactions, Split, and Calendar transaction logs because they share the transaction renderer.


## Transaction chronology and account balance
- Transactions now sort by recorded timestamp (`created_at`) rather than transaction date.
- Transaction list shows one Recorded date/time plus the Updated timestamp.
- Added account-specific running balance after each recorded transaction.
- Account filtering now includes transfers where the selected account is the destination (`to_account_id`).
- Added updated_at triggers for loans and loan repayments.

## Final performance + ledger hardening
- Unified Transactions → All now always includes normal transactions, Split, Lend/Borrow, loan repayments, and Money Held records.
- Every special ledger row has Edit/Delete actions (Money Held also has Settle/Undo where applicable).
- Account balances are recalculated from the current in-memory ledger after CRUD operations, so edits/deletes immediately affect displayed amounts.
- Split edits preserve amounts already repaid and reject reducing a participant's share below their paid amount.
- Categories are grouped explicitly into Parent categories & subcategories, with standalone categories separated.
- Login now renders after the critical data set loads and finishes secondary data in the background.
- Create/Edit/Delete operations refresh only affected Supabase tables instead of reloading the entire database.
- Added transaction count to the Transactions page.

- Added Shared Expense "Paid by" support: Me or Someone Else; someone-else-paid expenses count toward the user share/budget without reducing a bank account until repayment. Settlements support Receive/Repay directions.


## Sorting v3 validation/update
- Added persistent card ordering controls (up/down + long-press drag) for Goals, Reminders (Pending/Completed independently), Lend & Borrow, Money Held, and Split Bills.
- Preserved Accounts and People native sorting and immediate re-render behavior.
- Restored/validated Budget parent and subcategory ordering controls and long-press drag.
- Added parent/subcategory sorting controls to the Categories modal while preserving hierarchy.
- Sorting order is stored per signed-in user/device in localStorage.
- JavaScript syntax validated with Node.js.
