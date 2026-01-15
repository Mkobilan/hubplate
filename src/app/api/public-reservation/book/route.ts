import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResendClient, RESEND_FROM_EMAIL } from '@/lib/resend';

// Use service role to bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    console.log('--- START ONLINE RESERVATION BOOKING ---');
    try {
        const body = await request.json();
        const {
            locationId,
            date,
            time,
            partySize,
            customerName,
            customerPhone,
            customerEmail,
            specialRequests,
            wantsLoyaltyEnrollment
        } = body;

        // Validate required fields
        if (!locationId || !date || !time || !partySize || !customerName || !customerPhone) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate party size
        const parsedPartySize = parseInt(partySize, 10);
        if (isNaN(parsedPartySize) || parsedPartySize < 1) {
            return NextResponse.json(
                { error: 'Party size must be a positive integer' },
                { status: 400 }
            );
        }

        // Verify location and settings
        const { data: location, error: locationError } = await supabaseAdmin
            .from('locations')
            .select('id, name, address, ordering_enabled')
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

        if (settingsError || !settings || !settings.online_reservations_enabled) {
            return NextResponse.json(
                { error: 'Online reservations are not enabled for this location' },
                { status: 400 }
            );
        }

        // Check party size limit
        if (parsedPartySize > settings.max_party_size_online) {
            return NextResponse.json(
                { error: `For parties of ${settings.max_party_size_online + 1}+, please call to reserve` },
                { status: 400 }
            );
        }

        // Re-verify availability (prevent race conditions)
        const { data: slots, error: slotsError } = await supabaseAdmin
            .rpc('get_available_time_slots', {
                p_location_id: locationId,
                p_date: date,
                p_party_size: parsedPartySize
            });

        if (slotsError) {
            console.error('Error verifying availability:', slotsError);
            return NextResponse.json(
                { error: 'Failed to verify availability' },
                { status: 500 }
            );
        }

        // Check if requested time is still available
        const requestedTime = time.length === 5 ? time + ':00' : time;
        const isAvailable = (slots || []).some((slot: any) => {
            const slotTime = slot.time_slot;
            return slotTime === requestedTime || slotTime.substring(0, 5) === time;
        });

        if (!isAvailable) {
            return NextResponse.json(
                { error: 'This time slot is no longer available. Please select another time.' },
                { status: 409 }
            );
        }

        // Find the best fitting table
        const { data: tables, error: tablesError } = await supabaseAdmin
            .from('seating_tables')
            .select(`
                id,
                label,
                capacity,
                seating_maps!inner(location_id, is_active)
            `)
            .eq('seating_maps.location_id', locationId)
            .filter('seating_maps.is_active', 'not.is', false) // Allow true or null
            .filter('is_active', 'not.is', false) // Allow true or null
            .gte('capacity', parsedPartySize)
            .order('capacity', { ascending: true }); // Prefer smallest fitting table

        if (tablesError || !tables || tables.length === 0) {
            return NextResponse.json(
                { error: 'No suitable tables available' },
                { status: 400 }
            );
        }

        // Check which tables are free at this time
        const reservationTime = time.length === 5 ? time + ':00' : time;
        const duration = settings.default_duration_minutes;

        let selectedTableId: string | null = null;
        let selectedTableLabel: string | null = null;

        for (const table of tables) {
            // Check if this table has a conflicting reservation
            const { data: conflicts } = await supabaseAdmin
                .from('reservation_tables')
                .select(`
                    reservation_id,
                    reservations!inner(
                        reservation_date,
                        reservation_time,
                        duration_minutes,
                        status
                    )
                `)
                .eq('table_id', table.id)
                .eq('reservations.reservation_date', date)
                .not('reservations.status', 'in', '(cancelled,no_show,completed)');

            // Check for time overlap
            let hasConflict = false;
            for (const conflict of (conflicts || [])) {
                const res = conflict.reservations as any;
                if (!res) continue;

                const existingStart = new Date(`2000-01-01T${res.reservation_time}`);
                const existingEnd = new Date(existingStart.getTime() + res.duration_minutes * 60000);
                const newStart = new Date(`2000-01-01T${reservationTime}`);
                const newEnd = new Date(newStart.getTime() + duration * 60000);

                if (newStart < existingEnd && newEnd > existingStart) {
                    hasConflict = true;
                    break;
                }
            }

            if (!hasConflict) {
                selectedTableId = table.id;
                selectedTableLabel = table.label;
                break;
            }
        }

        if (!selectedTableId) {
            return NextResponse.json(
                { error: 'No tables available for this time slot' },
                { status: 409 }
            );
        }

        // Generate confirmation code
        const { data: confirmationCodeData } = await supabaseAdmin
            .rpc('generate_confirmation_code');
        const confirmationCode = confirmationCodeData || `HUB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Build special accommodations object
        const specialAccommodations = {
            allergies: specialRequests?.allergies || '',
            notes: specialRequests?.notes || '',
            occasion: specialRequests?.occasion || '',
            wheelchair: specialRequests?.wheelchair || false,
            high_chair: specialRequests?.highChair || false,
        };

        // Create the reservation
        const { data: reservation, error: resError } = await supabaseAdmin
            .from('reservations')
            .insert({
                location_id: locationId,
                customer_name: customerName.trim(),
                customer_phone: customerPhone.trim(),
                customer_email: customerEmail?.trim() || null,
                wants_loyalty_enrollment: wantsLoyaltyEnrollment || false,
                reservation_date: date,
                reservation_time: reservationTime,
                duration_minutes: duration,
                party_size: parsedPartySize,
                special_accommodations: specialAccommodations,
                status: 'confirmed',
                source: 'online',
                confirmation_code: confirmationCode,
                created_by: null // No employee - online booking
            })
            .select('id')
            .single();

        if (resError) {
            console.error('Error creating reservation:', resError);
            return NextResponse.json(
                { error: 'Failed to create reservation' },
                { status: 500 }
            );
        }

        // Assign the table
        const { error: tableAssignError } = await supabaseAdmin
            .from('reservation_tables')
            .insert({
                reservation_id: reservation.id,
                table_id: selectedTableId
            });

        if (tableAssignError) {
            console.error('Error assigning table:', tableAssignError);
            // Rollback reservation
            await supabaseAdmin
                .from('reservations')
                .delete()
                .eq('id', reservation.id);
            return NextResponse.json(
                { error: 'Failed to assign table' },
                { status: 500 }
            );
        }

        // Handle loyalty enrollment
        if (wantsLoyaltyEnrollment && customerPhone) {
            try {
                const cleanPhone = customerPhone.replace(/\D/g, '');
                const nameParts = customerName.trim().split(/\s+/);
                const firstName = nameParts[0] || 'Guest';
                const lastName = nameParts.slice(1).join(' ') || '';

                // Check if customer exists
                const { data: existingCustomer } = await supabaseAdmin
                    .from('customers')
                    .select('id, is_loyalty_member')
                    .eq('phone', cleanPhone)
                    .eq('location_id', locationId)
                    .maybeSingle();

                if (existingCustomer) {
                    if (!existingCustomer.is_loyalty_member) {
                        await supabaseAdmin
                            .from('customers')
                            .update({
                                first_name: firstName,
                                last_name: lastName,
                                email: customerEmail?.trim() || null,
                                is_loyalty_member: true,
                            })
                            .eq('id', existingCustomer.id);
                    }
                } else {
                    await supabaseAdmin
                        .from('customers')
                        .insert({
                            location_id: locationId,
                            first_name: firstName,
                            last_name: lastName,
                            phone: cleanPhone,
                            email: customerEmail?.trim() || null,
                            is_loyalty_member: true,
                            loyalty_points: 0,
                            total_spent: 0,
                            total_visits: 0,
                        });
                }
            } catch (loyaltyErr) {
                console.error('Loyalty enrollment error (non-blocking):', loyaltyErr);
            }
        }

        // --- SEND CONFIRMATION EMAIL ---
        if (customerEmail?.trim()) {
            try {
                const resend = getResendClient();
                if (resend) {
                    const restaurantName = location.name || 'HubPlate Restaurant';
                    const subject = `Reservation Confirmed: ${restaurantName}`;
                    const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });

                    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f97316; }
    .content { padding: 20px 0; }
    .conf-code { font-size: 24px; font-weight: bold; color: #f97316; text-align: center; margin: 20px 0; padding: 10px; background: #fff7ed; border: 1px dashed #f97316; }
    .footer { font-size: 12px; color: #666; text-align: center; padding-top: 20px; }
    .details { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .label { font-weight: bold; color: #666; width: 100px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reservation Confirmed</h1>
      <p>at ${restaurantName}</p>
    </div>
    <div class="content">
      <p>Hi ${customerName},</p>
      <p>Your table is all set! We look forward to serving you.</p>
      
      <div class="conf-code">
        CONFIRMATION: ${confirmationCode}
      </div>
      
      <div class="details">
        <div><span class="label">Date:</span> ${formattedDate}</div>
        <div><span class="label">Time:</span> ${time.substring(0, 5)}</div>
        <div><span class="label">Guests:</span> ${parsedPartySize}</div>
        ${location.address ? `<div><span class="label">Location:</span> ${location.address}</div>` : ''}
        ${specialRequests?.occasion ? `<div><span class="label">Occasion:</span> ${specialRequests.occasion}</div>` : ''}
        ${specialRequests?.allergies ? `<div><span class="label">Allergies:</span> ${specialRequests.allergies}</div>` : ''}
        ${specialRequests?.highChair ? `<div><span class="label">Requests:</span> High Chair Needed</div>` : ''}
        ${specialRequests?.wheelchair ? `<div><span class="label">Requests:</span> Wheelchair Access</div>` : ''}
      </div>
      
      <p>${settings.confirmation_message || 'Thank you for your reservation!'}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${restaurantName} • Powered by HubPlate</p>
    </div>
  </div>
</body>
</html>`;

                    const { error: emailError } = await resend.emails.send({
                        from: `${restaurantName} <${RESEND_FROM_EMAIL}>`,
                        to: customerEmail.trim(),
                        subject: subject,
                        html: htmlContent,
                    });

                    if (emailError) {
                        console.error('Resend error:', emailError);
                    } else {
                        // Mark as sent
                        await supabaseAdmin
                            .from('reservations')
                            .update({ confirmation_sent_at: new Date().toISOString() })
                            .eq('id', reservation.id);
                    }
                }
            } catch (emailErr) {
                console.error('Non-blocking email error:', emailErr);
            }
        }

        console.log('--- END ONLINE RESERVATION BOOKING SUCCESS ---');
        console.log(`Reservation ID: ${reservation.id}, Confirmation: ${confirmationCode}, Table: ${selectedTableLabel}`);

        return NextResponse.json({
            reservationId: reservation.id,
            confirmationCode,
            tableLabel: selectedTableLabel,
            date,
            time: time.substring(0, 5),
            partySize: parsedPartySize,
            duration,
            message: settings.confirmation_message || 'Thank you for your reservation!'
        });

    } catch (error: any) {
        console.error('Reservation booking error:', error);
        return NextResponse.json(
            { error: `Server error: ${error.message || 'Unknown'}` },
            { status: 500 }
        );
    }
}
