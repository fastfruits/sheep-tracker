# SheepFinder (Sheep Tracker)

SheepFinder is a lightweight mobile app that helps farmers locate lost or strayed sheep. Users can capture a photo, tag the location, and submit a report with an on-map marker to make recovery faster and easier.

## What This App Does

- Capture a sheep photo from the camera
- Grab the current GPS location
- Create a report marker for quick discovery
- Simple, fast flow designed for field use

## Current Status

Early prototype. Camera and location capture are implemented; storage, map view, and reporting workflows are in progress.

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Start the app

```bash
npx expo start
```

3. Open on your phone

- Install **Expo Go** (or use a custom dev build)
- Ensure your phone and computer are on the same Wi‑Fi
- Scan the QR code shown by Expo

## Permissions

This app requests:

- Camera access (to capture sheep photos)
- Location access (to tag reports)

## Project Structure

- `app/` — screens and routes (Expo Router)
- `components/` — reusable UI
- `assets/` — images and static files
- `constants/` — theme and shared constants

## Roadmap

- Map view with report markers
- Report list and details
- Upload flow with notes and tags
- Basic auth for trusted reporters
- Farmer/owner notification flow

## Contributing

PRs and suggestions are welcome. If you’re proposing a change, include a short note on the use case and any UI/UX considerations.
