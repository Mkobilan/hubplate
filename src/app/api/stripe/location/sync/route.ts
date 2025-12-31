import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { locationId } = await request.json();

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
        }

        const adminSupabase = await createAdminClient();

        // 1. Get the location and its organization
        const { data: locationData, error: locError } = await adminSupabase
            .from('locations')
            .select('id, organization_id, is_paid')
            .eq('id', locationId)
            .single();

        const location = locationData as any;

        if (locError || !location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        // 2. Get the organization's Stripe customer ID
        const { data: orgData, error: orgError } = await adminSupabase
            .from('organizations')
            .select('stripe_customer_id')
            .eq('id', location.organization_id)
            .single();

        const org = orgData as any;

        if (orgError || !org?.stripe_customer_id) {
            // If first location and not paid, maybe it should be paid (migration/logic handled this usually)
            return NextResponse.json({ error: 'Stripe customer not found for this organization' }, { status: 404 });
        }

        // 3. Search Stripe subscriptions for this location_id in metadata
        const subscriptions = await stripe.subscriptions.list({
            customer: org.stripe_customer_id,
            status: 'all',
            limit: 100
        });

        const locationSub = subscriptions.data.find(sub =>
            sub.metadata.location_id === locationId &&
            (sub.status === 'active' || sub.status === 'trialing')
        );

        if (locationSub) {
            // Found an active subscription for this location
            const { error: updateError } = await (adminSupabase.from('locations') as any)
                .update({
                    is_paid: true,
                    stripe_subscription_item_id: locationSub.items.data[0]?.id
                })
                .eq('id', locationId);

            if (updateError) {
                return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                is_paid: true,
                status: locationSub.status
            });
        }

        return NextResponse.json({
            success: true,
            is_paid: location.is_paid,
            message: 'No active subscription found on Stripe for this location'
        });

    } catch (error: any) {
        console.error('Sync location status error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
