// Fetch order details for the payment page
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to access order without auth (for customer payment pages)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await params;

        // Fetch order with items
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`
                id,
                location_id,
                table_number,
                order_type,
                subtotal,
                tax,
                total,
                payment_status,
                server_id,
                items,
                tip,
                delivery_fee
            `)
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Format response
        return NextResponse.json({
            id: order.id,
            location_id: order.location_id,
            table_number: order.table_number,
            order_type: order.order_type,
            subtotal: order.subtotal,
            tax: order.tax,
            total: order.total,
            payment_status: order.payment_status || 'unpaid',
            server_id: order.server_id,
            items: order.items || [],
            tip: order.tip,
            delivery_fee: order.delivery_fee
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }
}
