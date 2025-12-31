import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    console.log('--- POST /api/stripe/create-subscription hit ---');
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { priceId, orgId } = await request.json();

        if (!priceId) {
            return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
        }

        // 1. Get or create Stripe Customer
        const adminSupabase = await createAdminClient();
        console.log('Searching for organization...', orgId ? `Explicit ID: ${orgId}` : `Owner ID: ${user.id}`);

        let query = adminSupabase
            .from('organizations')
            .select('id, name, stripe_customer_id')
            .eq('owner_id', user.id);

        if (orgId) {
            query = query.eq('id', orgId);
        } else {
            // Fallback to latest organization if no ID provided
            query = query.order('created_at', { ascending: false }).limit(1);
        }

        const { data: orgData, error: lookupError } = await query.maybeSingle();

        if (lookupError) {
            console.error('Organization lookup error:', lookupError);
        }

        const org = orgData as any;

        if (!org) {
            console.log('Organization NOT FOUND in database for user:', user.id);
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        console.log('Organization found:', org.name, 'with ID:', org.id);

        let customerId = org.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email as string,
                name: org.name,
                metadata: {
                    organization_id: org.id,
                    user_id: user.id
                }
            });
            customerId = customer.id;

            await (adminSupabase.from('organizations') as any)
                .update({ stripe_customer_id: customerId })
                .eq('id', org.id);
        }

        // 2. Create Checkout Session
        const origin = request.headers.get('origin') || 'http://localhost:3000';

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            allow_promotion_codes: true,
            subscription_data: {
                trial_period_days: 14,
                metadata: {
                    organization_id: org.id
                }
            },
            success_url: `${origin}/dashboard?signup_success=true`,
            cancel_url: `${origin}/billing-setup?cancelled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
