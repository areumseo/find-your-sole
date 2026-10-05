# Catalogue and price updates

Reviewed `shoes_data.json` remains the recommendation source of truth. PostgreSQL stores a mirror of those approved records, official-store price history, and collection failures awaiting review. Cron never changes specs, categories or scores. It does not scrape on a visitor's request and makes no AI calls.

## First batch

Ten LeMouton walking/daily models: Walk, Mate, Buddy, Forest, Style 2, Classic 2, Wallaby, Up, Everyday and Easy. Their official product URLs, product-group IDs and names are pinned in the catalogue. Korean list prices and weights were checked on 2026-10-05. Weights are for size 230 mm; do not compare them as if all brands used the same size. Drop, width, cushioning grade, arch support, pronation and weekly running-distance suitability are not inferred. Unknown specs receive no matching bonus or mismatch penalty.

The base score of 65 is an editorial starting score, not a measured quality rating. These shoes are eligible only for walking/daily searches, never running or trail.

## Deploy after merging

1. Deploy the API and static site from main.
2. Create a Render **Cron Job** for this repository, same region as the existing PostgreSQL database. Leave Root Directory empty (repository root).
3. Build command: `pip install -r api/requirements.txt`
4. Start command: `python -m api.catalog_sync`
5. Schedule: `0 21 * * *` (UTC; daily 06:00 Korea). A reference service is included in `render.yaml`.
6. Set `DATABASE_URL` on the Cron Job to the **same database** already used by the API. Use Render's internal connection URL for the same region; do not copy secrets into Git or chat.
7. Click **Trigger Run** once. It creates only `shoe_catalog`, `shoe_price_history` and `shoe_review_queue`, then imports reviewed JSON and collects prices. Existing feedback is untouched.
8. After a successful run, add `CATALOG_PRICES_ENABLED=1` to the API and redeploy. Recommendations read recent observations with a five-minute cache. Without this flag, missing tables, or a failed DB read, the app continues with the JSON catalogue.

Cron services are metered with a minimum monthly charge (currently $1/service), not a guaranteed flat $1 total. Do not provision a second database for this job.

## Collection and review

- Official LeMouton product JSON-LD only, with exact product-group ID, title, brand and variant SKU matches; only KRW in-stock variant prices are accepted.
- The job checks robots.txt, restricts the source host/path, does not follow redirects, limits response size/time, and waits one second per product. Failures return a nonzero job result for Render's monitoring and create a deduplicated review item. Successful products are saved even if others fail.
- Selling price and availability are displayed separately from **Korean list price**. They do not change budget status or scoring. Prices may vary by size/color; no shipping, coupons or membership discount guarantees. No promise of size-specific stock.
- Observations older than seven days are not displayed. History is retained for 90 days. Failures preserve prior valid observations until they expire; a confirmed out-of-stock observation supersedes the old in-stock price.
- Run `python -m api.catalog_sync --dry-run` to check live sources without DB writes.
- Run `python -m api.catalog_sync --reviews` in a trusted environment with the database connection configured to list items needing review.
- After checking the source and correcting reviewed data, run `python -m api.catalog_sync --resolve-review ID` to mark the queue item resolved.
- New models or changed specs: verify the official page, edit the JSON with sources and check date, run catalogue/API tests, then open a PR. Collection failures are not automatically approved. There is no automated new-model discovery in this first version.
- Other brands need a separately tested adapter and reviewed source mapping. Naver shopping search is a possible next adapter, but requires its own API credentials/usage review and exact model/variant matching. Existing Naver news credentials are not assumed to work for shopping.

## Local verification

From the repository root:

```sh
python -m pytest api/tests
python tools/validate_shoes.py
DATABASE_URL=sqlite:////tmp/fys-catalog.db python -m api.catalog_sync
```

SQLite is for local storage tests only. Never put a production connection URL in a command saved to the repository. Price parser/storage tests mock official responses and do not call paid services.
