
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyFixes() {
    console.log('--- Verification Script ---');

    // 1. Get a location and server to test with
    const { data: locations } = await supabase.from('locations').select('id').limit(1);
    const { data: servers } = await supabase.from('employees').select('id').limit(1);

    if (!locations?.[0] || !servers?.[0]) {
        console.log('Not enough data to run full verification, checking recent orders instead.');
    } else {
        const locId = locations[0].id;
        const serverId = servers[0].id;
        const testTable = '999';

        console.log(`Using Location: ${locId}, Server: ${serverId}, Table: ${testTable}`);

        // 2. Create a "Paid" order that SHOULD be filtered out
        const { data: paidOrder, error: paidError } = await supabase.from('orders').insert({
            location_id: locId,
            server_id: serverId,
            table_number: testTable,
            payment_status: 'paid',
            status: 'completed',
            total: 10.00,
            items: []
        }).select().single();

        if (paidError) {
            console.error('Error creating paid order:', paidError);
        } else {
            console.log(`Created paid order: ${paidOrder.id}`);

            // 3. Verify page.tsx query logic (auto-load)
            const { data: foundPage, error: errPage } = await supabase
                .from('orders')
                .select('*')
                .eq('location_id', locId)
                .eq('table_number', testTable)
                .neq('payment_status', 'paid')
                .in('status', ['pending', 'in_progress', 'ready', 'served']);

            console.log(`POS Page Auto-load found: ${foundPage?.length} orders (Expected: 0)`);

            // 4. Verify MyTicketsModal query logic
            const { data: foundModal, error: errModal } = await supabase
                .from('orders')
                .select('*')
                .eq('location_id', locId)
                .eq('server_id', serverId)
                .neq('payment_status', 'paid')
                .neq('status', 'completed')
                .neq('status', 'cancelled');

            const isFiltered = !foundModal?.some(o => o.id === paidOrder.id);
            console.log(`Tickets Modal filtered out paid order: ${isFiltered} (Expected: true)`);

            // Cleanup
            await supabase.from('orders').delete().eq('id', paidOrder.id);
            console.log('Cleaned up test order.');
        }
    }
}

verifyFixes();
