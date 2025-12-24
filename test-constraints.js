
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

async function checkConstraints() {
    let supabaseUrl = "";
    let supabaseKey = "";
    try {
        const env = fs.readFileSync(".env.local", "utf8");
        const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
        if (urlMatch) supabaseUrl = urlMatch[1].trim().replace(/['"]/g, "");
        if (keyMatch) supabaseKey = keyMatch[1].trim().replace(/['"]/g, "");
    } catch (e) {
        console.error("Could not read .env.local:", e.message);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("--- Testing Orders Status values ---");
    const statuses = ['open', 'sent', 'preparing', 'ready', 'served', 'paid', 'cancelled', 'pending'];
    for (const s of statuses) {
        const { error } = await supabase.from('orders').insert({
            location_id: '00000000-0000-0000-0000-000000000000', // invalid but we want check constraint check first
            status: s,
            table_number: 'test',
            order_type: 'dine_in'
        });
        if (error && error.code === '23514') {
            console.log(`Status '${s}': REJECTED by check constraint`);
        } else if (error && error.code === '23503') {
            console.log(`Status '${s}': ACCEPTED (failed on foreign key only)`);
        } else {
            console.log(`Status '${s}': Result ${error ? error.message : 'Success'}`);
        }
    }

    console.log("\n--- Testing Order Items Status values ---");
    const itemStatuses = ['pending', 'preparing', 'ready', 'served', 'sent'];
    for (const s of itemStatuses) {
        const { error } = await supabase.from('order_items').insert({
            order_id: '00000000-0000-0000-0000-000000000000',
            menu_item_id: '00000000-0000-0000-0000-000000000000',
            status: s,
            quantity: 1,
            price: 0
        });
        if (error && error.code === '23514') {
            console.log(`Status '${s}': REJECTED by check constraint`);
        } else if (error && error.code === '23503') {
            console.log(`Status '${s}': ACCEPTED (failed on foreign key only)`);
        } else {
            console.log(`Status '${s}': Result ${error ? error.message : 'Success'}`);
        }
    }
}

checkConstraints();
