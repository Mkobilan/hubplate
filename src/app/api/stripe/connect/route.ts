// Stripe Connect onboarding API route
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const locationId = searchParams.get('locationId');

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
        }

        // Fetch location data
        const { data: location, error: fetchError } = await (supabase
            .from('locations') as any)
            .select('id, stripe_account_id, stripe_onboarding_complete')
            .eq('id', locationId)
            .eq('owner_id', user.id)
            .single();

        if (fetchError || !location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        if (location.stripe_onboarding_complete) {
            return NextResponse.json({ status: 'complete' });
        }

        if (!location.stripe_account_id) {
            return NextResponse.json({ status: 'not_started' });
        }

        // Retrieve the account from Stripe to verify status
        const account = await stripe.accounts.retrieve(location.stripe_account_id);

        const isComplete = account.details_submitted && account.charges_enabled;

        if (isComplete) {
            // Sync status to database
            await (supabase
                .from('locations') as any)
                .update({ stripe_onboarding_complete: true })
                .eq('id', locationId);
        }

        return NextResponse.json({
            status: isComplete ? 'complete' : 'pending',
            details_submitted: account.details_submitted,
            charges_enabled: account.charges_enabled
        });
    } catch (error: any) {
        console.error('Stripe Status Sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to sync account status' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { locationId } = body;

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
        }

        // Create or retrieve Stripe Connect account for the specific location
        const { data: location, error: fetchError } = await supabase
            .from('locations')
            .select('id, stripe_account_id, name')
            .eq('id', locationId)
            .eq('owner_id', user.id)
            .single() as any;

        if (fetchError || !location) {
            console.error('Location fetch error:', fetchError);
            return NextResponse.json({ error: 'Location not found or unauthorized' }, { status: 404 });
        }

        let accountId = location.stripe_account_id;

        if (!accountId) {
            // Create a new Stripe Connect account
            const account = await stripe.accounts.create({
                type: 'express',
                email: user.email || undefined,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                metadata: {
                    location_id: location.id,
                    location_name: location.name,
                    owner_id: user.id
                }
            });
            accountId = account.id;

            // Save the account ID to the specific location
            const { error: updateError } = await (supabase
                .from('locations') as any)
                .update({ stripe_account_id: accountId })
                .eq('id', locationId);

            if (updateError) {
                console.error('Database update error:', updateError);
                throw new Error('Failed to update location with Stripe account ID');
            }
        }

        // Create an account link for onboarding
        const origin = request.headers.get('origin') || 'http://localhost:3000';
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${origin}/dashboard/settings/payments?locationId=${locationId}&refresh=true`,
            return_url: `${origin}/dashboard/settings/payments?locationId=${locationId}&success=true`,
            type: 'account_onboarding',
        });

        return NextResponse.json({ url: accountLink.url });
    } catch (error: any) {
        console.error('Stripe Connect error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create onboarding link' },
            { status: 500 }
        );
    }
}
