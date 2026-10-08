begin;

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  cover_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  description text not null default '',
  video_url text,
  content text not null default '',
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  title text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.student_courses (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create or replace function public.is_site_admin()
returns boolean language sql security definer set search_path = public
as $$ select exists(select 1 from public.site_admins where user_id = auth.uid()); $$;

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.lesson_materials enable row level security;
alter table public.student_courses enable row level security;
alter table public.site_admins enable row level security;

create policy "students see enrolled courses" on public.courses for select to authenticated
using (published and exists (select 1 from public.student_courses sc where sc.course_id = courses.id and sc.user_id = auth.uid()) or public.is_site_admin());

create policy "students see enrolled modules" on public.course_modules for select to authenticated
using (exists (select 1 from public.student_courses sc where sc.course_id = course_modules.course_id and sc.user_id = auth.uid()) or public.is_site_admin());

create policy "students see published lessons" on public.course_lessons for select to authenticated
using ((published and exists (select 1 from public.course_modules m join public.student_courses sc on sc.course_id=m.course_id and sc.user_id=auth.uid() where m.id=course_lessons.module_id)) or public.is_site_admin());

create policy "students see lesson materials" on public.lesson_materials for select to authenticated
using (exists (select 1 from public.course_lessons l join public.course_modules m on m.id=l.module_id join public.student_courses sc on sc.course_id=m.course_id and sc.user_id=auth.uid() where l.id=lesson_materials.lesson_id) or public.is_site_admin());

create policy "students see own enrollments" on public.student_courses for select to authenticated
using (user_id=auth.uid() or public.is_site_admin());

create policy "admins manage courses" on public.courses for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
create policy "admins manage modules" on public.course_modules for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
create policy "admins manage lessons" on public.course_lessons for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
create policy "admins manage materials" on public.lesson_materials for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
create policy "admins manage enrollments" on public.student_courses for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

grant usage on schema public to authenticated;
grant select on public.courses, public.course_modules, public.course_lessons, public.lesson_materials, public.student_courses to authenticated;
grant insert, update, delete on public.courses, public.course_modules, public.course_lessons, public.lesson_materials, public.student_courses to authenticated;
commit;