-- Phase 1 of moving the shop off JSON files: the whole shop state lives in one
-- versioned row. The app saves with compare-and-swap on `version`, so concurrent
-- orders can no longer overwrite each other. Only the server (service role) can
-- read or write it: RLS is on and there are no policies for anon/authenticated.
create table if not exists public.shop_state (
  id text primary key,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.shop_state enable row level security;
revoke all on public.shop_state from anon, authenticated;

-- Point-in-time safety net: keep the previous version of the document on every save.
create table if not exists public.shop_state_history (
  id bigserial primary key,
  state_id text not null,
  version bigint not null,
  data jsonb not null,
  saved_at timestamptz not null default now()
);
alter table public.shop_state_history enable row level security;
revoke all on public.shop_state_history from anon, authenticated;

create or replace function public.shop_state_keep_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.shop_state_history (state_id, version, data) values (old.id, old.version, old.data);
  -- keep the last 200 versions
  delete from public.shop_state_history
  where state_id = old.id
    and id < (select min(id) from (select id from public.shop_state_history where state_id = old.id order by id desc limit 200) t);
  return new;
end;
$$;

drop trigger if exists shop_state_history on public.shop_state;
create trigger shop_state_history
before update on public.shop_state
for each row execute function public.shop_state_keep_history();

revoke all on function public.shop_state_keep_history() from public, anon, authenticated;
comment on table public.shop_state is 'BlackSmith shop (blacksmithtools): whole store state as one versioned JSONB row. Server (service role) only.';
comment on table public.shop_state_history is 'BlackSmith shop: last 200 previous versions of shop_state. Server only.';
