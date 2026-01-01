import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('Customer API request:', body);
        let { email, phone, firstName, lastName, locationId, orderId, serverId, marketingOptIn, discountAmount, pointsRedeemed } = body;

        // Standardize empty strings to null for UUIDs
        if (!locationId || locationId === "") locationId = null;
        if (!orderId || orderId === "") orderId = null;

        if (!email && !phone) {
            return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 });
        }

        // Standardize phone number
        if (phone) phone = phone.replace(/\D/g, '');

        // Upsert customer record based on email or phone
        // We'll try to find an existing customer first
        let customerData: any = null;

        if (email) {
            const { data } = await (supabaseAdmin.from('customers') as any)
                .select('*')
                .eq('email', email)
                .limit(1);
            customerData = data && data.length > 0 ? data[0] : null;
        } else if (phone) {
            const { data } = await (supabaseAdmin.from('customers') as any)
                .select('*')
                .eq('phone', phone)
                .limit(1);
            customerData = data && data.length > 0 ? data[0] : null;
        }

        const customerPayload: any = {
            email: email || customerData?.email,
            phone: phone || customerData?.phone,
            first_name: firstName || customerData?.first_name,
            last_name: lastName || customerData?.last_name,
            location_id: locationId || customerData?.location_id,
            is_loyalty_member: true,
            marketing_opt_in: marketingOptIn ?? customerData?.marketing_opt_in ?? true,
            updated_at: new Date().toISOString()
        };

        // Only set attribution if not already a loyalty member or if attribution is missing
        if ((!customerData?.is_loyalty_member || !customerData?.loyalty_signup_server_id) && serverId) {
            customerPayload.loyalty_signup_server_id = serverId;
            customerPayload.loyalty_signup_at = new Date().toISOString();
        }

        let result;
        if (customerData) {
            // Update existing
            result = await (supabaseAdmin.from('customers') as any)
                .update(customerPayload)
                .eq('id', customerData.id)
                .select()
                .single();
        } else {
            // Create new
            result = await (supabaseAdmin.from('customers') as any)
                .insert({
                    ...customerPayload,
                    loyalty_signup_server_id: serverId || null,
                    loyalty_signup_at: serverId ? new Date().toISOString() : null,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
        }

        if (result.error) {
            console.error('Error handling customer record:', result.error);
            return NextResponse.json({ error: 'Failed to save customer details' }, { status: 500 });
        }

        // If orderId is provided, link the order to the customer
        if (orderId) {
            await (supabaseAdmin.from('orders') as any)
                .update({
                    customer_id: result.data.id,
                    customer_email: email,
                    customer_name: `${firstName} ${lastName}`.trim(),
                    customer_phone: phone,
                    discount: discountAmount || 0,
                    points_redeemed: pointsRedeemed || 0
                })
                .eq('id', orderId);
        }

        return NextResponse.json({ success: true, customer: result.data });
    } catch (error) {
        console.error('Customer API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
