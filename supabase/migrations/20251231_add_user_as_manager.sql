-- TEMPORARY FIX: Add user as manager employee for this location
-- This will allow them to create sections immediately

-- First, let's check if this would create a duplicate
DO $$
BEGIN
    -- Only insert if the employee record doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM public.employees
        WHERE user_id = '79e56709-95e0-48a2-84ed-83d208f07ff2'
        AND location_id = '163ad55e-1cf3-4827-988f-ab966cceb240'
    ) THEN
        -- Insert the employee record
        INSERT INTO public.employees (
            user_id,
            location_id,
            organization_id,
            first_name,
            last_name,
            role,
            is_active
        )
        VALUES (
            '79e56709-95e0-48a2-84ed-83d208f07ff2',
            '163ad55e-1cf3-4827-988f-ab966cceb240',
            '58d56989-1b05-459e-8b3a-961f8f76a8c9',
            'Manager',  -- You can update this later
            'User',     -- You can update this later
            'manager',
            true
        );
        
        RAISE NOTICE 'Employee record created successfully';
    ELSE
        RAISE NOTICE 'Employee record already exists';
    END IF;
END $$;

-- Verify the insert
SELECT 
    'Verification' as check,
    id,
    user_id,
    location_id,
    role,
    is_active
FROM public.employees
WHERE user_id = '79e56709-95e0-48a2-84ed-83d208f07ff2'
AND location_id = '163ad55e-1cf3-4827-988f-ab966cceb240';
