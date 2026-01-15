// API route for checking reservation availability
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS for reading
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { locationId, date, partySize } = body;

        // Validate required fields
        if (!locationId || !date || !partySize) {
            return NextResponse.json(
                { error: 'Missing required fields: locationId, date, partySize' },
                { status: 400 }
            );
        }

        // Validate party size is a positive integer
        const parsedPartySize = parseInt(partySize, 10);
        if (isNaN(parsedPartySize) || parsedPartySize < 1) {
            return NextResponse.json(
                { error: 'Party size must be a positive integer' },
                { status: 400 }
            );
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return NextResponse.json(
                { error: 'Date must be in YYYY-MM-DD format' },
                { status: 400 }
            );
        }

        // Verify location exists and has ordering/reservations enabled
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

        // Get reservation settings
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('reservation_settings')
            .select('*')
            .eq('location_id', locationId)
            .single();

        if (settingsError || !settings) {
            return NextResponse.json(
                { error: 'Reservation settings not found' },
                { status: 404 }
            );
        }

        if (!settings.online_reservations_enabled) {
            return NextResponse.json(
                { error: 'Online reservations are not enabled for this location' },
                { status: 400 }
            );
        }

        // Check if party size exceeds online max
        if (parsedPartySize > settings.max_party_size_online) {
            return NextResponse.json({
                availableSlots: [],
                settings: {
                    max_party_size_online: settings.max_party_size_online,
                    default_duration_minutes: settings.default_duration_minutes,
                    time_slot_interval: settings.time_slot_interval,
                },
                message: `For parties of ${settings.max_party_size_online + 1}+, please call the restaurant to reserve.`,
                requiresCall: true
            });
        }

        // Validate date is within booking window
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const requestedDate = new Date(date + 'T00:00:00');
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + settings.max_advance_days);

        if (requestedDate < today) {
            return NextResponse.json(
                { error: 'Cannot book reservations in the past' },
                { status: 400 }
            );
        }

        if (requestedDate > maxDate) {
            return NextResponse.json(
                { error: `Reservations can only be made up to ${settings.max_advance_days} days in advance` },
                { status: 400 }
            );
        }

        // Get operating hours for this day
        const dayOfWeek = requestedDate.getDay(); // 0 = Sunday
        const { data: operatingHours, error: hoursError } = await supabaseAdmin
            .from('operating_hours')
            .select('*')
            .eq('location_id', locationId)
            .eq('day_of_week', dayOfWeek)
            .single();

        if (hoursError || !operatingHours || !operatingHours.is_open) {
            return NextResponse.json({
                availableSlots: [],
                settings: {
                    max_party_size_online: settings.max_party_size_online,
                    default_duration_minutes: settings.default_duration_minutes,
                    time_slot_interval: settings.time_slot_interval,
                },
                message: 'The restaurant is closed on this day.',
                isClosed: true
            });
        }

        // Use the SQL function for efficient availability calculation
        const { data: slots, error: slotsError } = await supabaseAdmin
            .rpc('get_available_time_slots', {
                p_location_id: locationId,
                p_date: date,
                p_party_size: parsedPartySize
            });

        if (slotsError) {
            console.error('Error getting available slots:', slotsError);
            return NextResponse.json(
                { error: 'Failed to check availability' },
                { status: 500 }
            );
        }

        // Format slots as HH:MM strings
        const availableSlots = (slots || []).map((slot: any) => {
            // time_slot comes as "HH:MM:SS", we want "HH:MM"
            const timeStr = slot.time_slot;
            return timeStr.substring(0, 5);
        });

        return NextResponse.json({
            availableSlots,
            settings: {
                opening_time: operatingHours.open_time?.substring(0, 5),
                closing_time: operatingHours.close_time?.substring(0, 5),
                max_party_size_online: settings.max_party_size_online,
                default_duration_minutes: settings.default_duration_minutes,
                time_slot_interval: settings.time_slot_interval,
                min_advance_hours: settings.min_advance_hours,
                max_advance_days: settings.max_advance_days,
            }
        });

    } catch (error: any) {
        console.error('Availability check error:', error);
        return NextResponse.json(
            { error: `Server error: ${error.message || 'Unknown'}` },
            { status: 500 }
        );
    }
}
