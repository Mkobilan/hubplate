// API route for creating orders from the public online menu
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS (customers aren't logged in)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            locationId,
            tableNumber,
            orderType,
            items,
            subtotal,
            tax,
            total,
            orderNotes,
            customer
        } = body;

        // Validate required fields
        if (!locationId || !items || items.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify location exists and has ordering enabled
        const { data: location, error: locationError } = await supabaseAdmin
            .from('locations')
            .select('id, name, ordering_enabled')
            .eq('id', locationId)
            .single();

        if (locationError || !location) {
            return NextResponse.json(
                { error: 'Location not found' },
                { status: 404 }
            );
        }

        if (!location.ordering_enabled) {
            return NextResponse.json(
                { error: 'Online ordering is not enabled for this location' },
                { status: 400 }
            );
        }

        // Build order data with all items formatted for KDS
        const orderData: any = {
            location_id: locationId,
            table_number: tableNumber || null,
            order_type: orderType || 'pickup',
            status: 'sent', // Important: This ensures it shows up in the KDS
            payment_status: 'unpaid',
            subtotal: subtotal,
            tax: tax,
            total: total,
            items: items.map((item: any) => ({
                id: item.id || crypto.randomUUID(),
                menu_item_id: item.menu_item_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                notes: item.notes || null,
                modifiers: item.modifiers || [],
                status: 'sent',
                sent_at: item.sent_at || new Date().toISOString()
            })),
            notes: orderNotes || null,
            server_id: null, // No server for online orders
            source: 'online' // Mark as online order
        };

        // Create the order
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert(orderData)
            .select('id')
            .single();

        if (orderError) {
            console.error('Error creating order:', orderError);
            return NextResponse.json(
                { error: 'Failed to create order' },
                { status: 500 }
            );
        }

        // If customer info provided, save it
        if (customer && (customer.name || customer.phone || customer.email)) {
            try {
                const nameParts = (customer.name || '').trim().split(/\s+/);
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ');

                // Check if customer exists by phone or email
                let existingCustomer = null;
                if (customer.phone) {
                    const { data } = await supabaseAdmin
                        .from('customers')
                        .select('id')
                        .eq('phone', customer.phone.trim())
                        .eq('location_id', locationId)
                        .maybeSingle();
                    existingCustomer = data;
                }

                if (!existingCustomer && customer.email) {
                    const { data } = await supabaseAdmin
                        .from('customers')
                        .select('id')
                        .eq('email', customer.email.trim())
                        .eq('location_id', locationId)
                        .maybeSingle();
                    existingCustomer = data;
                }

                if (!existingCustomer) {
                    // Create new customer
                    await supabaseAdmin
                        .from('customers')
                        .insert({
                            location_id: locationId,
                            first_name: firstName,
                            last_name: lastName,
                            phone: customer.phone?.trim() || null,
                            email: customer.email?.trim() || null,
                            source: 'online_order'
                        });
                }

                // Link customer to order (update order with customer info in notes)
                if (customer.name || customer.phone) {
                    const customerInfo = [customer.name, customer.phone].filter(Boolean).join(' - ');
                    const updatedNotes = orderNotes
                        ? `${orderNotes}\n\nCustomer: ${customerInfo}`
                        : `Customer: ${customerInfo}`;

                    await supabaseAdmin
                        .from('orders')
                        .update({ notes: updatedNotes })
                        .eq('id', order.id);
                }
            } catch (customerError) {
                console.error('Error saving customer info:', customerError);
                // Don't fail the order if customer save fails
            }
        }

        console.log(`Online order created: ${order.id} for location ${locationId}`);

        return NextResponse.json({
            orderId: order.id,
            message: 'Order created successfully'
        });

    } catch (error) {
        console.error('Online order error:', error);
        return NextResponse.json(
            { error: 'Failed to process order' },
            { status: 500 }
        );
    }
}
