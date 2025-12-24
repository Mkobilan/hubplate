
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

async function checkOrderItemsCols() {
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

    const cols = ["id", "order_id", "menu_item_id", "menu_item_name", "quantity", "unit_price", "price", "notes", "status"];
    console.log("Checking order_items table:");
    for (const col of cols) {
        const { error } = await supabase.from('order_items').select(col).limit(1);
        if (error) {
            console.log(`${col}: ERROR - ${error.message} (${error.code})`);
        } else {
            console.log(`${col}: EXISTS`);
        }
    }
}

checkOrderItemsCols();
