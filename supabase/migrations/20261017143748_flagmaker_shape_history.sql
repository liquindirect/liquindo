-- Historical shape-library audit history; removed by 20261024130700.
create table if not exists public.flagmaker_shape_history (
 id bigint generated always as identity primary key,
 shape_id bigint,
 action text not null check (action in ('insert','update','delete')),
 snapshot jsonb not null,
 changed_by uuid references auth.users(id) on delete set null,
 changed_at timestamptz not null default now()
);
alter table public.flagmaker_shape_history enable row level security;
drop policy if exists "Admins read flagmaker shape history" on public.flagmaker_shape_history;
create policy "Admins read flagmaker shape history" on public.flagmaker_shape_history for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin'));
grant select on public.flagmaker_shape_history to authenticated;

create or replace function public.capture_flagmaker_shape_history()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.flagmaker_shape_history(shape_id,action,snapshot,changed_by)
 values(case when tg_op='DELETE' then old.id else new.id end,lower(tg_op),to_jsonb(case when tg_op='DELETE' then old else new end),auth.uid());
 return case when tg_op='DELETE' then old else new end;
end; $$;
drop trigger if exists capture_flagmaker_shape_history on public.flagmaker_shapes;
create trigger capture_flagmaker_shape_history after insert or update or delete on public.flagmaker_shapes
for each row execute function public.capture_flagmaker_shape_history();
