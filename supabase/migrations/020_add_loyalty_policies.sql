-- Add RLS policies for loyalty and feedback tables that were missing them

-- 1. Loyalty Rewards
CREATE POLICY "Location access for loyalty_rewards" ON public.loyalty_rewards
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
        )
    );

-- 2. Reward Redemptions
CREATE POLICY "Location access for reward_redemptions" ON public.reward_redemptions
    FOR ALL USING (
        customer_id IN (
            SELECT id FROM public.customers WHERE location_id IN (
                SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
            )
        )
    );

-- 3. Customer Feedback
CREATE POLICY "Location access for customer_feedback" ON public.customer_feedback
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
        )
    );

-- 4. Marketing Campaigns
CREATE POLICY "Location access for marketing_campaigns" ON public.marketing_campaigns
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
        )
    );

-- 5. Daily Sales Summary
CREATE POLICY "Location access for daily_sales_summary" ON public.daily_sales_summary
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
        )
    );
