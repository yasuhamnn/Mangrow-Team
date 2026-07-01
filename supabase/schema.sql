-- Mangrow complete Supabase schema
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS where needed

-- ---------------------------------------------------------------------------
-- 1. USERS (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  role text not null default 'volunteer' check (role in ('volunteer', 'admin')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.users enable row level security;

drop policy if exists "Users read own profile" on public.users;
create policy "Users read own profile"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.users;
create policy "Users update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Admins read all users" on public.users;
create policy "Admins read all users"
  on public.users for select
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- Auto-create profile on signup (role defaults to volunteer)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'volunteer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. MANGROVE SPECIES (reference data for AI identification)
-- ---------------------------------------------------------------------------
create table if not exists public.mangrove_species (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  reference_image_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.mangrove_species enable row level security;

drop policy if exists "Anyone authenticated can read species" on public.mangrove_species;
create policy "Anyone authenticated can read species"
  on public.mangrove_species for select
  to authenticated
  using (true);

-- Sample species (optional — remove if you already have data)
insert into public.mangrove_species (name, description)
values
  ('Rhizophora Apiculata', 'A true mangrove species with stilt roots, commonly found in Philippine coastal areas.'),
  ('Avicennia Marina', 'Grey mangrove with pneumatophore roots, tolerant of high salinity.'),
  ('Sonneratia Alba', 'Large-leaved mangrove often found along river mouths and estuaries.')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- 3. REPORTS (mangrove health observations & incident reports)
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  species_id uuid references public.mangrove_species(id) on delete set null,
  image_url text,
  species_image_url text,
  health_status text check (health_status in ('healthy', 'unhealthy')),
  latitude double precision not null,
  longitude double precision not null,
  location_text text,
  field_notes text,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'resolved', 'rejected', 'recorded')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.reports enable row level security;

drop policy if exists "Volunteers insert own reports" on public.reports;
create policy "Volunteers insert own reports"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users read own reports" on public.reports;
create policy "Users read own reports"
  on public.reports for select
  using (auth.uid() = user_id);

drop policy if exists "Anyone reads approved map reports" on public.reports;
create policy "Anyone reads approved map reports"
  on public.reports for select
  to authenticated
  using (status in ('under_review', 'resolved', 'recorded'));

drop policy if exists "Admins read all reports" on public.reports;
create policy "Admins read all reports"
  on public.reports for select
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists "Admins update report status" on public.reports;
create policy "Admins update report status"
  on public.reports for update
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 4. REPORT ATTACHMENTS (field-note photos)
-- ---------------------------------------------------------------------------
create table if not exists public.report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete cascade not null,
  image_url text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.report_attachments enable row level security;

drop policy if exists "Users insert attachments for own reports" on public.report_attachments;
create policy "Users insert attachments for own reports"
  on public.report_attachments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Read attachments for visible reports" on public.report_attachments;
create policy "Read attachments for visible reports"
  on public.report_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_id
        and (
          r.user_id = auth.uid()
          or r.status in ('under_review', 'resolved', 'recorded')
          or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. REPORT RESOLUTIONS (volunteer evidence that an issue was fixed)
-- ---------------------------------------------------------------------------
create table if not exists public.report_resolutions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete set null,
  notes text,
  image_url text,
  latitude double precision,
  longitude double precision,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'approved', 'rejected')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.resolution_attachments (
  id uuid primary key default gen_random_uuid(),
  resolution_id uuid references public.report_resolutions(id) on delete cascade not null,
  image_url text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.report_resolutions enable row level security;
alter table public.resolution_attachments enable row level security;

drop policy if exists "Volunteers insert resolutions" on public.report_resolutions;
create policy "Volunteers insert resolutions"
  on public.report_resolutions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Read resolutions for visible reports" on public.report_resolutions;
create policy "Read resolutions for visible reports"
  on public.report_resolutions for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
    or exists (
      select 1 from public.reports r
      where r.id = report_id and r.status in ('under_review', 'resolved')
    )
  );

drop policy if exists "Admins update resolutions" on public.report_resolutions;
create policy "Admins update resolutions"
  on public.report_resolutions for update
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 6. STATUS HISTORY (audit trail for report lifecycle)
-- ---------------------------------------------------------------------------
create table if not exists public.report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete cascade not null,
  old_status text,
  new_status text not null,
  changed_by uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.report_status_history enable row level security;

drop policy if exists "Read status history" on public.report_status_history;
create policy "Read status history"
  on public.report_status_history for select
  to authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_id
        and (
          r.user_id = auth.uid()
          or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
        )
    )
  );

