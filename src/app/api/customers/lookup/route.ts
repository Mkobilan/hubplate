import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        let phone = searchParams.get('phone');
        const id = searchParams.get('id');
        const locationId = searchParams.get('locationId');

        if ((!phone && !id) || !locationId) {
            return NextResponse.json({ error: 'Phone or ID and Location ID are required' }, { status: 400 });
        }

        let query = (supabaseAdmin as any).from('customers').select('*');

        if (id) {
            query = query.eq('id', id);
        } else {
            // Standardize phone number: strip all non-numeric characters
            phone = phone!.replace(/\D/g, '');
            query = query.eq('phone', phone);
        }

        const { data: customers, error } = await query.limit(1);

        const customer = customers && customers.length > 0 ? customers[0] : null;

        if (error) {
            console.error('Error looking up customer:', error);
            return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
        }

        if (!customer) {
            return NextResponse.json({ found: false });
        }

        // Fetch available rewards for this location
        const { data: rewards } = await (supabaseAdmin
            .from('loyalty_rewards') as any)
            .select('*')
            .eq('location_id', locationId)
            .eq('is_active', true)
            .order('points_required', { ascending: true });

        return NextResponse.json({
            found: true,
            customer,
            availableRewards: rewards || []
        });
    } catch (error) {
        console.error('Customer lookup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
