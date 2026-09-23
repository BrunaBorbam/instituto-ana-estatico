begin;
create table public.leads (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null unique,
 created_at timestamptz not null default now(),
 name text not null check(char_length(name) between 2 and 120),
 phone text not null check(char_length(phone) between 10 and 15),
 email text not null check(char_length(email) <= 254),
 course text not null,
 source text not null default 'site' check(source in ('site','meta')),
 page_path text,
 attribution jsonb not null default '{}'::jsonb,
 meta_lead_id text unique,
 status text not null default 'novo' check(status in ('novo','em_contato','matriculado','encerrado')),
 notes text not null default '',
 consent_version text not null,
 consent_at timestamptz not null default now()
);
create index leads_created_at_idx on public.leads(created_at desc);
create table public.lead_notifications (
 lead_id uuid primary key references public.leads(id) on delete cascade,
 recipient text not null default 'instituto.ana.xangrila@gmail.com',
 status text not null default 'aguardando_configuracao' check(status in ('aguardando_configuracao','pendente','enviado','erro')),
 created_at timestamptz not null default now()
);
create table public.lead_rate_limits (
 bucket text primary key,
 window_start timestamptz not null,
 hits integer not null
);
alter table public.leads enable row level security;
alter table public.lead_notifications enable row level security;
alter table public.lead_rate_limits enable row level security;
revoke all on public.leads, public.lead_notifications, public.lead_rate_limits from public, anon, authenticated;
grant all on public.leads, public.lead_notifications, public.lead_rate_limits to service_role;
create function public.submit_website_lead(p_submission_id uuid,p_name text,p_phone text,p_email text,p_course text,p_page_path text,p_attribution jsonb,p_bucket text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result_id uuid; n integer; b text;
begin
 perform pg_advisory_xact_lock(941821);
 select id into result_id from public.leads where submission_id=p_submission_id;
 if result_id is not null then return result_id; end if;
 foreach b in array array['global',p_bucket] loop
  insert into public.lead_rate_limits(bucket,window_start,hits) values(b,now(),1)
  on conflict(bucket) do update set
   hits=case when lead_rate_limits.window_start < now()-interval '1 hour' then 1 else lead_rate_limits.hits+1 end,
   window_start=case when lead_rate_limits.window_start < now()-interval '1 hour' then now() else lead_rate_limits.window_start end
  returning hits into n;
  if (b='global' and n>200) or (b<>'global' and n>5) then raise exception 'rate_limit' using errcode='P0001'; end if;
 end loop;
 delete from public.lead_rate_limits where window_start < now()-interval '2 days';
 insert into public.leads(submission_id,name,phone,email,course,page_path,attribution,consent_version)
 values(p_submission_id,p_name,p_phone,p_email,p_course,p_page_path,p_attribution,'contato-2026-09-23')
 returning id into result_id;
 insert into public.lead_notifications(lead_id) values(result_id);
 return result_id;
end;
$$;
revoke all on function public.submit_website_lead(uuid,text,text,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_website_lead(uuid,text,text,text,text,text,jsonb,text) to service_role;
commit;