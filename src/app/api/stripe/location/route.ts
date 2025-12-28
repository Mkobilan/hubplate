import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET() {
    try {
        // 1. List existing locations
        const locations = await stripe.terminal.locations.list({
            limit: 1,
        });

        if (locations.data.length > 0) {
            return NextResponse.json({ locationId: locations.data[0].id });
        }

        // 2. If none, create one
        const newLocation = await stripe.terminal.locations.create({
            display_name: 'Hubplate Default Location',
            address: {
                line1: '123 Main St',
                city: 'San Francisco',
                state: 'CA',
                country: 'US',
                postal_code: '94111',
            },
        });

        return NextResponse.json({ locationId: newLocation.id });

    } catch (error) {
        console.error('Error fetching location:', error);
        return NextResponse.json({ error: 'Failed to get location' }, { status: 500 });
    }
}
