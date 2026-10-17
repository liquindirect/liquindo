create table if not exists public.flagmaker_shapes (
  shape_id text primary key,
  label text not null check (char_length(label) between 1 and 80),
  path_d text,
  is_builtin boolean not null default false,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint flagmaker_shape_id_format check (shape_id ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  constraint flagmaker_shape_path_length check (path_d is null or char_length(path_d) <= 5000)
);

alter table public.flagmaker_shapes enable row level security;

drop policy if exists "Active flagmaker shapes are readable" on public.flagmaker_shapes;
create policy "Active flagmaker shapes are readable"
on public.flagmaker_shapes for select to anon, authenticated
using (
  is_active = true
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "Admins manage flagmaker shapes" on public.flagmaker_shapes;
create policy "Admins manage flagmaker shapes"
on public.flagmaker_shapes for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

grant select on public.flagmaker_shapes to anon, authenticated;
grant insert, update, delete on public.flagmaker_shapes to authenticated;

insert into public.flagmaker_shapes (shape_id, label, is_builtin, is_active) values
('hstripe','Horizontal stripe',true,true),('vstripe','Vertical stripe',true,true),('circle','Circle',true,true),('star','Star',true,true),('triangle','Triangle',true,true),('cross','Cross',true,true),('crescent','Crescent',true,true),('diamond','Diamond',true,true),('yin-yang','Yin-yang',true,true),
('pentagon','Pentagon',true,true),('hexagon','Hexagon',true,true),('octagon','Octagon',true,true),('six-star','Six-point star',true,true),('eight-star','Eight-point star',true,true),('four-star','Four-point star',true,true),('twelve-star','Twelve-point star',true,true),('ring','Ring',true,true),('ellipse','Ellipse',true,true),('rectangle','Rectangle',true,true),('parallelogram','Parallelogram',true,true),('trapezoid','Trapezoid',true,true),('arrow','Arrow',true,true),('chevron','Chevron',true,true),('shield','Shield',true,true),('heart','Heart',true,true),('sunburst','Sunburst',true,true),('wave','Wave band',true,true),
('crown','Crown',true,true),('torch','Torch',true,true),('mountain','Mountain',true,true),('tree','Tree',true,true),('bird','Flying bird',true,true),('globe','Globe',true,true),('fleur','Fleur-de-lis',true,true),('anchor','Anchor',true,true),('iron-cross','Iron Cross',true,true),('fasces','Fasces',true,true),('eagle','Imperial Eagle',true,true),('skull','Skull and Crossbones',true,true),('fist','Clenched Fist',true,true),('swords','Crossed Swords',true,true),('lightning','Lightning Bolt',true,true),('hammer-sickle','Hammer and Sickle',true,true),('swastika','Swastika (historical symbol)',true,true),('double-eagle','Double-headed Eagle',true,true),('laurel','Laurel Wreath',true,true),('sceptre','Sceptre',true,true),('crowned-shield','Crowned Shield',true,true),('rifles','Crossed Rifles',true,true),('cannons','Crossed Cannons',true,true),('helmet','Military Helmet',true,true),('spears','Crossed Spears',true,true),('cogwheel','Cogwheel',true,true),('arrow-cross','Arrow Cross',true,true),('black-sun','Black Sun',true,true),('wolfsangel','Wolfsangel',true,true),('totenkopf','Totenkopf-style Skull',true,true),('fasces-variant','Fasces Variant',true,true),('interlocking-rings','Interlocking Rings',true,true),('compass','Eight-point Compass',true,true),('ornamental-knot','Ornamental Knot',true,true),('rosette','Radial Rosette',true,true),('armband','Armband',true,true),('party-badge','Round Badge',true,true),('text','Text',true,true)
on conflict (shape_id) do nothing;