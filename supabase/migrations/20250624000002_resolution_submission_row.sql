-- When a volunteer requests resolution review, also create a report_resolutions row
-- so the admin Resolutions tab lists actual submissions (not under_review reports).
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
