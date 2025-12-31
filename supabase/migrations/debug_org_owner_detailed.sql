-- Debug: Check the actual organization ownership
-- Run this to see what's in the database

SELECT 
    'Organization ownership check' as test,
    o.id as org_id,
    o.name as org_name,
    o.owner_id as org_owner_id,
    '79e56709-95e0-48a2-84ed-83d208f07ff2' as current_user_id,
    CASE 
        WHEN o.owner_id = '79e56709-95e0-48a2-84ed-83d208f07ff2' THEN 'YES - User IS org owner'
        ELSE 'NO - Org owner is: ' || o.owner_id
    END as is_owner
FROM public.organizations o
WHERE o.id = '58d56989-1b05-459e-8b3a-961f8f76a8c9';

-- Check location existence and ownership
SELECT 
    'Location check' as test,
    l.id as location_id,
    l.name as location_name,
    l.owner_id as location_owner_id,
    l.organization_id,
    CASE 
        WHEN l.id = '163ad55e-1cf3-4827-988f-ab966cceb240' THEN 'Location EXISTS'
        ELSE 'Location NOT FOUND'
    END as location_status
FROM public.locations l
WHERE l.id = '163ad55e-1cf3-4827-988f-ab966cceb240';

-- Check if location belongs to the organization
SELECT 
    'Org-Location link' as test,
    l.id as location_id,
    l.name as location_name,
    l.organization_id,
    o.name as org_name,
    o.owner_id as org_owner_id
FROM public.locations l
JOIN public.organizations o ON o.id = l.organization_id
WHERE l.id = '163ad55e-1cf3-4827-988f-ab966cceb240'
AND l.organization_id = '58d56989-1b05-459e-8b3a-961f8f76a8c9';

-- Test the function step by step
SELECT 
    'Step 1: Check employee' as test,
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = '79e56709-95e0-48a2-84ed-83d208f07ff2'
        AND employees.location_id = '163ad55e-1cf3-4827-988f-ab966cceb240'
        AND employees.role IN ('owner', 'manager')
        AND employees.is_active = true
    ) as has_employee_access;

SELECT 
    'Step 2: Check direct location owner' as test,
    EXISTS (
        SELECT 1 FROM public.locations
        WHERE locations.id = '163ad55e-1cf3-4827-988f-ab966cceb240'
        AND locations.owner_id = '79e56709-95e0-48a2-84ed-83d208f07ff2'
    ) as is_location_owner;

SELECT 
    'Step 3: Check org owner' as test,
    EXISTS (
        SELECT 1 FROM public.locations
        JOIN public.organizations ON organizations.id = locations.organization_id
        WHERE locations.id = '163ad55e-1cf3-4827-988f-ab966cceb240'
        AND organizations.owner_id = '79e56709-95e0-48a2-84ed-83d208f07ff2'
    ) as is_org_owner;
