-- Add category and stable ordering to the historical Flag Maker library.
alter table public.flagmaker_shapes add column if not exists category text not null default 'general';
alter table public.flagmaker_shapes add column if not exists sort_order integer not null default 0;
create index if not exists flagmaker_shapes_category_sort_idx on public.flagmaker_shapes(category, sort_order, name);
