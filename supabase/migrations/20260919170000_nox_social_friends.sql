-- NOX Social: real friend graph + friend requests
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_not_self check (sender_id <> receiver_id)
);

create unique index if not exists friend_requests_one_pending_pair
on public.friend_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id))
where status = 'pending';

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (user_id <> friend_id),
  constraint friendships_unique unique (user_id, friend_id)
);

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "friend requests visible to participants" on public.friend_requests;
create policy "friend requests visible to participants" on public.friend_requests
for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "users can send friend requests" on public.friend_requests;
create policy "users can send friend requests" on public.friend_requests
for insert with check (auth.uid() = sender_id and sender_id <> receiver_id);

drop policy if exists "receiver can respond to friend requests" on public.friend_requests;
create policy "receiver can respond to friend requests" on public.friend_requests
for update using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);

drop policy if exists "friendships visible to participants" on public.friendships;
create policy "friendships visible to participants" on public.friendships
for select using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "users can create their friendship edge" on public.friendships;
create policy "users can create their friendship edge" on public.friendships
for insert with check (auth.uid() = user_id);

drop policy if exists "users can remove their friendship edge" on public.friendships;
create policy "users can remove their friendship edge" on public.friendships
for delete using (auth.uid() = user_id);

-- Public social discovery exposes only minimal profile fields through a security-definer RPC.
create or replace function public.nox_friend_profile(code text)
returns table (id uuid, display_name text, xp integer, streak_days integer)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, coalesce(p.xp,0), coalesce(p.streak_days,0)
  from public.profiles p
  where upper(left(p.id::text, 8)) = upper(left(code, 8))
  limit 1;
$$;

revoke all on function public.nox_friend_profile(text) from public;
grant execute on function public.nox_friend_profile(text) to authenticated;
