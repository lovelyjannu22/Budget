# My Budget vNext+ v8 — Local Test Package

## Important
This is a new test build. Use it first with a separate Supabase TEST project. This package is a clean test build and does not require changing your production/current project. The included SQL is the only SQL file you need to run.

### Supabase
1. Open Supabase SQL Editor for your TEST project.
2. Run the complete `my_budget_vnext_plus.sql` from the first line to the last line.
3. The SQL includes the complete current schema, RLS, browser grants, multiple-account allocations, budget subcategories, recurring occurrences, and partial Money Held settlement support.
4. It is additive for an existing My Budget database and preserves existing rows. For a completely fresh test project it creates the schema from scratch.

### Local app
Open `index.html` from PyCharm using **Open in Browser**. Do not double-click the HTML file.

On the login page, open **Supabase connection settings** and enter the TEST project's Project URL and Publishable/anon key. Never use a service-role/secret key in the browser.

### Main changes in this package
- Clear Saving/Updating/Deleting progress and success/error messages.
- Budget Category + Subcategory with subcategories filtered by selected parent.
- Multiple categories and multiple accounts for income, expense and split transactions; allocation totals are validated.
- Goals show percentage beside progress and Existing/Saved/Target/Remaining below it.
- People is a consolidated view of split, held, lend/borrow and repayments, with direction made explicit.
- Money Held supports full and partial settlement, settlement date, and correct balance treatment.
- All pending reminders appear on Home. Calendar shows reminder and recurring indicators. Dedicated Reminders page separates Pending and Completed.
- Home quick actions include Expense, Income, Transfer, Split, Held and Lend/Borrow.
- Transactions support Edit/Delete consistently and filters for date, type, category, account, person, description and special records.
- Lend/Borrow cards explicitly label LEND and BORROW and use labeled Edit/Delete actions.
- Recurring uses Schedule -> Due occurrence -> Actual transaction. Due items do not become real transactions until Use is selected and saved. Use keeps the selected occurrence date.
- Daily, weekly, monthly and yearly recurring schedules are supported.
- PDF export is redesigned as a multi-section professional report with vector bar charts and all major data sections, including all transactions.
- Excel export includes the new allocation and recurring-occurrence tables.

### Recurring behavior
A recurring schedule is a rule, not a transaction. When a due date arrives, a due occurrence is created. It appears on the calendar and Recurring page. Use opens the normal transaction form with that occurrence's date. Saving the transaction records that occurrence. Future dates remain scheduled.

**Generate due items** creates missing due occurrences for schedules whose due date has arrived. It does not itself create an income/expense/transfer transaction.

### Data safety
The new schema adds tables/columns rather than deleting existing transactions. The test project should still be kept separate from any production My Budget project while validating the new build.


## Fixed build notes
- Supabase, Chart.js, XLSX, jsPDF and the app now load deterministically with `defer`; the app no longer races its dependencies.
- Startup/render re-entry is guarded to prevent accidental render recursion and `Maximum call stack size exceeded`.
- Recurring occurrence actions preserve the selected occurrence date; choosing a recurring item no longer silently replaces it with today.
- The SQL includes compatibility upgrades for an already-created recurring-transactions table.
- The included `start-local.bat` uses Windows PowerShell and does not require Python.


### Important vNext+Plus behavior
- Run `my_budget_vnext_plus.sql` once in the TEST Supabase project. It includes the current schema plus the budget subcategory field.
- Do not rerun older migration files on top of this package unless specifically instructed.
- Recurring schedules create due occurrences; they do not automatically post money as transactions. Use a due occurrence to create the actual transaction.
- Transaction entry uses one account only. Multiple Categories remains optional.
- The `transaction_accounts` table is retained only for compatibility with older test data and is not part of the user-facing multiple-account feature.


## Latest reliability/UI patch
- Budget percentage is larger and visually aligned with goal percentages.
- People detail metrics use 4 columns x 2 rows on desktop.
- Calendar separates reminders and transactions for the selected date.
- Accounts are grouped by account type with highlighted income, spent and balance.
- Recurring-use bookkeeping no longer blocks transaction creation; the SQL package includes owner-checked RPCs.
- Busy status appears only for actions that take longer than a short threshold.
- People dashboard uses To receive / To pay; Money held remains separate.

## v3 test note
For this build, run the included `my_budget_vnext_plus.sql` completely in the separate TEST Supabase project before testing the recurring **Use** action. The recurring-use fix is database-backed and is designed to work even if you did not press **Generate due items** first.

## v5 test notes
1. Run the included `my_budget_vnext_plus.sql` against the TEST Supabase project.
2. Open the package locally using the included local server script or PyCharm's local server.
3. For recurring testing, create an Expense recurring item with an account and category/subcategory.
4. Open Calendar on its due date and click `Use`.
5. The resulting transaction must be a NEW transaction on the selected date. It must not update the recurring template and must not show `Please select an account` when an account is selected.
6. Test recurring Transfer separately with both From and To accounts.


## v8 final UI fixes
- Recurring-on-date heading matches the Reminders heading size/style.
- To receive and To pay are kept on one row on desktop.
- Budget Spent/Budget/Remaining amounts are highlighted consistently.
- Saving/Updating/Deleting busy overlay has been removed completely.

Budget now groups by parent category and supports independent parent/subcategory ordering; People and other card arrows immediately re-render in the selected order.
