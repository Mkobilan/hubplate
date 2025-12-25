// Create payment intent for orders
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS (customers aren't logged in)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { orderId, amount, tip, discountAmount, pointsRedeemed } = await request.json();

        console.log('Payment intent request for order:', orderId, 'amount:', amount, 'discount:', discountAmount);

        // Get order details including existing payment intent
        const { data: order, error } = await (supabaseAdmin
            .from('orders') as any)
            .select('*, locations(stripe_account_id)')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            console.error('Order not found:', error);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // If order is already paid, don't create new payment intent
        if (order.payment_status === 'paid') {
            return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
        }

        // Calculate total in cents
        const finalAmount = Math.max(0, amount + (tip || 0) - (discountAmount || 0));
        const totalCents = Math.round(finalAmount * 100);

        // Update order with discount and tip info pre-emptively
        await (supabaseAdmin.from('orders') as any)
            .update({
                discount: discountAmount || 0,
                points_redeemed: pointsRedeemed || 0,
                tip: tip || 0,
                payment_method: 'card',
                total: finalAmount
            })
            .eq('id', orderId);

        // If a payment intent already exists, try to retrieve it
        if (order.stripe_payment_intent_id) {
            try {
                const existingIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);

                // If the existing intent is still usable, return it
                if (existingIntent.status === 'requires_payment_method' ||
                    existingIntent.status === 'requires_confirmation' ||
                    existingIntent.status === 'requires_action') {

                    // If the amount has changed (e.g. discount applied), update the intent
                    if (existingIntent.amount !== totalCents) {
                        console.log('Updating existing payment intent amount:', totalCents);
                        await stripe.paymentIntents.update(existingIntent.id, {
                            amount: totalCents,
                            metadata: {
                                ...existingIntent.metadata,
                                tip_amount: tip?.toString() || '0',
                                discount_amount: discountAmount?.toString() || '0',
                                points_redeemed: pointsRedeemed?.toString() || '0'
                            }
                        });
                    }

                    return NextResponse.json({
                        clientSecret: existingIntent.client_secret,
                        paymentIntentId: existingIntent.id,
                    });
                }

                // If it succeeded, mark order as paid
                if (existingIntent.status === 'succeeded') {
                    await (supabaseAdmin.from('orders') as any)
                        .update({ payment_status: 'paid', completed_at: new Date().toISOString() })
                        .eq('id', orderId);
                    return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
                }
            } catch (retrieveError) {
                console.log('Could not retrieve existing intent, creating new one');
            }
        }

        const stripeAccountId = order.locations?.stripe_account_id;

        // Create payment intent options
        const paymentIntentOptions: any = {
            amount: totalCents,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            metadata: {
                order_id: orderId,
                tip_amount: tip?.toString() || '0',
                discount_amount: discountAmount?.toString() || '0',
                points_redeemed: pointsRedeemed?.toString() || '0'
            },
        };

        // If restaurant has Stripe Connect set up, use it
        if (stripeAccountId) {
            paymentIntentOptions.transfer_data = {
                destination: stripeAccountId,
            };
            paymentIntentOptions.application_fee_amount = Math.round(totalCents * 0.025);
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
        console.log('Created new payment intent:', paymentIntent.id);

        // Update order with payment intent ID
        await (supabaseAdmin.from('orders') as any)
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
