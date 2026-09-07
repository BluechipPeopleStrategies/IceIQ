-- Migration 0025: invite codes gating account creation for the beta waves.
-- Paste into Supabase Dashboard -> SQL Editor -> Run. Idempotent.
--
-- Enforcement lives in redeem_invite_code(), a SECURITY DEFINER function, NOT in
-- the client. A client-side check is bypassable by calling auth.signUp directly
-- from devtools, so it would be decoration.
--
-- The function creates the profile and consumes the code in one transaction.
-- That is deliberate: creating an auth user without a profile produces the
-- dead-end account already logged in docs/roadmap/TASKS.md, where the UI bounces
-- the user to signup forever and there is no way out from the interface.

create table if not exists public.invite_codes (
  code        text primary key,
  label       text not null,            -- who this was issued to, so redemptions are traceable
  wave        int  not null default 0,
  max_uses    int  not null default 1,
  used_count  int  not null default 0,
  expires_at  timestamptz,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.invite_redemptions (
  code        text not null references public.invite_codes(code) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)
);

create index if not exists idx_invite_redemptions_user
  on public.invite_redemptions(user_id);

-- Both tables are locked down completely. No client role gets select, insert or
-- update. Only the SECURITY DEFINER function below touches them, which means the
-- code list cannot be enumerated by an authenticated user poking at the API.
alter table public.invite_codes       enable row level security;
alter table public.invite_redemptions enable row level security;

-- Owner-only read, for checking who has redeemed what. No client write policy
-- exists on either table by design.
drop policy if exists "owner reads invite codes" on public.invite_codes;
create policy "owner reads invite codes" on public.invite_codes
  for select using (
    lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
  );

drop policy if exists "owner reads invite redemptions" on public.invite_redemptions;
create policy "owner reads invite redemptions" on public.invite_redemptions
  for select using (
    lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
  );

-- Redeem a code and create the caller's profile atomically.
--
-- Returns a short text status the client maps to a message. It deliberately does
-- not distinguish "no such code" from "expired" or "used up" in a way that helps
-- someone probing codes: every unusable code returns 'invalid'.
create or replace function public.redeem_invite_code(
  p_code text,
  p_role text,
  p_name text,
  p_level text default null,
  p_position text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_row  public.invite_codes%rowtype;
begin
  if v_user is null then
    return 'unauthenticated';
  end if;

  if p_role is null or p_role not in ('player', 'coach') then
    return 'bad_role';
  end if;

  if p_name is null or length(btrim(p_name)) = 0 then
    return 'bad_name';
  end if;

  -- Already has a profile: nothing to do, and no code is consumed. Makes the
  -- call safe to retry after a dropped connection.
  if exists (select 1 from public.profiles where id = v_user) then
    return 'already_registered';
  end if;

  -- Lock the row so two people redeeming the last use of a code cannot both win.
  select * into v_row from public.invite_codes
    where code = v_code for update;

  if not found
     or v_row.active is not true
     or v_row.used_count >= v_row.max_uses
     or (v_row.expires_at is not null and v_row.expires_at < now())
  then
    return 'invalid';
  end if;

  insert into public.profiles (id, role, name, level, position)
    values (v_user, p_role, btrim(p_name), p_level, p_position);

  update public.invite_codes
     set used_count = used_count + 1
   where code = v_row.code;

  insert into public.invite_redemptions (code, user_id)
    values (v_row.code, v_user)
    on conflict do nothing;

  return 'ok';
end;
$$;

revoke all on function public.redeem_invite_code(text, text, text, text, text) from public;
grant execute on function public.redeem_invite_code(text, text, text, text, text) to authenticated;

-- Close the bypass. schema.sql grants "insert own profile", which lets any
-- authenticated user create their own profile row directly and skip the code
-- entirely, making the gate decoration. redeem_invite_code() is SECURITY
-- DEFINER so it still inserts fine without this policy.
--
-- Safe to drop as of 2026-09-07: no accounts exist yet, and the only two client
-- paths that inserted a profile (signUp and the FinishSetupScreen recovery) both
-- route through the function now. Profile UPDATE is a separate policy and is
-- untouched, so editing a profile still works.
drop policy if exists "insert own profile" on public.profiles;
