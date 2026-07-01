# Mangrow

Mangrow is a mobile capstone project for monitoring and protecting mangrove ecosystems. Volunteers capture mangrove observations in the field, submit reports, and track resolution progress. Administrators review submissions, manage the community map, and verify resolution evidence.

Built with **Expo (React Native)**, **Expo Router**, and **Supabase** (Auth, Postgres, Storage, Realtime, Edge Functions).

---

## Features

### Volunteer
- Sign in, create account, and manage profile
- Capture mangrove photos with guided camera framing
- View species and health classification results
- Submit healthy records or unhealthy incident reports with GPS location
- Browse an interactive map of community reports
- Receive in-app and push notifications (report status, rejections, resolutions)
- Track and submit resolution evidence for approved reports
- Search reports and view report details

### Admin
- Dedicated admin dashboard, map, and notification center
- Verify pending reports (approve or reject with feedback)
- Review volunteer resolution submissions (mark resolved or reject)
- Compare before/after resolution evidence
- Manage admin profile and account settings

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile app | Expo SDK 54, React Native, Expo Router |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Maps | Leaflet inside WebView with device GPS and heading |
| Push notifications | Expo Notifications + Supabase Edge Function |
| Builds | EAS Build (development / preview / production) |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npx expo`)
- A [Supabase](https://supabase.com) project
- For native features (camera, push, dev client): [EAS CLI](https://docs.expo.dev/build/setup/) and an Expo account
- Android Studio or Xcode (optional, for local emulator builds)

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd Mangrow_Project
npm install
```

### 2. Configure environment variables

Copy the example env file and add your Supabase project credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Find these values in **Supabase Dashboard → Project Settings → API**.

### 3. Set up the database

In **Supabase Dashboard → SQL Editor**, run the full contents of:

```
supabase/schema.sql
```

Apply any additional migrations in `supabase/migrations/` if your project was created before those changes. See [supabase/SUPABASE_SETUP.md](supabase/SUPABASE_SETUP.md) for table descriptions, storage buckets, and the report status workflow.

### 4. Create an admin account

1. Register a user in the app (default role is `volunteer`).
2. In the Supabase SQL Editor, promote that account:

```sql
UPDATE public.users SET role = 'admin' WHERE email = 'your-admin@email.com';
```

### 5. Android push notifications (optional)

If you build for Android with push enabled, place your Firebase `google-services.json` in the project root (see `google-services.json.example` for the expected structure). Full steps are in [supabase/PUSH_SETUP.md](supabase/PUSH_SETUP.md).

---

## Running the App

### Expo development server

```bash
npm start
```

Then open the app in:
- A **development build** (recommended for camera, maps, and push)
- An Android emulator or iOS simulator
- Expo Go (limited; some native modules may not work)

Platform shortcuts:

```bash
npm run android   # Run on Android
npm run ios       # Run on iOS
npm run web       # Run in the browser
```

### Development build (EAS)

For full native functionality, create a development client:

```bash
npx eas build --profile development --platform android
```

Install the resulting build on your device, then run `npm start` and connect to the dev server.

---

## Usage

### Volunteer flow
1. **Sign in** → land on the dashboard with stats and recent reports.
2. **Scan** → use the camera to capture a mangrove leaf photo.
3. **Review results** → confirm species and health status.
4. **Submit** → healthy observations are recorded; unhealthy cases become pending reports for admin review.
5. **Map** → view community reports and open report details.
6. **Resolve** → for approved reports, track location and submit resolution proof.

### Admin flow
1. **Sign in** with an admin account → admin dashboard.
2. **Verify** → review pending reports and resolution submissions.
3. **Map / Notifications** → monitor activity and respond to the community.

Role-based routing is handled automatically in `app/index.jsx` after authentication.

---

## Project Structure

```
Mangrow_Project/
├── app/                      # Expo Router screens (file-based routing)
│   ├── admin/                # Admin screens and components
│   ├── components/           # Shared UI (BottomNav, map panels, modals)
│   ├── utils/                # API helpers, services, shared logic
│   ├── dashboard.jsx         # Volunteer home
│   ├── map.jsx               # Volunteer map
│   ├── camera.jsx            # Capture flow entry
│   └── ...
├── assets/                   # Images, icons, splash assets
├── scripts/                  # Project utility scripts
├── supabase/
│   ├── schema.sql            # Full database schema
│   ├── migrations/           # Incremental SQL migrations
│   ├── functions/            # Edge Functions (e.g. push notifications)
│   ├── SUPABASE_SETUP.md     # Backend setup guide
│   └── PUSH_SETUP.md         # Push notification setup
├── supabaseClient.js         # Supabase client initialization
├── app.json                  # Expo app configuration
├── eas.json                  # EAS Build profiles
└── .env.example              # Environment variable template
```

### Code organization conventions
- **Screens** live under `app/` and use Expo Router file names.
- **Reusable UI** belongs in `app/components/`.
- **Data access and business logic** belong in `app/utils/` (grouped by feature or role).
- **Admin-only code** is namespaced under `app/admin/`.
- **Backend schema and migrations** stay in `supabase/`.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo development server |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run web` | Run in the browser |
| `npm run lint` | Run ESLint via Expo |
| `node scripts/generate-app-icons.js` | Regenerate centered app icons and splash assets |
| `node scripts/hex-to-rgb.js` | Convert hex colors to `rgb()` / `rgba()` in source files |

---

## Git and Commits

Use clear, professional commit messages that describe **why** a change was made:

```
feat: add resolution rejection feedback screen for volunteers
fix: correct Supabase import path in volunteer map hook
docs: document Supabase setup and report status flow
refactor: split map screen into reusable components
```

Keep commits focused on one logical change. Do not commit secrets (`.env`, keystores, or local build artifacts).

---

## Related Documentation

- [Supabase setup](supabase/SUPABASE_SETUP.md) — database, storage, roles, and report lifecycle
- [Push notification setup](supabase/PUSH_SETUP.md) — Expo push tokens and edge function
- [Expo documentation](https://docs.expo.dev/) — SDK reference and guides

---

## License

This project was developed as a capstone assignment. All rights reserved by the project team unless otherwise specified.
