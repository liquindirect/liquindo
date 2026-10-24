-- Do not create shape-history entries for sort-order-only changes.
create or replace function public.capture_flagmaker_shape_history()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' then
  if (to_jsonb(old) - 'sort_order' - 'updated_at') = (to_jsonb(new) - 'sort_order' - 'updated_at') then return new; end if;
 end if;
 insert into public.flagmaker_shape_history(shape_id,action,snapshot,changed_by)
 values(case when tg_op='DELETE' then old.id else new.id end,lower(tg_op),case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end,auth.uid());
 return case when tg_op='DELETE' then old else new end;
end; $$;
