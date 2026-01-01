import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { orderId, rating, comment, customerName } = await request.json();

        if (!orderId || !rating) {
            return NextResponse.json({ error: 'Order ID and rating are required' }, { status: 400 });
        }

        // Get order details to get location_id, customer_id, and server_id
        const { data: order, error: orderError } = await (supabaseAdmin
            .from('orders') as any)
            .select('location_id, customer_email, customer_name, server_id')
            .eq('id', orderId)
            .single();

        if (orderError) {
            console.error('Error fetching order for feedback:', orderError);
        }

        // Insert feedback
        const { error: feedbackError } = await (supabaseAdmin
            .from('customer_feedback') as any)
            .insert({
                order_id: orderId,
                location_id: order?.location_id,
                server_id: order?.server_id,
                rating,
                comment,
                customer_name: customerName || order?.customer_name,
                source: 'pay_at_table'
            });

        if (feedbackError) {
            console.error('Error inserting feedback:', feedbackError);
            return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Feedback API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
