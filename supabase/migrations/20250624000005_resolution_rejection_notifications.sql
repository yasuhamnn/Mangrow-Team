-- Notify volunteer when a resolution submission is rejected with admin feedback

CREATE OR REPLACE FUNCTION public.notify_volunteer_on_resolution_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_id)
      VALUES (
        NEW.user_id,
        'Resolution Rejected',
        COALESCE(
          NULLIF(trim(NEW.rejection_reason), ''),
          'Your resolution submission was reviewed and could not be approved.'
        ),
        'resolution_rejected',
        NEW.report_id
      );
    ELSIF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_id)
      VALUES (
        NEW.user_id,
        'Report Resolved',
        'Your resolution was accepted and the report is now marked as resolved. Thank you!',
        'resolved',
        NEW.report_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_resolution_status_change_notify ON public.report_resolutions;
CREATE TRIGGER on_resolution_status_change_notify
  AFTER UPDATE OF status ON public.report_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_volunteer_on_resolution_status_change();
