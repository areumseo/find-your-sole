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

- **Frontend**: Flutter (iOS)
- **Backend**: FastAPI (hosted on Render)
- **AI**: Anthropic Claude (`claude-haiku-4-5`)
- **Local storage**: SQLite (sqflite) + shared_preferences

## Backend

API endpoint: `https://find-your-sole.onrender.com`

## Getting Started

```bash
flutter pub get
flutter run
```

Release build:

```bash
flutter build ios --no-codesign
# Then open ios/FindYourSole.xcworkspace in Xcode and run on device
```
