
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

async function deepIntrospect() {
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

    console.log("--- Deep Introspecting (testing column existence) ---");

    async function testCols(table, cols) {
        console.log(`\nTesting table: ${table}`);
        for (const col of cols) {
            const { error } = await supabase.from(table).select(col).limit(1);
            if (!error) {
                console.log(`[OK] ${col}`);
            } else if (error.code === '42703') {
                // Column does not exist
            } else {
                console.log(`[ERR] ${col}: ${error.message} (${error.code})`);
            }
        }
    }

    const orderPotentialCols = [
        "id", "location_id", "organization_id", "employee_id", "created_by",
        "table_number", "customer_id", "status", "order_type",
        "total_amount", "subtotal", "tax_amount", "discount_amount",
        "created_at", "updated_at", "is_active"
    ];

    const orderItemPotentialCols = [
        "id", "order_id", "menu_item_id", "quantity",
        "unit_price", "price", "subtotal", "notes", "status",
        "created_at", "updated_at"
    ];

    await testCols("orders", orderPotentialCols);
    await testCols("order_items", orderItemPotentialCols);
}

deepIntrospect();
