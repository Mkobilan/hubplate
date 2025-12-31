
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    const { data, error } = await supabase
        .rpc('get_table_info', { table_name: 'orders' });

    if (error) {
        // If RPC doesn't exist, try a direct query to information_schema
        const { data: info, error: infoError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, column_default, is_nullable')
            .eq('table_name', 'orders');

        if (infoError) {
            console.error('Error:', infoError);
            return;
        }
        console.log(JSON.stringify(info, null, 2));
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkSchema();
