import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { orderId, amount, tip, cardNumber, cardExpiry, cardCvc } = await request.json();

        // 1. Get order and location details
        const { data: order, error } = await (supabaseAdmin
            .from('orders') as any)
            .select('*, locations(stripe_account_id)')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const stripeAccountId = order.locations?.stripe_account_id;
        const totalCents = Math.round((amount + tip) * 100);

        // 2. Parse Expiry (MM/YY)
        const [expMonth, expYear] = cardExpiry.split('/').map((s: string) => s.trim());

        // 3. Create Payment Method (CNP)
        // NOTE: In production, use Stripe Elements to create this on the client.
        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: {
                number: cardNumber.replace(/\s/g, ''),
                exp_month: parseInt(expMonth),
                exp_year: parseInt('20' + expYear),
                cvc: cardCvc,
            },
        });

        // 4. Create and Confirm Payment Intent
        const paymentIntentOptions: any = {
            amount: totalCents,
            currency: 'usd',
            payment_method: paymentMethod.id,
            confirm: true,
            confirm_method: 'manual', // Needs to be manually confirmed or set confirm: true
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            },
            metadata: {
                order_id: orderId,
                type: 'manual_pos_charge'
            },
        };

        if (stripeAccountId) {
            paymentIntentOptions.transfer_data = { destination: stripeAccountId };
            paymentIntentOptions.application_fee_amount = Math.round(totalCents * 0.025);
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

        if (paymentIntent.status === 'succeeded') {
            return NextResponse.json({ success: true, paymentIntentId: paymentIntent.id });
        } else {
            return NextResponse.json({ error: `Payment status: ${paymentIntent.status}` }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Manual charge error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process charge' }, { status: 500 });
    }
}
