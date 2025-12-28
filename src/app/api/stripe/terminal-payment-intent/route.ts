import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { orderId, amount, tip } = await request.json();

        // Get order details
        const { data: order, error } = await (supabaseAdmin
            .from('orders') as any)
            .select('*, locations(stripe_account_id)')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const totalCents = Math.round(amount * 100);
        const stripeAccountId = order.locations?.stripe_account_id;

        const paymentIntentOptions: any = {
            amount: totalCents,
            currency: 'usd',
            payment_method_types: ['card_present'], // Required for Terminal
            capture_method: 'automatic',
            metadata: {
                order_id: orderId,
                type: 'terminal_payment'
            },
        };

        // Stripe Connect
        if (stripeAccountId) {
            paymentIntentOptions.transfer_data = {
                destination: stripeAccountId,
            };
            paymentIntentOptions.application_fee_amount = Math.round(totalCents * 0.025);
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('Terminal PI error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
