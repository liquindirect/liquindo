-- Remove Flag Maker and permanently discard its saved shape library and history.
drop table if exists public.flagmaker_shapes cascade;
drop table if exists public.flagmaker_shape_history cascade;
drop function if exists public.capture_flagmaker_shape_history() cascade;
