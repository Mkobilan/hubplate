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
                // Get order details
                const { data: order, error: orderError } = await (supabaseAdmin
                    .from('orders') as any)
                    .select('*')
                    .eq('id', orderId)
                    .single();

                if (orderError) {
                    console.error('CRITICAL: Failed to fetch order in webhook for ID:', orderId, orderError);
                } else {
                    console.log(`Successfully fetched order ${orderId}. Current status: ${order.status}, Subtotal: ${order.subtotal}, Tax: ${order.tax}, Discount: ${order.discount}`);

                    // SMART TIP CALCULATION:
                    // Instead of relying solely on metadata, we look at the actual amount Stripe charged.
                    // tip = stripe_total - (subtotal + tax - discount)
                    const stripeTotal = paymentIntent.amount / 100;
                    const subtotal = Number(order.subtotal) || 0;
                    const tax = Number(order.tax) || 0;
                    const discount = Number(order.discount) || 0;

                    const baseTotalBeforeTip = subtotal + tax - discount;
                    const derivedTip = Math.max(0, Number((stripeTotal - baseTotalBeforeTip).toFixed(2)));

                    console.log(`Stripe Total: ${stripeTotal}, Base Total: ${baseTotalBeforeTip}, Derived Tip: ${derivedTip}`);
                    console.log('PaymentIntent Metadata:', JSON.stringify(paymentIntent.metadata));

                    // Update order as paid with all payment details
                    const { data: updatedOrder, error: updateError } = await (supabaseAdmin
                        .from('orders') as any)
                        .update({
                            payment_status: 'paid',
                            payment_method: 'card',
                            tip: derivedTip,
                            total: stripeTotal, // Use the actual amount from Stripe
                            status: 'completed',
                            stripe_payment_intent_id: paymentIntent.id,
                            completed_at: new Date().toISOString()
                        })
                        .eq('id', orderId)
                        .select()
                        .single();

                    if (updateError) {
                        console.error('CRITICAL: Failed to update order in webhook:', updateError);
                    } else {
                        console.log(`Successfully updated order ${orderId} to COMPLETED/PAID. New Total: ${updatedOrder.total}`);
                    }

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
            const account = event.data.object as any;
            console.log('Stripe account updated:', account.id);

            // Update account status in database
            await supabaseAdmin
                .from('locations')
                .update({
                    stripe_onboarding_complete: account.details_submitted && account.charges_enabled
                })
                .eq('stripe_account_id', account.id);
            break;

        case 'checkout.session.completed':
            const session = event.data.object as any;
            console.log('--- Checkout Session Completed ---', session.id);
            console.log('Metadata:', JSON.stringify(session.metadata));

            if (session.mode === 'subscription' || session.mode === 'payment') {
                const subId = session.subscription;
                const custId = session.customer;
                const orgId = session.metadata?.organization_id || session.subscription_data?.metadata?.organization_id;

                // Fallback chain for location_id: Session Metadata -> Subscription Metadata
                let locationId = session.metadata?.location_id || session.subscription_data?.metadata?.location_id;

                if (!locationId && subId) {
                    try {
                        const subscription = await stripe.subscriptions.retrieve(subId as string);
                        locationId = subscription.metadata?.location_id;
                    } catch (err) {
                        console.error('Failed to fallback to subscription metadata:', err);
                    }
                }

                const type = session.metadata?.type || session.subscription_data?.metadata?.type;

                console.log('Extracted Data -> orgId:', orgId, 'subId:', subId, 'custId:', custId, 'locationId:', locationId, 'type:', type);

                if (type === 'add_location' && locationId) {
                    console.log(`Processing activation for location: ${locationId}`);
                    // Mark specific location as paid
                    const { data: updatedLoc, error: locUpdateError } = await (supabaseAdmin
                        .from('locations') as any)
                        .update({ is_paid: true })
                        .eq('id', locationId)
                        .select()
                        .single();

                    if (locUpdateError) {
                        console.error('Failed to update location on checkout completion:', locUpdateError);
                    } else {
                        console.log('Successfully marked location as paid:', locationId, 'New status:', updatedLoc?.is_paid);
                    }
                } else if (orgId) {
                    const { error: updateError } = await (supabaseAdmin
                        .from('organizations') as any)
                        .update({
                            stripe_subscription_id: subId,
                            stripe_customer_id: custId,
                            subscription_status: 'trialing',
                            onboarding_status: 'billing_completed'
                        })
                        .eq('id', orgId);

                    if (updateError) {
                        console.error('Failed to update organization on checkout completion:', updateError);
                    } else {
                        console.log('Successfully updated organization:', orgId);
                    }
                }
            }
            break;

        case 'invoice.payment_succeeded':
            const invoice = event.data.object as any;
            console.log('--- Invoice Paid ---', invoice.id);

            // If the invoice has metadata about a location (from the subscription it's tied to)
            // Or if we check the subscription lines
            if (invoice.subscription) {
                // Secondary check: if checkout didn't fire or metadata was in subscription
                // Retreive subscription to check metadata
                const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
                const locId = subscription.metadata?.location_id;

                if (locId) {
                    console.log(`Invoice paid for subscription tied to location: ${locId}`);
                    await (supabaseAdmin.from('locations') as any)
                        .update({ is_paid: true })
                        .eq('id', locId);
                }
            }
            break;

        case 'customer.subscription.updated':
            const subscriptionUpdate = event.data.object as any;
            console.log('--- Subscription Updated ---', subscriptionUpdate.id);

            // If the subscription has a location_id in metadata, ensure location is_paid matches status
            if (subscriptionUpdate.metadata?.location_id) {
                const isPaidStatus = subscriptionUpdate.status === 'active' || subscriptionUpdate.status === 'trialing';
                await (supabaseAdmin.from('locations') as any)
                    .update({ is_paid: isPaidStatus })
                    .eq('id', subscriptionUpdate.metadata.location_id);
                console.log(`Updated location ${subscriptionUpdate.metadata.location_id} is_paid to ${isPaidStatus} based on sub status ${subscriptionUpdate.status}`);
            }

            // Also update organization if it's the main org sub
            const { error: subUpdateError } = await supabaseAdmin
                .from('organizations')
                .update({
                    subscription_status: subscriptionUpdate.status,
                    trial_ends_at: subscriptionUpdate.trial_end ? new Date(subscriptionUpdate.trial_end * 1000).toISOString() : null
                })
                .eq('stripe_subscription_id', subscriptionUpdate.id);

            if (subUpdateError) {
                // Not necessarily an error if this was a per-location sub
            }
            break;

        case 'customer.subscription.deleted':
            const subscriptionDeleted = event.data.object as any;
            await supabaseAdmin
                .from('organizations')
                .update({
                    subscription_status: 'canceled',
                    stripe_subscription_id: null
                })
                .eq('stripe_subscription_id', subscriptionDeleted.id);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
