
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

async function listData() {
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

    const { data: locations, error: locErr } = await supabase.from('locations').select('id, name');
    console.log("Locations:", locations || locErr);

    const { data: items, error: itemErr } = await supabase.from('menu_items').select('id, name, location_id').limit(5);
    console.log("Menu Items:", items || itemErr);
}

listData();
