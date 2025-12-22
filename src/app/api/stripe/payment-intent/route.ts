// Create payment intent for orders
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { orderId, amount, tip } = await request.json();

        // Get order details
        const { data: order, error } = await supabase
            .from('orders')
            .select('*, locations(stripe_account_id)')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const stripeAccountId = order.locations?.stripe_account_id;
        if (!stripeAccountId) {
            return NextResponse.json({ error: 'Restaurant not set up for payments' }, { status: 400 });
        }

        // Calculate total in cents
        const totalCents = Math.round((amount + (tip || 0)) * 100);

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalCents,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            metadata: {
                order_id: orderId,
                tip_amount: tip?.toString() || '0',
            },
            // For Stripe Connect, specify the connected account
            transfer_data: {
                destination: stripeAccountId,
            },
            // Platform fee (optional - e.g., 2.5%)
            application_fee_amount: Math.round(totalCents * 0.025),
        });

        // Update order with payment intent ID
        await supabase
            .from('orders')
            .update({
                stripe_payment_intent_id: paymentIntent.id,
                payment_status: 'pending'
            })
            .eq('id', orderId);

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });
    } catch (error) {
        console.error('Payment intent error:', error);
        return NextResponse.json(
            { error: 'Failed to create payment' },
            { status: 500 }
        );
    }
}
