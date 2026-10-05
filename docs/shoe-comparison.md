# Shoe comparison (web v1)

Select up to three shoes from recommendation or saved cards. The bottom selection bar opens comparison once two shoes are selected. On phones, comparison is also available in More; on desktop it has a sidebar link. Remove an individual selection using its chip, or clear the basket.

The browser stores snapshots in `fys.compare`. Refreshing preserves the basket. Blocked storage falls back to memory for the current page session. Comparison does not create server records, call AI, or refresh the catalogue. There is no separate saved-comparison history in this version.

The table separates list/reference prices from recently observed Korean selling prices. Selling-price observations must be no more than seven days old; older, future-dated or unavailable observations display as unconfirmed. Explicit out-of-stock observations are labeled separately. Overseas list prices never establish Korean budget affordability.

Weight, measurement basis, drop, cushioning, width and use cases are shown without inferring missing specifications. Weight ranges are summarized only when every selected shoe has a numeric weight and the same known measurement basis. Drop is descriptive, not a quality ranking. Conditions and budget status refer to the search at selection time, and saved-list selections have no recommendation context. Different searches may have different preferences.

The table scrolls horizontally on narrow screens and keeps row labels fixed. Korean/English and light/dark themes are supported. Existing favorite, add-to-my-shoes and AI-comment actions remain independent.

`web/e2e/compare.test.mjs` covers selection limits, persistence, removal, saved cards, malformed or blocked storage, stale prices, missing specifications, safe links, themes and mobile overflow. These tests intercept recommendation and explanation requests and never call paid AI.
