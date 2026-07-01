-- Admin rejection feedback for reports and resolutions

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS rejection_category text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

ALTER TABLE public.report_resolutions
  ADD COLUMN IF NOT EXISTS rejection_category text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

-- Notify volunteer with admin rejection reason when report is rejected
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
        WHEN 'rejected' THEN COALESCE(
          NULLIF(trim(NEW.rejection_reason), ''),
          'Your report was reviewed and could not be approved.'
        )
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
