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

        const { locationId, orgId } = await request.json();

        if (!locationId || !orgId) {
            return NextResponse.json({ error: 'Location ID and Org ID are required' }, { status: 400 });
        }

        const adminSupabase = await createAdminClient();

        // 1. Get Organization for Stripe info
        const { data: orgData, error: orgError } = await adminSupabase
            .from('organizations')
            .select('stripe_subscription_id, stripe_customer_id')
            .eq('id', orgId)
            .eq('owner_id', user.id)
            .single();

        const org = orgData as any;

        if (orgError || !org?.stripe_subscription_id) {
            return NextResponse.json({ error: 'Active subscription not found for this organization' }, { status: 404 });
        }

        // 2. Get the subscription from Stripe to find the line item
        const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
        const subscriptionItem = subscription.items.data[0]; // Assuming only one product type for now

        // 3. Create a Checkout Session for the upgrade (or update subscription directly)
        // For a smoother UX we use a checkout session for adding a new item/incrementing quantity
        // This allows the user to confirm the price.

        const origin = request.headers.get('origin') || 'http://localhost:3000';

        const session = await stripe.checkout.sessions.create({
            customer: org.stripe_customer_id as string,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || 'price_1Sk1m4LqdneHwurFvLvkPbat',
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            metadata: {
                organization_id: orgId,
                location_id: locationId,
                type: 'add_location'
            },
            subscription_data: {
                metadata: {
                    organization_id: orgId,
                    location_id: locationId,
                    type: 'add_location'
                }
            },
            success_url: `${origin}/dashboard/locations?success=true&location_id=${locationId}`,
            cancel_url: `${origin}/dashboard/locations?cancelled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Add location checkout error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
