import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone');
        const locationId = searchParams.get('locationId');

        if (!phone || !locationId) {
            return NextResponse.json({ error: 'Phone and Location ID are required' }, { status: 400 });
        }

        // Search for customer by phone at this location
        const { data: customer, error } = await (supabaseAdmin
            .from('customers') as any)
            .select('*')
            .eq('location_id', locationId)
            .eq('phone', phone)
            .maybeSingle();

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
