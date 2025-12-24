const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkFunction() {
    const { data, error } = await supabase.rpc('get_my_organizations');

    if (error) {
        if (error.code === 'PGRST202') {
            console.log('Function get_my_organizations does not exist.');
        } else {
            console.log('Error calling function:', error);
        }
    } else {
        console.log('Function get_my_organizations exists and returned:', data);
    }
}

checkFunction();
