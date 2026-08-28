# Passport Mobile (React Native / Expo SDK 54)

Native companion app for the Passport trade compliance platform. Built with **Expo SDK 54** (compatible with the latest Expo Go).

## Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/go) on your phone, or Android Studio / Xcode for emulators
- Next.js backend running (`npm run dev` from repo root)

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # if .env is missing
```

Edit `mobile/.env`:

- `EXPO_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — anon key
- `EXPO_PUBLIC_API_URL` — backend URL for auth signup/login

**API URL by device:**

| Environment | URL |
|-------------|-----|
| iOS Simulator | `http://localhost:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| Physical device | `http://<your-lan-ip>:3000` |

## Run

```bash
# From repo root
npm run mobile

# Or from mobile/
npm start
```

Scan the QR code with Expo Go, or press `a` / `i` for Android / iOS emulator.

## Features

- Sign in / sign up (via `/api/auth/mobile/*` on the Next.js backend)
- List shipments
- Create shipments
- View shipment details (parties, products, documents)

Document upload and AI extraction remain on the web app for now.

## Project structure

```
mobile/
  app/              Expo Router screens
  contexts/         Auth state
  lib/              Supabase client, theme, validations
  types/            Shared TypeScript types
```
