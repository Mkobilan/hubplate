import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { locationId, data, mappings } = body;

        if (!locationId || !data || !mappings) {
            return NextResponse.json({ error: "Missing required data" }, { status: 400 });
        }

        // Auth check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let successful = 0;
        let failed = 0;
        let totalGross = 0;

        for (const row of data) {
            try {
                const saleDate = row[Object.keys(mappings).find(k => mappings[k] === "sale_date") || ""];
                const grossStr = row[Object.keys(mappings).find(k => mappings[k] === "gross_sales") || ""];

                if (!saleDate || !grossStr) {
                    failed++;
                    continue;
                }

                // Basic parsing
                const gross = parseFloat(grossStr.toString().replace(/[^0-9.]/g, '')) || 0;
                const net = parseFloat(row[Object.keys(mappings).find(k => mappings[k] === "net_sales") || ""]?.toString().replace(/[^0-9.]/g, '') || gross.toString()) || 0;
                const tax = parseFloat(row[Object.keys(mappings).find(k => mappings[k] === "tax_collected") || ""]?.toString().replace(/[^0-9.]/g, '') || "0") || 0;
                const tips = parseFloat(row[Object.keys(mappings).find(k => mappings[k] === "tips_collected") || ""]?.toString().replace(/[^0-9.]/g, '') || "0") || 0;
                const comps = parseFloat(row[Object.keys(mappings).find(k => mappings[k] === "comp_amount") || ""]?.toString().replace(/[^0-9.]/g, '') || "0") || 0;
                const orders = parseInt(row[Object.keys(mappings).find(k => mappings[k] === "order_count") || ""]?.toString().replace(/[^0-9]/g, '') || "0") || 0;

                const { error } = await supabase
                    .from("historical_sales")
                    .insert({
                        location_id: locationId,
                        sale_date: saleDate, // Supabase/Postgres usually handles various date formats well if they are standard
                        gross_sales: gross,
                        net_sales: net,
                        tax_collected: tax,
                        tips_collected: tips,
                        comp_amount: comps,
                        order_count: orders,
                        source_system: "migration_csv"
                    });

                if (error) {
                    console.error("Row error:", error);
                    failed++;
                } else {
                    successful++;
                    totalGross += gross;
                }
            } catch (err) {
                console.error("Processing error:", err);
                failed++;
            }
        }

        return NextResponse.json({
            success: true,
            successful,
            failed,
            totalGross
        });

    } catch (error: any) {
        console.error("Sales import error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
