-- FIX: Notification Visibility
-- Problem: Users could not view their notifications because a SELECT policy was missing after recent security tightening.
-- Fix: Add a policy allowing users to select notifications where they are the recipient.

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        recipient_id IN (
            SELECT id FROM public.employees WHERE user_id = (select auth.uid())
        )
    );
