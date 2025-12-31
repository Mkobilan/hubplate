
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    // Check if status 'completed' is accepted
    console.log('Testing update to status: completed...');
    const { data, error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', '00000000-0000-0000-0000-000000000000') // Non-existent but will trigger constraint if checked before existence
        .select();

    if (error) {
        console.error('Update test error:', error.message);
        if (error.message.includes('constraint')) {
            console.log('STATUS CONSTRAINT CONFIRMED: completed is NOT allowed.');
        }
    } else {
        console.log('Update test success or no constraint violation.');
    }

    // Direct metadata query for constraints
    const { data: constraints, error: constError } = await supabase.rpc('get_table_constraints', { t_name: 'orders' });
    if (constError) {
        // Try information_schema
        const { data: info, error: infoError } = await supabase.from('information_schema.columns').select('*').eq('table_name', 'orders').eq('column_name', 'status');
        console.log('Column info:', JSON.stringify(info, null, 2));
    } else {
        console.log('Constraints:', JSON.stringify(constraints, null, 2));
    }
}

check();
