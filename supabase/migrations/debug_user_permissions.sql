-- Diagnostic query to check user permissions for seating maps
-- Replace 'YOUR_USER_ID' with the actual user ID: 79e56709-95e0-48a2-84ed-83d208f07ff2
-- Replace 'YOUR_LOCATION_ID' with the actual location ID

-- 1. Check if user exists in employees table for this location
SELECT 
    'Employee Record' as check_type,
    e.id,
    e.user_id,
    e.location_id,
    e.role,
    e.is_active,
    e.organization_id
FROM public.employees e
WHERE e.user_id = '79e56709-95e0-48a2-84ed-83d208f07ff2';

-- 2. Check if user is a location owner
SELECT 
    'Location Owner' as check_type,
    l.id as location_id,
    l.name as location_name,
    l.owner_id,
    l.organization_id
FROM public.locations l
WHERE l.owner_id = '79e56709-95e0-48a2-84ed-83d208f07ff2';

-- 3. Check if user is an organization owner
SELECT 
    'Organization Owner' as check_type,
    o.id as org_id,
    o.name as org_name,
    o.owner_id
FROM public.organizations o
WHERE o.owner_id = '79e56709-95e0-48a2-84ed-83d208f07ff2';

-- 4. Check all locations linked to user's organizations
SELECT 
    'Org Locations' as check_type,
    l.id as location_id,
    l.name as location_name,
    l.organization_id,
    o.name as org_name
FROM public.locations l
JOIN public.organizations o ON o.id = l.organization_id
WHERE o.owner_id = '79e56709-95e0-48a2-84ed-83d208f07ff2';

-- 5. Test the RLS policy directly (this will show if the policy allows access)
-- This simulates what happens when trying to insert
SELECT 
    'RLS Policy Test' as check_type,
    EXISTS (
        select 1 from public.employees
        where employees.user_id = '79e56709-95e0-48a2-84ed-83d208f07ff2'
        and employees.location_id = 'YOUR_LOCATION_ID_HERE'  -- Replace with actual location_id
        and employees.role in ('owner', 'manager')
        and employees.is_active = true
    ) as has_employee_access,
    EXISTS (
        select 1 from public.organizations
        join public.locations on locations.organization_id = organizations.id
        where locations.id = 'YOUR_LOCATION_ID_HERE'  -- Replace with actual location_id
        and organizations.owner_id = '79e56709-95e0-48a2-84ed-83d208f07ff2'
    ) as has_org_owner_access,
    EXISTS (
        select 1 from public.locations
        where locations.id = 'YOUR_LOCATION_ID_HERE'  -- Replace with actual location_id
        and locations.owner_id = '79e56709-95e0-48a2-84ed-83d208f07ff2'
    ) as has_location_owner_access;
