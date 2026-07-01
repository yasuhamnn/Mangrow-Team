-- =============================================================================
-- FIX: Automatic notifications on report submit / status change / resolution
-- Run this entire file in Supabase Dashboard → SQL Editor
-- =============================================================================

-- 1. Normalize notifications columns (your early schema used `body` + `meta`,
--    but triggers and the app expect `message` + `related_id`)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'body'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'message'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN body TO message;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'message'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN related_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN type text;
  END IF;
END $$;

-- Copy meta.reportId → related_id if you used the older JSONB column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'meta'
  ) THEN
    UPDATE public.notifications
    SET related_id = COALESCE(related_id, (meta->>'reportId')::uuid)
    WHERE related_id IS NULL AND meta ? 'reportId';
  END IF;
END $$;

-- 2. RLS: allow SECURITY DEFINER triggers + RPCs to insert notification rows
--    (without this, triggers silently fail when RLS blocks the insert)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone authenticated can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow volunteers to notify admins" ON public.notifications;
DROP POLICY IF EXISTS "Allow volunteers to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Volunteers can insert notifications" ON public.notifications;

CREATE POLICY "System insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins must be readable so triggers can find admin user_ids
DROP POLICY IF EXISTS "Allow authenticated users to view admins" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to view admin profiles" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to view admin IDs" ON public.users;
DROP POLICY IF EXISTS "Allow users to see admin list" ON public.users;
DROP POLICY IF EXISTS "Admins read all users" ON public.users;

CREATE POLICY "Authenticated users can view admin ids"
  ON public.users FOR SELECT
  TO authenticated
  USING (role = 'admin' OR auth.uid() = id);

-- 3. Trigger: volunteer submits unhealthy report (status = pending) → notify admins
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record record;
BEGIN
  -- Only unhealthy reports need admin review (healthy = 'recorded', no notification)
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  FOR admin_record IN
    SELECT id FROM public.users WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      admin_record.id,
      'New Report Submitted',
      'A volunteer has submitted a new mangrove health report for review.',
      'new_report',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_created_notify_admins ON public.reports;
CREATE TRIGGER on_report_created_notify_admins
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_report();

-- 4. Trigger: admin approves / rejects / resolves → notify volunteer
CREATE OR REPLACE FUNCTION public.notify_volunteer_on_report_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.user_id,
      CASE NEW.status
        WHEN 'under_review' THEN 'Report Approved'
        WHEN 'rejected' THEN 'Report Rejected'
        WHEN 'resolved' THEN 'Report Resolved'
        WHEN 'recorded' THEN 'Health Status Recorded'
        ELSE 'Report Update'
      END,
      CASE NEW.status
        WHEN 'under_review' THEN 'Your mangrove report has been verified and is now active on the map.'
        WHEN 'rejected' THEN 'Your report was reviewed and could not be approved.'
        WHEN 'resolved' THEN 'Your submitted report has been marked as resolved. Thank you!'
        WHEN 'recorded' THEN 'Your healthy mangrove observation has been saved.'
        ELSE 'Your report status has been updated.'
      END,
      CASE NEW.status
        WHEN 'under_review' THEN 'approved'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'resolved' THEN 'resolved'
        WHEN 'recorded' THEN 'recorded'
        ELSE 'update'
      END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_status_change ON public.reports;
DROP TRIGGER IF EXISTS on_report_status_change_notify_volunteer ON public.reports;
CREATE TRIGGER on_report_status_change_notify_volunteer
  AFTER UPDATE OF status ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_volunteer_on_report_status_change();

-- 5. RPC: volunteer submits resolution request → notify admins
CREATE OR REPLACE FUNCTION public.request_report_resolution(
  p_report_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record record;
  report_row public.reports%rowtype;
BEGIN
  SELECT * INTO report_row FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  IF report_row.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF report_row.status IS DISTINCT FROM 'under_review' THEN
    RAISE EXCEPTION 'Report is not eligible for resolution';
  END IF;

  FOR admin_record IN
    SELECT id FROM public.users WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      admin_record.id,
      'Resolution Submitted',
      COALESCE(p_notes, 'A volunteer submitted a resolution request for review.'),
      'resolution',
      p_report_id
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_report_resolution(uuid, text) TO authenticated;

-- 6. Realtime (in-app notification list updates live; skip if already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
