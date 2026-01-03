// API route for creating orders from the public online menu
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS (customers aren't logged in)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    console.log('--- START ONLINE ORDER PROCESS ---');
    try {
        const body = await request.json();
        console.log('Request Body:', JSON.stringify(body, null, 2));

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
            console.error('Validation Error: Missing required fields');
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify location exists and has ordering enabled
        console.log('Verifying location:', locationId);
        const { data: location, error: locationError } = await supabaseAdmin
            .from('locations')
            .select('id, name, ordering_enabled')
            .eq('id', locationId)
            .single();

        if (locationError || !location) {
            console.error('Location Error:', locationError);
            return NextResponse.json(
                { error: 'Location not found' },
                { status: 404 }
            );
        }

        if (!location.ordering_enabled) {
            console.warn('Ordering Disabled for location:', locationId);
            return NextResponse.json(
                { error: 'Online ordering is not enabled for this location' },
                { status: 400 }
            );
        }

        // Build order data
        // Removing 'source' and 'payment_status' for now to be safe
        const orderData: any = {
            location_id: locationId,
            table_number: tableNumber || null,
            order_type: orderType || 'takeout',
            status: 'pending',
            subtotal: subtotal,
            tax: tax,
            total: total,
            items: items.map((item: any) => ({
                id: item.id || `item_${Math.random().toString(36).substr(2, 9)}`,
                menu_item_id: item.menu_item_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                notes: item.notes || null,
                modifiers: item.modifiers || [],
                status: 'pending',
                sent_at: item.sent_at || new Date().toISOString()
            })),
            notes: orderNotes || null
        };

        console.log('Inserting order data:', JSON.stringify(orderData, null, 2));

        // Create the order
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert(orderData)
            .select('id')
            .single();

        if (orderError) {
            console.error('Supabase Order Insertion Error:', orderError);
            return NextResponse.json(
                { error: `Database Error: ${orderError.message}` },
                { status: 500 }
            );
        }

        console.log('Order created successfully with ID:', order.id);

        // If customer info provided, try to save/link it
        if (customer && (customer.name || customer.phone || customer.email)) {
            console.log('Processing customer info:', customer);
            try {
                const nameParts = (customer.name || '').trim().split(/\s+/);
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ');

                // We'll try to find an existing customer first
                const { data: existingCustomer } = await supabaseAdmin
                    .from('customers')
                    .select('id')
                    .or(`email.eq.${customer.email || '___'},phone.eq.${customer.phone || '___'}`)
                    .limit(1)
                    .maybeSingle();

                let finalCustomerId = existingCustomer?.id;

                if (!finalCustomerId) {
                    // Create new customer
                    // Removing 'source' to be safe
                    const { data: newCustomer, error: custError } = await supabaseAdmin
                        .from('customers')
                        .insert({
                            location_id: locationId,
                            first_name: firstName,
                            last_name: lastName,
                            phone: customer.phone?.trim() || null,
                            email: customer.email?.trim() || null
                        })
                        .select('id')
                        .single();

                    if (custError) {
                        console.error('Customer Creation Error (Non-blocking):', custError);
                    } else {
                        finalCustomerId = newCustomer.id;
                    }
                }

                // Update order with customer info and customer_id if we have it
                const customerInfo = [customer.name, customer.phone].filter(Boolean).join(' - ');
                const updatedNotes = orderNotes
                    ? `${orderNotes}\n\nCustomer: ${customerInfo}`
                    : `Customer: ${customerInfo}`;

                const updatePayload: any = { notes: updatedNotes };
                if (finalCustomerId) {
                    updatePayload.customer_id = finalCustomerId;
                    updatePayload.customer_email = customer.email || null;
                    updatePayload.customer_phone = customer.phone || null;
                    updatePayload.customer_name = customer.name || null;
                }

                await supabaseAdmin
                    .from('orders')
                    .update(updatePayload)
                    .eq('id', order.id);

            } catch (customerErr) {
                console.error('Customer linking error (Non-blocking):', customerErr);
            }
        }

        console.log('--- END ONLINE ORDER PROCESS SUCCESS ---');
        return NextResponse.json({
            orderId: order.id,
            message: 'Order created successfully'
        });

    } catch (error: any) {
        console.error('Catch-all Online Order Error:', error);
        return NextResponse.json(
            { error: `Server Error: ${error.message || 'Unknown'}` },
            { status: 500 }
        );
    }
}
