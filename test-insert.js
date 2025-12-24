
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

async function testInsert() {
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

    // Get a valid location and menu item first
    const { data: location } = await supabase.from('locations').select('id').limit(1).single();
    const { data: menuItem } = await supabase.from('menu_items').select('id, price').limit(1).single();

    if (!location || !menuItem) {
        console.error("Could not find location or menu item for test");
        return;
    }

    console.log("Using Location:", location.id);
    console.log("Using Menu Item:", menuItem.id);

    console.log("\n--- Attempting Order Insert ---");
    const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
            location_id: location.id,
            table_number: "Test-1",
            status: "sent",
            order_type: "dine_in", // Trying common value
            subtotal: menuItem.price
        })
        .select("id")
        .single();

    if (orderError) {
        console.error("Order Insert Failed:", orderError);
        // Try without order_type if it failed
        console.log("\nRetry without order_type...");
        const { error: retryError } = await supabase
            .from("orders")
            .insert({
                location_id: location.id,
                table_number: "Test-2",
                status: "sent"
            });
        console.error("Retry Error:", retryError);
    } else {
        console.log("Order Insert Success:", order.id);

        console.log("\n--- Attempting Order Item Insert ---");
        const { error: itemError } = await supabase
            .from("order_items")
            .insert({
                order_id: order.id,
                menu_item_id: menuItem.id,
                quantity: 1,
                price: menuItem.price,
                status: "sent"
            });

        if (itemError) {
            console.error("Order Item Insert Failed:", itemError);
        } else {
            console.log("Order Item Insert Success");
        }
    }
}

testInsert();
