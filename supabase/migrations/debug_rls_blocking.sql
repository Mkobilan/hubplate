-- Test if we can read the organizations table at all
-- This will tell us if RLS is blocking the query

-- Test 1: Can we read the organization directly?
SELECT 
    'Direct org query' as test,
    id,
    name,
    owner_id
FROM public.organizations
WHERE id = '58d56989-1b05-459e-8b3a-961f8f76a8c9';

-- Test 2: Can we read the location?
SELECT 
    'Direct location query' as test,
    id,
    name,
    organization_id,
    owner_id
FROM public.locations
WHERE id = '163ad55e-1cf3-4827-988f-ab966cceb240';

-- Test 3: Try the JOIN without auth context (as superuser/admin)
-- This simulates what SECURITY DEFINER should do
SELECT 
    'JOIN test' as test,
    l.id as location_id,
    l.organization_id,
    o.id as org_id,
    o.owner_id as org_owner_id
FROM public.locations l
LEFT JOIN public.organizations o ON o.id = l.organization_id
WHERE l.id = '163ad55e-1cf3-4827-988f-ab966cceb240';

-- Test 4: Check if the specific user owns this org
SELECT 
    'Ownership test' as test,
    COUNT(*) as org_count,
    MAX(owner_id) as actual_owner_id,
    CASE 
        WHEN MAX(owner_id) = '79e56709-95e0-48a2-84ed-83d208f07ff2' THEN 'YES'
        ELSE 'NO - Owner is: ' || MAX(owner_id)
    END as user_is_owner
FROM public.organizations
WHERE id = '58d56989-1b05-459e-8b3a-961f8f76a8c9';
