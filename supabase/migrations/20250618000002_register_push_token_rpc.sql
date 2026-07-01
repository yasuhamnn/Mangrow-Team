-- Reassign device push token to the currently signed-in user.
-- Needed because push_token is unique per device and RLS blocks updating
-- a row owned by another user (e.g. admin then volunteer on same phone).
create or replace function public.register_push_token(p_push_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_push_token is null or length(trim(p_push_token)) = 0 then
    raise exception 'Push token is required';
  end if;

  delete from public.user_push_tokens
  where push_token = p_push_token;

  insert into public.user_push_tokens (user_id, push_token, updated_at)
  values (uid, p_push_token, now());
end;
$$;

grant execute on function public.register_push_token(text) to authenticated;
