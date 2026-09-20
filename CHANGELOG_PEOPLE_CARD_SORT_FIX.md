# People card cleanup + sorting that no longer resets

## 1. People cards: duplicate lines removed
Removed from every People card (overview and Home):
- the status line ("You owe them ₹X" / "They owe you ₹X" / "Settled")
- the "Split you should get / Split you owe" line

The tiles underneath (Split pending, Split you owe, Lent/Borrowed outstanding ...) already show the same
figures. This also removes a bug in that extra line: it was attached to cards by position, so after
re-ordering people it could show another person's amount (e.g. ₹0 on the card that actually owed ₹1,016).

## 2. Sorting resetting
Two screens had lost their sortable version in earlier patches, so anything arranged there was ignored
the next time the screen redrew (refresh, or any change in the app):
- **Split tab** - cards now have the ↑ ↓ / drag controls again and keep their order. Existing saved
  orders are reused. A brand-new split shows at the top; the rest keep your order.
  The Create / Settle / Edit buttons are unchanged.
- **Categories list** - parents and subcategories are sortable again and keep their order.

Sorting on People, Goals, Accounts, Reminders, Lend/Borrow, Money Held and Budgets was tested through
refresh and after adding/editing items and stayed in place.
Note: the order is saved in the browser you use (like the rest of the app's local settings), so a different
browser/device, private window, or cleared site data starts with the default order.

No SQL changes. `index.html` loads `app.js?v=20260920c`; hard refresh (Ctrl+F5) after replacing files.
