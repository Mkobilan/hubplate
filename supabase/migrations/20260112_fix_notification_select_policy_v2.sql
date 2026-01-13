-- FIX: Notification Visibility V2 (Shared Terminal Support)
-- Problem: Previous RLS only worked if the device was logged in as the specific recipient.
--          In Shared Terminal mode, a Manager is logged in, but staff "clock in" and expect to see their alerts.
-- Fix: Allow Managers/Owners to view ANY notification for their location.

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        -- 1. Personal Device: The notification is for me (my employee record linked to my auth user)
        recipient_id IN (
            SELECT id FROM public.employees WHERE user_id = (select auth.uid())
        )
        OR
        -- 2. Shared Terminal: I am a Manager/Owner/GM/AGM at this location
        --    This allows the logged-in Manager account to fetch notifications for the 'Clocked In' server.
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (select auth.uid())
            AND e.location_id = notifications.location_id
            AND e.role IN ('manager', 'owner', 'gm', 'agm')
        )
        OR
        -- 3. Org Owner: Maximum privilege
        EXISTS (
            SELECT 1 FROM public.locations l
            WHERE l.id = notifications.location_id
            AND l.owner_id = (select auth.uid())
        )
    );

-- Also update the UPDATE policy to support shared terminals
DROP POLICY IF EXISTS "Recipients can update notifications" ON public.notifications;

CREATE POLICY "Recipients can update notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (
        -- 1. Personal Device
        recipient_id IN (
            SELECT id FROM public.employees WHERE user_id = (select auth.uid())
        )
        OR
        -- 2. Shared Terminal (Manager/Owner)
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (select auth.uid())
            AND e.location_id = notifications.location_id
            AND e.role IN ('manager', 'owner', 'gm', 'agm')
        )
        OR
        -- 3. Org Owner
        EXISTS (
            SELECT 1 FROM public.locations l
            WHERE l.id = notifications.location_id
            AND l.owner_id = (select auth.uid())
        )
    );

