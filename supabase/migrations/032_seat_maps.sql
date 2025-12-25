-- Add updated_at trigger function if it doesn't exist
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create seating_maps table
create table if not exists public.seating_maps (
    id uuid default gen_random_uuid() primary key,
    location_id uuid not null references public.locations(id) on delete cascade,
    name text not null,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create seating_tables table
create table if not exists public.seating_tables (
    id uuid default gen_random_uuid() primary key,
    map_id uuid not null references public.seating_maps(id) on delete cascade,
    label text not null,
    shape text not null check (shape in ('rect', 'circle')),
    x float not null,
    y float not null,
    width float not null,
    height float not null,
    rotation float default 0,
    capacity integer default 4,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.seating_maps enable row level security;
alter table public.seating_tables enable row level security;

-- Policies for seating_maps

-- Read: All authenticated employees with access to the location
create policy "Employees can view seating maps"
    on public.seating_maps for select
    using (
        exists (
            select 1 from public.employees
            where employees.user_id = auth.uid()
            and employees.location_id = seating_maps.location_id
            and employees.is_active = true
        )
        or
        exists (
             -- Also allow Organization owners
             select 1 from public.organizations
             join public.locations on locations.organization_id = organizations.id
             where locations.id = seating_maps.location_id
             and organizations.owner_id = auth.uid()
        )
    );

-- Write: Managers and Owners
create policy "Managers and Owners can manage seating maps"
    on public.seating_maps for all
    using (
        exists (
            select 1 from public.employees
            where employees.user_id = auth.uid()
            and employees.location_id = seating_maps.location_id
            and employees.role in ('owner', 'manager')
            and employees.is_active = true
        )
        or
        exists (
             -- Also allow Organization owners
             select 1 from public.organizations
             join public.locations on locations.organization_id = organizations.id
             where locations.id = seating_maps.location_id
             and organizations.owner_id = auth.uid()
        )
    );

-- Policies for seating_tables

-- Read: All authenticated employees with access to the location via map
create policy "Employees can view seating tables"
    on public.seating_tables for select
    using (
        exists (
            select 1 from public.seating_maps
            join public.employees on employees.location_id = seating_maps.location_id
            where seating_maps.id = seating_tables.map_id
            and employees.user_id = auth.uid()
            and employees.is_active = true
        )
        or
        exists (
            select 1 from public.seating_maps
            join public.locations on locations.id = seating_maps.location_id
            join public.organizations on organizations.id = locations.organization_id
            where seating_maps.id = seating_tables.map_id
            and organizations.owner_id = auth.uid()
        )
    );

-- Write: Managers and Owners
create policy "Managers and Owners can manage seating tables"
    on public.seating_tables for all
    using (
        exists (
            select 1 from public.seating_maps
            join public.employees on employees.location_id = seating_maps.location_id
            where seating_maps.id = seating_tables.map_id
            and employees.user_id = auth.uid()
            and employees.role in ('owner', 'manager')
            and employees.is_active = true
        )
        or
        exists (
            select 1 from public.seating_maps
            join public.locations on locations.id = seating_maps.location_id
            join public.organizations on organizations.id = locations.organization_id
            where seating_maps.id = seating_tables.map_id
            and organizations.owner_id = auth.uid()
        )
    );

-- Add triggers for updated_at
create trigger update_seating_maps_modtime
    before update on public.seating_maps
    for each row execute procedure public.handle_updated_at();

create trigger update_seating_tables_modtime
    before update on public.seating_tables
    for each row execute procedure public.handle_updated_at();
