-- NOX social graph: multi-friends, requests, minimal social profile
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> receiver_id)
);
create unique index if not exists friend_requests_one_pending_pair
on public.friend_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id))
where status = 'pending';

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_id <> friend_id),
  unique(user_id, friend_id)
);

alter table public.profiles add column if not exists social_code text;
alter table public.profiles add column if not exists social_bio text;
alter table public.profiles add column if not exists social_avatar_url text;
alter table public.profiles add column if not exists social_discoverable boolean not null default true;
update public.profiles set social_code = upper(substr(replace(id::text,'-',''),1,8)) where social_code is null;
create unique index if not exists profiles_social_code_unique on public.profiles(social_code);

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "friend requests visible to participants" on public.friend_requests;
create policy "friend requests visible to participants" on public.friend_requests for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
drop policy if exists "users can send friend requests" on public.friend_requests;
create policy "users can send friend requests" on public.friend_requests for insert with check (auth.uid() = sender_id and sender_id <> receiver_id);
drop policy if exists "receiver can respond to friend requests" on public.friend_requests;
create policy "receiver can respond to friend requests" on public.friend_requests for update using (auth.uid() = receiver_id or auth.uid() = sender_id) with check (auth.uid() = receiver_id or auth.uid() = sender_id);

drop policy if exists "friendships visible to participants" on public.friendships;
create policy "friendships visible to participants" on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
drop policy if exists "users can create own friendships" on public.friendships;
create policy "users can create own friendships" on public.friendships for insert with check (auth.uid() = user_id);
drop policy if exists "users can remove own friendships" on public.friendships;
create policy "users can remove own friendships" on public.friendships for delete using (auth.uid() = user_id or auth.uid() = friend_id);