create or replace function public.log_report_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status then
    insert into public.report_status_history (report_id, old_status, new_status, changed_by)
    values (NEW.id, OLD.status, NEW.status, auth.uid());
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_report_status_history on public.reports;
create trigger on_report_status_history
  after update of status on public.reports
  for each row execute function public.log_report_status_change();

-- ---------------------------------------------------------------------------
-- 7. NOTIFICATIONS
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  message text,
  type text,
  related_id uuid,
  is_read boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "System insert notifications" on public.notifications;
create policy "System insert notifications"
  on public.notifications for insert
  with check (true);

-- ---------------------------------------------------------------------------
-- 8. PUSH TOKENS
-- ---------------------------------------------------------------------------
create table if not exists public.user_push_tokens (
  id bigint generated by default as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  push_token text not null unique,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.user_push_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.user_push_tokens;
create policy "Users manage own push tokens"
  on public.user_push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

-- ---------------------------------------------------------------------------
-- 9. NOTIFICATION TRIGGERS
-- ---------------------------------------------------------------------------
create or replace function public.notify_admins_on_new_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_record record;
begin
  if NEW.status = 'pending' then
    for admin_record in
      select id from public.users where role = 'admin'
    loop
      insert into public.notifications (user_id, title, message, type, related_id)
      values (
        admin_record.id,
        'New Report Submitted',
        'A volunteer has submitted a new mangrove health report for review.',
        'new_report',
        NEW.id
      );
    end loop;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_report_created_notify_admins on public.reports;
create trigger on_report_created_notify_admins
  after insert on public.reports
  for each row execute function public.notify_admins_on_new_report();

create or replace function public.notify_volunteer_on_report_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status then
    insert into public.notifications (user_id, title, message, type, related_id)
    values (
      NEW.user_id,
      case NEW.status
        when 'under_review' then 'Report Approved'
        when 'rejected' then 'Report Rejected'
        when 'resolved' then 'Report Resolved'
        when 'recorded' then 'Health Status Recorded'
        else 'Report Update'
      end,
      case NEW.status
        when 'under_review' then 'Your mangrove report has been verified and is now active on the map.'
        when 'rejected' then 'Your report was reviewed and could not be approved. You may submit a new report with clearer photos.'
        when 'resolved' then 'Your submitted report has been marked as resolved. Thank you for your contribution!'
        when 'recorded' then 'Your healthy mangrove observation has been saved to the monitoring database.'
        else 'Your report status has been updated.'
      end,
      case NEW.status
        when 'under_review' then 'approved'
        when 'rejected' then 'rejected'
        when 'resolved' then 'resolved'
        when 'recorded' then 'recorded'
        else 'update'
      end,
      NEW.id
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_report_status_change_notify_volunteer on public.reports;
create trigger on_report_status_change_notify_volunteer
  after update of status on public.reports
  for each row execute function public.notify_volunteer_on_report_status_change();

-- Resolution RPC (volunteer submits resolution request)
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

-- ---------------------------------------------------------------------------
-- 10. STORAGE BUCKETS
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('reports', 'reports', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('resolutions', 'resolutions', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Storage policies: avatars
drop policy if exists "Avatar upload own" on storage.objects;
create policy "Avatar upload own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Avatar update own" on storage.objects;
create policy "Avatar update own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Avatar public read" on storage.objects;
create policy "Avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Storage policies: reports
drop policy if exists "Report image upload own" on storage.objects;
create policy "Report image upload own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Report image public read" on storage.objects;
create policy "Report image public read"
  on storage.objects for select
  using (bucket_id = 'reports');

-- Storage policies: resolutions
drop policy if exists "Resolution image upload own" on storage.objects;
create policy "Resolution image upload own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resolutions' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Resolution image public read" on storage.objects;
create policy "Resolution image public read"
  on storage.objects for select
  using (bucket_id = 'resolutions');

-- ---------------------------------------------------------------------------
-- 11. REALTIME (in-app notification badges)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- 12. PROMOTE FIRST ADMIN (developer only — run manually after signup)
-- ---------------------------------------------------------------------------
-- UPDATE public.users SET role = 'admin' WHERE email = 'your-admin@email.com';
