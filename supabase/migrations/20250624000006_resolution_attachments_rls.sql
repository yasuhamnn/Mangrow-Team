-- Create resolution_attachments (extra proof photos per resolution submission).
-- Requires public.report_resolutions — run 20250624000003 first if that table is missing.

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

CREATE TABLE IF NOT EXISTS public.resolution_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id uuid NOT NULL REFERENCES public.report_resolutions(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.report_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_attachments ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Volunteers insert resolution attachments" ON public.resolution_attachments;
CREATE POLICY "Volunteers insert resolution attachments"
  ON public.resolution_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.report_resolutions rr
      WHERE rr.id = resolution_id AND rr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Read resolution attachments" ON public.resolution_attachments;
CREATE POLICY "Read resolution attachments"
  ON public.resolution_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.report_resolutions rr
      WHERE rr.id = resolution_id
        AND (
          rr.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
        )
    )
  );

-- Storage bucket for resolution proof photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resolutions', 'resolutions', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own resolution photos" ON storage.objects;
CREATE POLICY "Users upload own resolution photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resolutions' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Public read resolution photos" ON storage.objects;
CREATE POLICY "Public read resolution photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resolutions');
