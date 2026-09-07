-- PREPARED ONLY. Not applied or PostgreSQL-tested. See authenticated release plan.
-- Requires Supabase auth schema, profiles.is_admin and verified privilege hardening.
begin;
create function public.feedback_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and is_admin=true);
$$;
revoke all on function public.feedback_is_admin() from public;
grant execute on function public.feedback_is_admin() to authenticated;

create table public.feedback_question_registry (
 scope text not null, question_id text not null, content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 snapshot jsonb not null, primary key(scope,question_id,content_hash)
);
create table public.player_feedback (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(), scope text not null, question_id text not null, content_hash text not null,
 note text not null check(length(trim(note)) between 1 and 4000), context jsonb not null default '{}',
 foreign key(scope,question_id,content_hash) references public.feedback_question_registry
);
create table public.feedback_internal_events (
 id uuid primary key default gen_random_uuid(), feedback_id uuid not null references public.player_feedback(id),
 created_at timestamptz not null default now(), author_id uuid not null default auth.uid(),
 status text not null check(status in ('investigating','changed','needs-context','no-change','internal-note')),
 summary text not null check(length(trim(summary)) between 1 and 4000), evidence jsonb not null default '{}'
);
create table public.feedback_public_updates (
 id uuid primary key default gen_random_uuid(), feedback_id uuid not null references public.player_feedback(id),
 created_at timestamptz not null default now(), author_id uuid not null default auth.uid(),
 status text not null check(status in ('investigating','changed','needs-context','no-change')),
 summary text not null check(length(trim(summary)) between 1 and 4000)
);
alter table public.feedback_question_registry enable row level security;
alter table public.player_feedback enable row level security;
alter table public.feedback_internal_events enable row level security;
alter table public.feedback_public_updates enable row level security;
revoke all on public.feedback_question_registry,public.player_feedback,public.feedback_internal_events,public.feedback_public_updates from anon,authenticated;
grant select on public.feedback_question_registry,public.player_feedback,public.feedback_internal_events,public.feedback_public_updates to authenticated;
grant insert on public.feedback_internal_events,public.feedback_public_updates to authenticated;
-- Registry writes only via trusted database/release role. No client registry insert.
create policy registry_admin_read on public.feedback_question_registry for select to authenticated using(public.feedback_is_admin());
create policy feedback_owner_admin_read on public.player_feedback for select to authenticated using(owner_id=auth.uid() or public.feedback_is_admin());
create policy internal_admin_read on public.feedback_internal_events for select to authenticated using(public.feedback_is_admin());
create policy internal_admin_append on public.feedback_internal_events for insert to authenticated with check(public.feedback_is_admin() and author_id=auth.uid());
create policy public_owner_admin_read on public.feedback_public_updates for select to authenticated using(
 public.feedback_is_admin() or exists(select 1 from public.player_feedback f where f.id=feedback_id and f.owner_id=auth.uid())
);
create policy public_admin_append on public.feedback_public_updates for insert to authenticated with check(public.feedback_is_admin() and author_id=auth.uid());

create function public.submit_player_feedback(p_scope text,p_question_id text,p_hash text,p_note text,p_context jsonb default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare receipt uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_note is null or length(trim(p_note)) not between 1 and 4000 then raise exception 'Invalid note'; end if;
 if p_context is null or jsonb_typeof(p_context)<>'object' or octet_length(p_context::text)>12000 then raise exception 'Invalid context'; end if;
 if not exists(select 1 from public.feedback_question_registry where scope=p_scope and question_id=p_question_id and content_hash=p_hash) then raise exception 'Question identity unavailable'; end if;
 insert into public.player_feedback(owner_id,scope,question_id,content_hash,note,context)
 values(auth.uid(),p_scope,p_question_id,p_hash,trim(p_note),p_context) returning id into receipt;
 return receipt;
end;
$$;
revoke all on function public.submit_player_feedback(text,text,text,text,jsonb) from public;
grant execute on function public.submit_player_feedback(text,text,text,text,jsonb) to authenticated;
commit;
