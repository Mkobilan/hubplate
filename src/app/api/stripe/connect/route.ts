// Stripe Connect onboarding API route
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create or retrieve Stripe Connect account
        const { data: profile } = await supabase
            .from('locations')
            .select('stripe_account_id')
            .eq('owner_id', user.id)
            .single();

        let accountId = profile?.stripe_account_id;

        if (!accountId) {
            // Create a new Stripe Connect account
            const account = await stripe.accounts.create({
                type: 'express',
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });
            accountId = account.id;

            // Save the account ID to the database
            await supabase
                .from('locations')
                .update({ stripe_account_id: accountId })
                .eq('owner_id', user.id);
        }

        // Create an account link for onboarding
        const origin = request.headers.get('origin') || 'http://localhost:3000';
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${origin}/dashboard/settings/payments?refresh=true`,
            return_url: `${origin}/dashboard/settings/payments?success=true`,
            type: 'account_onboarding',
        });

        return NextResponse.json({ url: accountLink.url });
    } catch (error) {
        console.error('Stripe Connect error:', error);
        return NextResponse.json(
            { error: 'Failed to create onboarding link' },
            { status: 500 }
        );
    }
}
