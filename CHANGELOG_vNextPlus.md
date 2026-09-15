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
