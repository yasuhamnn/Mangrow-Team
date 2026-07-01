-- RPC: volunteer requests resolution review (notifies admins securely)
create or replace function public.request_report_resolution(
  p_report_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_record record;
  report_row public.reports%rowtype;
begin
  select * into report_row from public.reports where id = p_report_id;
  if not found then
    raise exception 'Report not found';
  end if;

  if report_row.user_id is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  if report_row.status is distinct from 'under_review' then
    raise exception 'Report is not eligible for resolution';
  end if;

  for admin_record in
    select id from public.users where role = 'admin'
  loop
    insert into public.notifications (user_id, title, message, type, related_id)
    values (
      admin_record.id,
      'Resolution Submitted',
      coalesce(p_notes, 'A volunteer submitted a resolution request for review.'),
      'resolution',
      p_report_id
    );
  end loop;
end;
$$;

grant execute on function public.request_report_resolution(uuid, text) to authenticated;
