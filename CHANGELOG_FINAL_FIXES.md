# Final fixes in this package

1. **Split transaction save bug fixed** — Choosing a top-level category in the
   Expense/Split category picker now correctly registers the selection right
   away. Previously, if you picked a parent category and left the
   auto-selected "Use X directly" subcategory option untouched, the app
   silently blocked saving with "Please select a category," even though the
   dropdown looked filled in. This was the main reason split transactions
   (and possibly some expense entries) wouldn't save.

2. **Budget sort buttons now work** — replaced with a simple, dependable
   up/down reordering system (own storage key, own click handling),
   independent of the earlier sort code.

3. **Budget cards** now show "Remaining · before split" and
   "Remaining · after split" instead of the old split-details box. Full
   split breakdowns (who paid, per-person shares, etc.) now only show on the
   Split tab. Money someone else paid on your behalf is still not deducted
   from your account balance until you record a repayment.

4. **Categories tab** now opens to a list of your existing categories first,
   with a "＋ New category" button that opens the creation form separately.

5. **Added a direct "＋🔀 " Split button on the Transactions tab** so you don't
   have to go to Home or the Split tab to log a split bill.

All changes are appended near the end of app.js as a clearly marked final
patch block, so nothing earlier in the file was removed — only one small,
surgical fix was made directly to the existing category-dropdown code
(described in #1).

## Follow-up fix (this build)

Found and fixed the actual reason the Split button did nothing when tapped:
opening a **new** split bill computed a fallback date using a helper
(`localDate`) that crashed on an empty value before it ever got to the
real fallback (`today()`). The crash happened silently while the button's
click was being handled, so the popup never appeared and nothing was
logged for you to see. This has been fixed and verified by actually
running the app's code and simulating a real click end-to-end (the popup
now opens, and a full add-and-save round trip completes with no errors).

## Second follow-up fix (this build)

Found a mismatched-label bug: the budget progress bar/badge color logic
produced status labels ("good"/"near") that didn't match any of the actual
CSS color rules (which only exist for "low"/"mid"/"full"/"over"). Practical
effect: budget progress bars and percentage badges showed only a bare/
default color for anything under 100% used, instead of the intended
green-under-budget / amber-getting-close look; only "over budget" (red) was
showing correctly. Fixed by aligning the status labels to the existing CSS
names.

## Improvement added in this build

**Global error safety net:** if something unexpected still goes wrong
anywhere in the app (a bug we haven't seen yet), you will now see a small
"Something went wrong with that action. Please try again." message instead
of the screen doing nothing. This is exactly the kind of protection that
would have made the earlier Split-button bug obvious immediately instead
of looking like a dead button. Full technical details are still logged to
the browser console (press F12 → Console) for troubleshooting if needed.

**Verification performed:** re-tested every "Add new" and "Edit" flow in
the app (Expense, Income, Transfer, Split, Category, Person, Goal, Loan,
Account, Budget, Reminder, Recurring, Money Held) by simulating each one
programmatically end-to-end — all open and submit without errors.
