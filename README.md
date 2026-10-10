# Find Your Sole 👟

A personalized shoe recommendation service for running shoes and everyday walking/comfort shoes. Answer a few questions about your feet, lifestyle, and budget — get matched with the right shoe, explained by AI. It ships as a web app (`web/`), a FastAPI backend (`api/`), and an iOS app (Flutter).

## Features

- **Three ways to search** — a simple flow for running beginners, a full-detail form for experienced runners, and a comfort flow (walking / commute / on-your-feet-all-day) for everyday shoes
- **Rule-based scoring** — recommendations based on foot arch, pronation, terrain, cushion preference, foot width, weekly mileage, budget, and body weight
- **AI explanations** — Claude Haiku explains why each shoe fits your profile
- **Favorites** — save shoes you're interested in
- **My Shoes** — track your shoe collection and cumulative km
- **Naver Shopping links** — tap to check current pricing
- **Dark mode** — automatic light/dark switching based on system settings
- **Korean / English** — full localization support

## Tech Stack

- **iOS app**: Flutter (`flutter_app/`)
- **Web app**: Vite + TypeScript, no framework (`web/`) — responsive, works on desktop and mobile browsers
- **Backend**: FastAPI (hosted on Render)
- **AI**: Anthropic Claude (`claude-haiku-5-5`)
- **Local storage**: SQLite (sqflite) + shared_preferences

## Backend

API endpoint: `https://find-your-sole.onrender.com`

The web app is served at `https://findyoursole.app`. The API only answers browser requests from that origin (plus `localhost:5173` and `localhost:4173` for development). To allow another site, such as a Render preview URL, set `ALLOWED_ORIGINS` on the API service to a comma-separated list; they are added to the defaults. The iOS app is not a browser and is unaffected. This is hygiene rather than protection: scripts can still call the API directly, and `/explain` spends Anthropic credits.

## Web app

A static site in `web/`, deployed to Render as `find-your-sole-web` (see `render.yaml`). It uses the same backend as the iOS app. The bundle is ~10 KB gzipped, so it loads quickly on mobile networks.

```bash
cd web
npm install
npm run dev          # http://localhost:5173, talks to the production API
npm run build        # typecheck + production build into web/dist
```

To develop against a local backend, copy `web/.env.example` to `web/.env.local`, set `VITE_API_URL=http://localhost:8000`, and run `uvicorn main:app` from `api/`.

The mascot, SOL-E (솔이), is in `web/design/sol-e/` as editable vector SVGs: the default pose, a "found the right pair" pose with both arms up, and a presentation board. `design/sol-e/sol-e-default.svg` is the single source for the logo; `npm run icons` copies it to `public/logo.svg` and regenerates the favicon and app icons (needs `pip install cairosvg pillow`).

The font is [IBM Plex Sans KR](https://github.com/IBM/plex) (SIL Open Font License; the notice is in the About tab and the license text ships at `/licenses/`). `npm run fonts` rebuilds `web/src/fonts/` from the `@ibm/plex-sans-kr` package, keeping the 2,350 everyday Hangul syllables of KS X 1001 plus Latin and symbols. Anything outside that falls back to a system font. It needs `pip install fonttools brotli`, and only has to be rerun when the character set or weights change.

Favorites and My Shoes are stored in the browser's `localStorage`, so they are per-device and are not shared with the iOS app. Routing uses `#/…` hashes, so no server rewrite rules are needed.

## Getting Started

```bash
flutter pub get
flutter run
```

Release build:

```bash
flutter build ios --no-codesign
# Then open ios/Runner.xcworkspace in Xcode and run on device
```

## Recommendation prices and summaries

Results show the top three candidates first; the remaining candidates are available under “See more options”. The first three cards compare catalogue facts with the user's answers without extra AI requests. Expanding a card still requests the full AI explanation.

Only `price_source: "kr_list"` counts as a known Korean list price. Price scoring and budget checks exclude estimates or missing sources. API results carry `budget_status` (`within`, `unknown`, `over`) and are sorted in that order, then by score. `over_budget` remains available for clients and is true only for confirmed over-budget Korean prices. Unknown prices are not a claim of affordability. The web shows exact Korean list prices (the same amount given to the AI), or the overseas USD price with a local-price check notice. Actual store prices may vary.

## Shoe launch news (API)

`GET /news` returns recent shoe launch headlines (title, publisher, link, date) from the NAVER API HUB news search (Naver Cloud Platform, `naverapihub.apigw.ntruss.com`), and the web home shows them as a widget. It needs `NAVER_CLIENT_ID` (the API HUB "API Key ID") and `NAVER_CLIENT_SECRET` (the "API Key") set on the API service (Render, Environment tab; never in the web service or the repo). Without them, or if Naver fails, it returns an empty list and the widget stays hidden. Results are cached on the server for 3 hours (`NEWS_TTL_SECONDS` to change), so Naver sees a handful of calls a day however many people visit.

Run the API tests from `api/` with `pip install -r requirements-dev.txt` then `python -m pytest tests`.

## Browser tests (web)

`web/e2e/` holds Playwright browser tests for the web app (flows, layout, theme, news widget, comfort form, navigation, My Page). From `web/`:

```bash
npm install
npm run e2e          # builds the site against a local API, starts both, runs every *.test.mjs
```

It needs Python with the API requirements installed (`pip install -r api/requirements.txt`) and a Chromium that Playwright can find; set `CHROMIUM_PATH` to point at one if needed, and `E2E_SHOTS=<folder>` to save screenshots.

## Feedback

On desktop, a feedback button floats on every page. On mobile and tablet layouts (below 900px), feedback is available in More so it does not overlap forms or results. People write a note (up to 2000 characters) and can attach one screenshot, which the browser shrinks to a JPEG under 1.5 MB. There are no accounts, so nothing identifies the sender; the page they were on is recorded as context.

- **Endpoints** (`api/feedback.py`): `POST /feedback`, and for the admin `GET /admin/feedback` (newest first, no screenshot data), `GET /admin/feedback/{id}/screenshot`, `POST /admin/feedback/{id}/resolve` (toggles).
- **Abuse limits:** 5 notes per IP per 10 minutes and 200 per day overall (`FEEDBACK_PER_CLIENT`, `FEEDBACK_WINDOW_SECONDS`, `FEEDBACK_DAILY_CAP`), a hidden honeypot field, magic-byte checks on the image (the declared type is never trusted) and a 413 over 1.5 MB.
- **Admin:** open `#/admin` (not linked anywhere) and enter the `ADMIN_TOKEN` set on the API service. Admin endpoints return 404 until that variable exists; repeated wrong tokens are rate limited.
- **Storage:** set `DATABASE_URL` to a Postgres URL (a free Neon database works; `postgres://` and `postgresql://` are both accepted) and the `feedback` table is created on first use. Without it feedback is kept in memory and is lost on restart, which is only meant for local development. Screenshots are stored as base64 text in the same table; move them to file storage if volume grows.

## Catalogue updates

Walking/daily recommendations include ten source-verified LeMouton models. Unknown specs are shown as unconfirmed. Official-store price observations can be refreshed daily into the existing PostgreSQL database; see [setup and review workflow](docs/catalog-updates.md). Prices are supplementary and do not change the reviewed list-price budget rules.
