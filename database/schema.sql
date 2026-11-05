-- Pi Toothpick: shared Buffon's needle experiment
-- Run this entire file in Supabase Dashboard > SQL Editor.

create table if not exists public.experiment_stats (
  id integer primary key check (id = 1),
  total_drops bigint not null default 0 check (total_drops >= 0),
  crossings bigint not null default 0 check (crossings >= 0 and crossings <= total_drops),
  updated_at timestamptz not null default now()
);

insert into public.experiment_stats (id, total_drops, crossings)
values (1, 0, 0)
on conflict (id) do nothing;

alter table public.experiment_stats enable row level security;

drop policy if exists "Stats are readable by everyone" on public.experiment_stats;
create policy "Stats are readable by everyone"
on public.experiment_stats for select
to anon, authenticated
using (true);

grant select on public.experiment_stats to anon, authenticated;

create or replace function public.drop_toothpick(p_crossed boolean)
returns table (total_drops bigint, crossings bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.experiment_stats as s
  set
    total_drops = s.total_drops + 1,
    crossings = s.crossings + case when p_crossed then 1 else 0 end,
    updated_at = now()
  where s.id = 1
  returning s.total_drops, s.crossings;
end;
$$;

revoke all on function public.drop_toothpick(boolean) from public;
grant execute on function public.drop_toothpick(boolean) to anon, authenticated;
