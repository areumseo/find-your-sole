# Find Your Sole 👟

A personalized running shoe recommendation iOS app. Answer a few questions about your foot type, running style, and budget — get matched with the right shoe, explained by AI.

## Features

- **Beginner & Expert modes** — simple 3-step flow for newcomers, full-detail form for experienced runners
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

## Web app

A static site in `web/`, deployed to Render as `find-your-sole-web` (see `render.yaml`). It uses the same backend as the iOS app. The bundle is ~10 KB gzipped, so it loads quickly on mobile networks.

```bash
cd web
npm install
npm run dev          # http://localhost:5173, talks to the production API
npm run build        # typecheck + production build into web/dist
```

To develop against a local backend, copy `web/.env.example` to `web/.env.local`, set `VITE_API_URL=http://localhost:8000`, and run `uvicorn main:app` from `api/`.

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
