# Push Notifications Setup (Expo + Supabase)

## 1. Environment

Copy `.env.example` to `.env` and fill in your Supabase URL and anon key:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 2. Supabase SQL

Run the migration in **SQL Editor**:

`supabase/migrations/20250618000000_push_notifications_setup.sql`

This creates:
- `user_push_tokens` — stores Expo push tokens per device
- RLS policies for notifications + push tokens
- DB triggers: new report → notify admins; status change → notify volunteer

## 3. Deploy Edge Function

Install Supabase CLI, link your project, then deploy:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy send-push-notification
```

## 4. Database Webhook

In Supabase Dashboard → **Database → Webhooks → Create**:

| Field | Value |
|-------|-------|
| Name | `trigger_push_notification` |
| Table | `notifications` |
| Events | INSERT |
| Type | Supabase Edge Function |
| Function | `send-push-notification` |
| Method | POST |

## 5. Test on a Physical Device

Push tokens only work on real devices (not emulators).

1. Log in on your phone (Expo Go or dev build)
2. Confirm a row appears in `user_push_tokens`
3. Insert a test row in `notifications` for your user
4. You should receive a push alert

## Troubleshooting automatic notifications

If manual `INSERT` into `notifications` works but report submit does not:

1. Run `supabase/migrations/20250624000000_fix_notification_triggers.sql` in SQL Editor.
2. Confirm at least one row in `public.users` has `role = 'admin'`.
3. Unhealthy reports use `status = 'pending'` — healthy observations use `recorded` and **do not** notify admins (by design).
4. In **Database → Webhooks**, confirm `trigger_push_notification` fires on `notifications` INSERT.
5. Redeploy the edge function after code changes: `supabase functions deploy send-push-notification`

Verify triggers exist:

```sql
SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.reports'::regclass;
-- expect: on_report_created_notify_admins, on_report_status_change_notify_volunteer
```

Test end-to-end:

```sql
-- Should create notification rows for every admin
INSERT INTO public.reports (user_id, latitude, longitude, status, health_status)
VALUES ('VOLUNTEER_USER_UUID', 14.5, 121.0, 'pending', 'unhealthy');
```


Volunteer login → `registerForPushNotificationsAsync` → token saved to `user_push_tokens`

## Deep links (tap notification)

Push payload includes `type`, `relatedId`, and `notificationId`. Tapping a notification routes:

| Role | Notification type | Destination |
|------|-------------------|-------------|
| Admin | `new_report`, `resolution` | `/admin/admin_verify?reportId=...` |
| Admin | other | `/admin/admin_notification` |
| Volunteer | `approved`, `rejected`, `resolved` | `/report_details?id=...` |
| Volunteer | other | `/notification` |

Run migration `20250618000001_resolution_rpc.sql` for volunteer resolution requests from report details.
