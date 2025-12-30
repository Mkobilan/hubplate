
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

async function checkSchema() {
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
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("--- Checking Employees Table Schema ---");

    const cols = [
        "id", "first_name", "last_name", "role", "is_active", "termination_date", "location_id", "organization_id"
    ];

    for (const col of cols) {
        const { error } = await supabase.from("employees").select(col).limit(1);
        if (!error) {
            console.log(`[OK] ${col}`);
        } else {
            console.log(`[ERR] ${col}: ${error.message} (${error.code})`);
        }
    }
}

checkSchema();
