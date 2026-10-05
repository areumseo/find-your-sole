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
- **AI**: Anthropic Claude (`claude-haiku-4-5`)
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

The mascot, Soli, is in `web/design/soli/` as editable vector SVGs: the default pose, a "found the right pair" pose with both arms up, and a presentation board. `design/soli/soli-default.svg` is the single source for the logo; `npm run icons` copies it to `public/logo.svg` and regenerates the favicon and app icons (needs `pip install cairosvg pillow`).

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
