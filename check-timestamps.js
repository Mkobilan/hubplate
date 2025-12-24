
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

async function checkTimestamps() {
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

    console.log("--- Checking Timestamp Columns ---");

    async function testCols(table, cols) {
        console.log(`\nTesting table: ${table}`);
        for (const col of cols) {
            const { error } = await supabase.from(table).select(col).limit(1);
            if (!error) {
                console.log(`[OK] ${col}`);
            } else if (error.code === '42703') {
                console.log(`[MISSING] ${col}`);
            } else {
                console.log(`[ERR] ${col}: ${error.message} (${error.code})`);
            }
        }
    }

    await testCols("orders", ["created_at", "updated_at", "completed_at", "ready_at", "served_at", "paid_at"]);
    await testCols("kitchen_tickets", ["created_at", "ready_at", "served_at", "started_at"]);
}

checkTimestamps();
