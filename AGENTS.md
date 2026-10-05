# Find Your Sole: working agreements for coding agents

Shoe recommendation service for running shoes and everyday walking/comfort shoes (not fashion sneakers).
Users are in Korea. Korean is the primary language; English is supported everywhere.
This file is read by every coding agent (Claude Code, Codex). `CLAUDE.md` points here.

## Layout

| Path | What it is |
|---|---|
| `web/` | Vite + TypeScript web app, no framework (tiny `h()` DOM helper). Deployed as a Render Static Site. |
| `api/` | FastAPI backend (Render web service). Rule-based scoring, Claude Haiku explanations, news, feedback. |
| `shoes_data.json` | The shoe catalogue (64 shoes). Single source of truth, read by `api/main.py`. |
| `flutter_app/` | The iOS app. Do not touch unless asked. |
| `web/e2e/` | Playwright browser tests. `tools/validate_shoes.py` validates the catalogue. |

Production: web at `https://findyoursole.app`, API at `https://find-your-sole.onrender.com`. Both deploy from `main`.

## Commands

```bash
python -m pytest api/tests          # API tests (run from the repo root)
python tools/validate_shoes.py      # catalogue validation
cd web && npm run typecheck         # tsc --noEmit
cd web && npm run e2e               # builds against a local API and runs every web/e2e/*.test.mjs
```

`npm run e2e` needs `pip install -r api/requirements.txt` and a Chromium; set `CHROMIUM_PATH` if Playwright cannot find one.
Always run the tests that cover what you changed before pushing, and say honestly what you did not run.

## Git and PR rules (important)

- Work on a branch named for the task: `feat/...`, `fix/...`, `style/...`, `docs/...`, `test/...`, `chore/...`.
  Agent-prefixed names are fine when two agents work at once (`claude/...`, `codex/...`).
- **Every PR targets `main`.** Never stack a PR on another PR's branch (it once merged into the base branch and never reached `main`).
  If you need another change first, wait for it or branch from `main` and say so.
- **Never merge PRs and never push to `main`.** The owner reviews and merges.
- PR titles and bodies are in **English**. Use sections: Problem/Why, Changes, Verification, Notes.
  Commit messages are English too.
- One concern per PR. Small PRs get merged fast.
- If a PR gets a merge conflict, merge `main` into the branch and resolve it; do not rebase a pushed branch.
- No secrets in the repo, ever. Keys live only in the Render environment (see Environment).

## Product decisions already made

- Scope: running + walking/everyday comfort shoes. No fashion sneakers.
- Home has three finder cards (beginner runner, experienced runner, comfort shoes). There is no Search menu.
- No login. Saved shoes and "my shoes" live in the browser (`localStorage`). Feedback and the admin inbox work without accounts.
- Mascot **Soli (솔이)**, a small ghost. Copy tone to users is polite and friendly (존댓말, "~해요"). Soli's persona lives on the About page.
- Fonts: IBM Plex Sans KR (OFL). Theme follows the system and can be toggled (sun/moon). Colors are CSS tokens in `web/src/styles.css`
  (`--primary`, `--title-sky`, `--name-gray`, `--explain`); do not hard-code colors in components.
- Mobile is first-class: check phone width (390 px) for any UI change; icon buttons need a tooltip and `aria-label`.
- All user-visible strings live in `web/src/i18n.ts` (ko and en). Use `h()` (text nodes only), never `innerHTML`.

## Data rules (shoes)

- Every shoe has `categories` (list of `running` / `walking` / `daily`) and a `price` in KRW.
- `price_source` is `kr_list` (a Korean list price was found, e.g. KREAM 발매가) or `estimate`.
  Estimated prices must carry `price_usd` (overseas list price); the UI then shows the USD price instead of a made-up KRW range.
- Never invent specs or prices. If you cannot confirm a value, mark it `estimate` and say so in the PR.
- Run `python tools/validate_shoes.py` after touching `shoes_data.json`.

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
