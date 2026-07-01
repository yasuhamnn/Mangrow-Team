# Supabase Setup for Mangrow

Firebase has been fully removed. All backend features use Supabase (Auth, Postgres, Storage, Realtime, Edge Functions).

## Quick Start

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New Project.

### 2. Run the database schema

In **Supabase Dashboard → SQL Editor**, paste and run the entire contents of:

```
supabase/schema.sql
```

This creates all tables, RLS policies, triggers, storage buckets, and notification logic.

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your project values:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Find these in **Project Settings → API**.

### 4. Create your first admin account

1. Register normally in the app (role defaults to `volunteer`).
2. In Supabase SQL Editor, promote that user (developer-only):

```sql
UPDATE public.users SET role = 'admin' WHERE email = 'your-admin@email.com';
```

Only the developer with database access can change roles.

### 5. Push notifications (optional)

See `supabase/PUSH_SETUP.md` for Expo push + edge function setup.

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Profiles linked to `auth.users`. Role: `volunteer` (default) or `admin` |
| `mangrove_species` | Species reference data (name, description, reference image) |
| `reports` | All mangrove observations and incident reports |
| `report_attachments` | Extra photos attached to field notes |
| `report_resolutions` | Volunteer resolution evidence (notes, photos, GPS) |
| `resolution_attachments` | Photos attached to a resolution |
| `report_status_history` | Audit trail of every status change |
| `notifications` | In-app notifications for admins and volunteers |
| `user_push_tokens` | Expo push tokens per device |

## Storage Buckets

| Bucket | Purpose | Path pattern |
|--------|---------|----------------|
| `avatars` | Profile photos | `{user_id}.jpg` |
| `reports` | Report & field-note photos | `{user_id}/{timestamp}.jpg` |
| `resolutions` | Resolution evidence photos | `{user_id}/{timestamp}.jpg` |

All buckets are public-read. Uploads are restricted to the authenticated user's folder.

---

## Report Status Flow

```
Volunteer captures leaf → AI classifies species + health

HEALTHY path:
  Record Status → status = 'recorded' → green marker on map (no admin review)

UNHEALTHY path:
  Submit Report → status = 'pending' → admin notified
    ├─ Approve → status = 'under_review' → red marker on map (Active/Unresolved)
    │     └─ Volunteer submits resolution → admin notified
    │           ├─ Mark Resolved → status = 'resolved' → unique resolved marker
    │           └─ Reject → stays under_review, volunteer notified to resubmit
    └─ Reject → status = 'rejected' → hidden from map, volunteer notified
```

### What happens when admin rejects a report?

- Status becomes `rejected`
- Report is **not shown on the map**
- Volunteer receives a push + in-app notification
- Volunteer can capture a new report with better photos/evidence

### What happens when admin rejects a resolution?

- Report stays `under_review` (still active on map)
- Volunteer is notified to provide clearer resolution evidence
- Volunteer can submit a new resolution with updated photos and notes

### Resolution detail page should include

- Original report photos and field notes
- Resolution photos and notes from volunteer
- GPS coordinates at time of resolution
- Volunteer name and submission timestamp
- Before/after comparison of the reported area
- Status history timeline

### After volunteer submits a resolution

1. Admin receives notification → opens Verify → Resolutions tab
2. Admin reviews evidence (photos, notes, location)
3. **Mark Resolved** → report status = `resolved`, volunteer notified, map marker changes
4. **Reject** → volunteer notified to resubmit with better evidence

---

## Suggested Next Steps (not yet in app UI)

These are supported in the schema but need UI wiring:

- **Live map tracking** during resolution (volunteer GPS → reported area path)
- **Resolution photo upload** to `resolutions` bucket + `report_resolutions` table
- **Species reference images** populated in `mangrove_species.reference_image_url`
- **AI model integration** — pass `healthStatus` from model to `health_results` screen via route params

When AI is ready, pass the result from `health_camera.jsx`:

```js
router.push({
  pathname: '/health_results',
  params: { ...existingParams, healthStatus: 'healthy' } // or 'unhealthy'
})
```
