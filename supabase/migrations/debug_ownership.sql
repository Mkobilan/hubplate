-- Direct query to check organization ownership
-- This will show us what's actually in the database

SELECT 
    'Organization Check' as check_type,
    id,
    name,
    owner_id,
    is_active
FROM public.organizations
WHERE id = '58d56989-1b05-459e-8b3a-961f8f76a8c9';

-- Check if the user ID matches the organization owner
SELECT 
    'Ownership Match' as check_type,
    id,
    name,
    owner_id,
    CASE 
        WHEN owner_id = '79e56709-95e0-48a2-84ed-83d208f07ff2' THEN 'YES - User owns this org'
        ELSE 'NO - User does NOT own this org. Owner is: ' || owner_id
    END as ownership_status
FROM public.organizations
WHERE id = '58d56989-1b05-459e-8b3a-961f8f76a8c9';

-- Check the location details
SELECT 
    'Location Check' as check_type,
    id,
    name,
    owner_id as location_owner_id,
    organization_id
FROM public.locations
WHERE id = '163ad55e-1cf3-4827-988f-ab966cceb240';

-- Find all employees for this user
SELECT 
    'All User Employees' as check_type,
    e.id,
    e.location_id,
    e.role,
    e.is_active,
    l.name as location_name
FROM public.employees e
LEFT JOIN public.locations l ON l.id = e.location_id
WHERE e.user_id = '79e56709-95e0-48a2-84ed-83d208f07ff2';

-- Test the security definer function directly
SELECT 
    'Function Test' as check_type,
    public.user_can_manage_seating_for_location('163ad55e-1cf3-4827-988f-ab966cceb240') as can_manage;
