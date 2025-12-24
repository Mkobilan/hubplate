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
                const orderId = paymentIntent.metadata.order_id;
                const { data: order, error: orderError } = await (supabaseAdmin
                    .from('orders') as any)
                    .select('*, locations(id)')
                    .eq('id', orderId)
                    .single();

                if (orderError) {
                    console.error('Failed to fetch order for loyalty update:', orderError);
                } else {
                    // Update order as paid
                    await supabaseAdmin
                        .from('orders')
                        .update({
                            payment_status: 'paid',
                            stripe_payment_intent_id: paymentIntent.id,
                            paid_at: new Date().toISOString()
                        })
                        .eq('id', orderId);

                    // Loyalty Points Logic
                    let customerPhone = order.customer_phone;
                    const customerEmail = order.customer_email;

                    if (customerPhone || customerEmail) {
                        // Standardize phone
                        if (customerPhone) customerPhone = customerPhone.replace(/\D/g, '');
                        // 1. Get Earning Rate
                        const { data: program } = await (supabaseAdmin
                            .from('loyalty_programs') as any)
                            .select('points_per_dollar')
                            .eq('location_id', order.location_id)
                            .single();

                        const rate = (program as any)?.points_per_dollar || 1;
                        const pointsEarned = Math.floor((order.total || 0) * rate);
                        const pointsRedeemed = order.points_redeemed || 0;

                        // 2. Find Customer
                        let customer;
                        if (customerPhone) {
                            const { data } = await (supabaseAdmin.from('customers') as any)
                                .select('*').eq('location_id', order.location_id).eq('phone', customerPhone).maybeSingle();
                            customer = data;
                        } else {
                            const { data } = await (supabaseAdmin.from('customers') as any)
                                .select('*').eq('location_id', order.location_id).eq('email', customerEmail).maybeSingle();
                            customer = data;
                        }

                        if (customer) {
                            const newPointBalance = Math.max(0, (customer.loyalty_points || 0) + pointsEarned - pointsRedeemed);
                            const newVisitCount = (customer.total_visits || 0) + 1;
                            const newTotalSpent = (customer.total_spent || 0) + (order.total || 0);

                            await (supabaseAdmin.from('customers') as any)
                                .update({
                                    loyalty_points: newPointBalance,
                                    total_visits: newVisitCount,
                                    total_spent: newTotalSpent,
                                    is_loyalty_member: true, // Auto-enroll if paying and provided contact
                                    last_visit_at: new Date().toISOString()
                                })
                                .eq('id', customer.id);

                            console.log(`Updated loyalty for customer ${customer.id}: +${pointsEarned} earned, -${pointsRedeemed} redeemed.`);
                        }
                    }
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
