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
            .single() as { data: { locations: { stripe_account_id: string } | null } | null; error: any };

        if (error || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const stripeAccountId = order.locations?.stripe_account_id;

        // Calculate total in cents
        const totalCents = Math.round((amount + (tip || 0)) * 100);

        // Create payment intent options
        const paymentIntentOptions: any = {
            amount: totalCents,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            metadata: {
                order_id: orderId,
                tip_amount: tip?.toString() || '0',
            },
        };

        // If restaurant has Stripe Connect set up, use it
        // Otherwise, payments go directly to the platform account (for testing)
        if (stripeAccountId) {
            paymentIntentOptions.transfer_data = {
                destination: stripeAccountId,
            };
            // Platform fee (2.5%) when using Connect
            paymentIntentOptions.application_fee_amount = Math.round(totalCents * 0.025);
        }
        // Note: In production, you may want to require stripeAccountId
        // For now, we allow direct payments for testing

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

        // Update order with payment intent ID
        await (supabase.from('orders') as any)
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
