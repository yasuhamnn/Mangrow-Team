-- RPC: volunteer submits resolution proof (photos uploaded client-side first)

CREATE OR REPLACE FUNCTION public.submit_resolution_proof(
  p_report_id uuid,
  p_notes text,
  p_image_url text,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record record;
  report_row public.reports%rowtype;
  resolution_id uuid;
BEGIN
  SELECT * INTO report_row FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  IF report_row.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF report_row.status IS DISTINCT FROM 'under_review' THEN
    RAISE EXCEPTION 'Report is not eligible for resolution submission';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.report_resolutions rr
    WHERE rr.report_id = p_report_id
      AND rr.user_id = auth.uid()
      AND rr.status IN ('pending', 'under_review')
  ) THEN
    RAISE EXCEPTION 'You already have a resolution awaiting admin review for this report';
  END IF;

  INSERT INTO public.report_resolutions (
    report_id, user_id, notes, image_url, latitude, longitude, status
  )
  VALUES (
    p_report_id, auth.uid(), p_notes, p_image_url, p_latitude, p_longitude, 'pending'
  )
  RETURNING id INTO resolution_id;

  FOR admin_record IN
    SELECT id FROM public.users WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      admin_record.id,
      'Resolution Submitted',
      COALESCE(NULLIF(trim(p_notes), ''), 'A volunteer submitted resolution proof for review.'),
      'resolution',
      p_report_id
    );
  END LOOP;

  RETURN resolution_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_resolution_proof(uuid, text, text, double precision, double precision) TO authenticated;
