-- Migration 021: Add category and liquidity fields to public.investments and enable Realtime sync
alter table public.investments
  add column if not exists category text not null default 'Other',
  add column if not exists is_liquid boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'investments'
  ) then
    alter publication supabase_realtime add table public.investments;
  end if;
end $$;

alter table public.investments replica identity full;
