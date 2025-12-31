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

        const adminSupabase = await createAdminClient();

        // 1. Get the organization
        // We look for the org owned by this user
        const { data: org, error: orgError } = await adminSupabase
            .from('organizations')
            .select('id, stripe_customer_id, subscription_status')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (orgError || !org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        if (!org.stripe_customer_id) {
            return NextResponse.json({ status: 'no_customer_id' });
        }

        console.log(`Syncing status for org ${org.id} (Customer: ${org.stripe_customer_id})`);

        // 2. Fetch subscriptions from Stripe
        const subscriptions = await stripe.subscriptions.list({
            customer: org.stripe_customer_id,
            status: 'all',
            limit: 1
        });

        const activeSub = subscriptions.data.find(sub =>
            sub.status === 'active' || sub.status === 'trialing'
        );

        if (activeSub) {
            console.log(`Found active subscription: ${activeSub.id} (${activeSub.status})`);

            // 3. Update Database
            const { error: updateError } = await adminSupabase
                .from('organizations')
                .update({
                    stripe_subscription_id: activeSub.id,
                    subscription_status: activeSub.status,
                    trial_ends_at: activeSub.trial_end ? new Date(activeSub.trial_end * 1000).toISOString() : null,
                    onboarding_status: 'billing_completed' // Ensure they can pass check
                })
                .eq('id', org.id);

            if (updateError) {
                console.error("Failed to update org from sync:", updateError);
                return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
            }

            return NextResponse.json({
                synced: true,
                status: activeSub.status,
                subscriptionId: activeSub.id
            });
        } else {
            console.log("No active/trialing subscription found in Stripe.");
            return NextResponse.json({ synced: false, status: 'inactive' });
        }

    } catch (error: any) {
        console.error('Sync status error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
