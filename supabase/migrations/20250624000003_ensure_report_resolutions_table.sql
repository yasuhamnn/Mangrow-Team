-- Ensure report_resolutions exists (app expects this table name).
-- Safe to re-run. Migrates rows from legacy public.resolutions if present.

CREATE TABLE IF NOT EXISTS public.report_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes text,
  image_url text,
  latitude double precision,
  longitude double precision,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Copy legacy resolutions → report_resolutions (description → notes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'resolutions'
  ) THEN
    INSERT INTO public.report_resolutions (
      id, report_id, user_id, notes, image_url, latitude, longitude, status, created_at
    )
    SELECT
      r.id,
      r.report_id,
      r.user_id,
      r.description,
      r.image_url,
      r.latitude,
      r.longitude,
      r.status,
      COALESCE(r.created_at, now())
    FROM public.resolutions r
    WHERE NOT EXISTS (
      SELECT 1 FROM public.report_resolutions rr WHERE rr.id = r.id
    );
  END IF;
END $$;

ALTER TABLE public.report_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Volunteers insert resolutions" ON public.report_resolutions;
CREATE POLICY "Volunteers insert resolutions"
  ON public.report_resolutions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Read resolutions for visible reports" ON public.report_resolutions;
CREATE POLICY "Read resolutions for visible reports"
  ON public.report_resolutions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.reports rep
      WHERE rep.id = report_id AND rep.status IN ('under_review', 'resolved')
    )
  );

DROP POLICY IF EXISTS "Admins update resolutions" ON public.report_resolutions;
CREATE POLICY "Admins update resolutions"
  ON public.report_resolutions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RPC: insert into report_resolutions when volunteer requests review
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

  INSERT INTO public.report_resolutions (report_id, user_id, notes, status)
  VALUES (p_report_id, auth.uid(), p_notes, 'pending');

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

-- Refresh PostgREST schema cache (Supabase picks this up automatically; run NOTIFY if needed)
NOTIFY pgrst, 'reload schema';
