# Final Filter + Money Held Settlement Fix

- Parent category filtering now resolves subcategories robustly.
- Subcategory filtering uses string-safe category IDs.
- Money Held original transaction now derives settled state from both status and settled_amount.
- A fully settled Money Held record displays Undo instead of Settle.
- Partial/pending Money Held remains Settle.
- Existing Recorded/Updated timestamp behavior is preserved.
