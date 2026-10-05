# Find Your Sole: working agreements for coding agents

Shoe recommendation service for running shoes and everyday walking/comfort shoes (not fashion sneakers).
Users are in Korea. Korean is the primary language; English is supported everywhere.
This file is read by every coding agent (Claude Code, Codex). `CLAUDE.md` points here.

## Layout

| Path | What it is |
|---|---|
| `web/` | Vite + TypeScript web app, no framework (tiny `h()` DOM helper). Deployed as a Render Static Site. |
| `api/` | FastAPI backend (Render web service). Rule-based scoring, Claude Haiku explanations, news, feedback. |
| `shoes_data.json` | The shoe catalogue (74 shoes). Single source of truth, read by `api/main.py`. |
| `flutter_app/` | The iOS app. Do not touch unless asked. |
| `web/e2e/` | Playwright browser tests. `tools/validate_shoes.py` validates the catalogue. |

Production: web at `https://findyoursole.app`, API at `https://find-your-sole.onrender.com`. Both deploy from `main`.

## Commands

Run each command from the directory in the **Run from** column (`<repo>` is the repository root).

| Run from | Command | What it checks |
|---|---|---|
| `<repo>` | `pip install -r api/requirements-dev.txt` | one-time: API and test dependencies |
| `<repo>` | `python -m pytest api/tests` | API tests (offline) |
| `<repo>` | `python tools/validate_shoes.py` | shoe catalogue validation |
| `<repo>/web` | `npm install` | one-time: web dependencies |
| `<repo>/web` | `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `<repo>/web` | `npm run e2e` | builds the site against a local API and runs every `web/e2e/*.test.mjs` (about 3 minutes) |
| `<repo>/web` | `npm run build` | type check + production build |

`npm run e2e` starts the API itself (needs the API requirements installed) and a Chromium that Playwright can find;
set `CHROMIUM_PATH=/path/to/chromium` if it cannot. Run a single browser test with
`cd <repo>/web && E2E_BASE=http://localhost:4173/ node e2e/<name>.test.mjs` while a build is served on port 4173.
Always run the tests that cover what you changed before pushing, and say honestly what you did not run.

## Starting a task

1. `git fetch origin main`, then create the branch **from the latest `origin/main`**
   (`git checkout -b <branch> origin/main`). Never continue on a branch whose PR was already merged; start a new one.
2. **Before editing, tell the owner the scope** in a short note: what will change, what will not, and the **main files** you expect to touch.
3. **Check for overlap**: list the open PRs (`gh`/GitHub) and compare their changed files with yours. If another open PR touches the same
   files or the same behaviour, do **not** work in parallel: wait for it to be merged, or ask the owner which goes first. Overlapping work is done in sequence.
4. Open the PR against `main`. Do not merge it; the owner merges.
5. Re-check the open PR list when you finish and mention any PR that now conflicts with yours.

## Git and PR rules (important)

- Work on a branch named for the task: `feat/...`, `fix/...`, `style/...`, `docs/...`, `test/...`, `chore/...`.
  Agent-prefixed names are fine when two agents work at once (`claude/...`, `codex/...`).
- **Every PR targets `main`.** Never stack a PR on another PR's branch (it once merged into the base branch and never reached `main`).
  If you need another change first, wait for it to be merged, then start from the new `origin/main`.
- **Never merge PRs and never push to `main`.** The owner reviews and merges.
- PR titles and bodies are in **English**. Use sections: Problem/Why, Changes, Verification, Notes.
  Commit messages are English too.
- One concern per PR. Small PRs get merged fast.
- If a PR gets a merge conflict, merge `main` into the branch and resolve it; do not rebase a pushed branch.
- No secrets in the repo, ever. Keys live only in the Render environment (see Environment).

## Product decisions already made

- Scope: running + walking/everyday comfort shoes. No fashion sneakers.
- Home has three finder cards (beginner runner, experienced runner, comfort shoes). There is no Search menu.
- Results show the top three candidates first with a one-line comparison to the person's answers (no extra AI call); the rest are under "See more options". The AI explanation is requested only when a card is expanded.
- Prices are shown as exact Korean list prices (`kr_list`) or the overseas USD price with a "check local price" note; never as a KRW range or a guessed amount.
- On phones the feedback entry is in the More menu (a floating button would cover forms); on wide screens it floats at the bottom right.
- No login. Saved shoes and "my shoes" live in the browser (`localStorage`). Feedback and the admin inbox work without accounts.
- Mascot **솔이** (written **SOL-E** in English copy), a small ghost. Copy tone to users is polite and friendly (존댓말, "~해요"). The persona lives on the About page.
- Fonts: IBM Plex Sans KR (OFL). Theme follows the system and can be toggled (sun/moon). Colors are CSS tokens in `web/src/styles.css`
  (`--primary`, `--title-sky`, `--name-gray`, `--explain`); do not hard-code colors in components.
- Mobile is first-class: check phone width (390 px) for any UI change; icon buttons need a tooltip and `aria-label`.
- All user-visible strings live in `web/src/i18n.ts` (ko and en). Use `h()` (text nodes only), never `innerHTML`.

## Data rules (shoes)

- Every shoe has `categories` (list of `running` / `walking` / `daily`) and a `price` in KRW. New walking models have `source_url`, `specs_checked_at` and a weight measurement basis; unknown drop/weight may be null, and unverified cushion/width are `미확인`. Do not infer missing specs.
- `price_source` is `kr_list` (a Korean list price was found, e.g. KREAM 발매가) or `estimate`.
  Estimated prices must carry `price_usd` (overseas list price); the UI then shows the USD price instead of a made-up KRW range.
- Never invent specs or prices. If you cannot confirm a value, mark it `estimate` and say so in the PR.
- Budget logic only trusts `kr_list` prices. API results carry `budget_status` (`within` / `unknown` / `over`) and are ordered in that sequence, then by score; `over_budget` is true only for confirmed Korean prices. Unknown prices are never a claim of affordability.
- Run `python tools/validate_shoes.py` after touching `shoes_data.json`.

## Catalogue updates

- `python -m api.catalog_sync` is the daily official-store price job; see `docs/catalog-updates.md`.
- PostgreSQL holds `shoe_catalog` (reviewed JSON mirror), `shoe_price_history`, and `shoe_review_queue`. Cron never overwrites reviewed specs or budget prices.
- API reads recent observations only when `CATALOG_PRICES_ENABLED=1`. Missing DB/tables falls back to reviewed JSON.
- Sale prices are supplementary information, never proof of list-price affordability. New adapters need exact model/variant matching and tests.

## Backend rules

- The API is started either from `api/` (`uvicorn main:app`) or from the repo root (`uvicorn api.main:app`; this is what Render uses).
  Modules import siblings with a `try: import x / except ModuleNotFoundError: from api import x` fallback. Keep it working both ways.
- `api/requirements.txt` is not pinned and Render uses a recent Python; avoid dependencies that need compilation.
- Claude calls (`/explain`, the daily pick comment) must not run in tests (monkeypatch them), must have timeouts, and must degrade
  to a plain sentence on failure. Prompts must not invite the model to invent facts; price talk is only allowed for `kr_list` prices.
- The AI explanation prompt follows how the person searched (`mode`: beginner / expert / comfort). A comfort search must never be explained as running.
- Abuse limits exist for `/explain` and `/feedback` (`api/rate_limit.py`); keep new paid or write endpoints limited.
- Never log keys, URLs with credentials, prompts or response bodies. Log the failure kind only.
- Startup checks (`api/startup_checks.py`) report missing or invalid keys in the Render logs; extend them when adding a dependency on a key.

## Environment (Render, API service)

`ANTHROPIC_API_KEY`, `NAVER_CLIENT_ID` (NAVER API HUB "API Key ID"), `NAVER_CLIENT_SECRET` (the "API Key"),
`DATABASE_URL` (Postgres for feedback; without it feedback is in memory), `ADMIN_TOKEN` (opens `#/admin`),
optional `ALLOWED_ORIGINS`, `EXPLAIN_*`, `FEEDBACK_*`, `NEWS_TTL_SECONDS`. The static site only needs `VITE_API_URL`.
Naver news uses NAVER API HUB (`naverapihub.apigw.ntruss.com`), not the old developers.naver.com endpoint.

## Testing expectations

- API changes: add or update a test in `api/tests/`. Pure helpers are preferred so tests stay offline.
- UI changes: add a check to the matching `web/e2e/*.test.mjs` (mock API responses with `page.route` when you need a specific case).
  Screenshots are skipped unless `E2E_SHOTS=<folder>` is set.
- The e2e suite is the shared contract between agents: if you change copy or layout on purpose, update the assertions in the same PR.

## Suggested split when two agents work in parallel

- Small, well-bounded work (copy, styling, one component, data fixes, tests): either agent, on its own branch.
- Cross-cutting work (API + web together, new endpoints, data model, prompts, deploy/config): one agent owns the whole change in one PR.
- Do not edit the same file from two branches at once (`web/src/i18n.ts`, `web/src/styles.css` and `api/main.py` are the usual collision points); say which agent holds them.

## Releases

- Versions follow SemVer and live in `web/package.json` (`version`); the About page shows it with `dataUpdated` (`YYYY-MM`, bump it whenever `shoes_data.json` changes).
- The owner publishes a GitHub Release tagged `vX.Y.Z` after merging; agents bump the version only when asked and never create tags or releases.
