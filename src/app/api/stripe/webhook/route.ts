// Stripe webhook handler
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Use service role for webhook processing
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Payment succeeded:', paymentIntent.id);

            // Update order status in database
            if (paymentIntent.metadata?.order_id) {
                const { error: updateError } = await supabaseAdmin
                    .from('orders')
                    .update({
                        payment_status: 'paid',
                        stripe_payment_intent_id: paymentIntent.id,
                        paid_at: new Date().toISOString()
                    })
                    .eq('id', paymentIntent.metadata.order_id);

                if (updateError) {
                    console.error('Failed to update order payment status:', updateError);
                } else {
                    console.log('Order marked as paid:', paymentIntent.metadata.order_id);
                }
            }
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Payment failed:', failedPayment.id);

            if (failedPayment.metadata?.order_id) {
                await supabaseAdmin
                    .from('orders')
                    .update({ payment_status: 'failed' })
                    .eq('id', failedPayment.metadata.order_id);
            }
            break;

        case 'account.updated':
            const account = event.data.object;
            console.log('Stripe account updated:', account.id);

            // Update account status in database
            await supabaseAdmin
                .from('locations')
                .update({
                    stripe_onboarding_complete: account.details_submitted && account.charges_enabled
                })
                .eq('stripe_account_id', account.id);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
