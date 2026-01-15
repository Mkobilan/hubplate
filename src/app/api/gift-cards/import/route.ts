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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const cardsToInsert = data.map((row: any) => {
            const getMappedValue = (targetField: string) => {
                const mapping = (mappings as any[]).find(m => m.targetField === targetField);
                return mapping ? row[mapping.csvColumn] : null;
            };

            const cardNumber = getMappedValue("card_number");
            const currentBalanceVal = getMappedValue("current_balance");
            const currentBalance = parseFloat(currentBalanceVal?.toString().replace(/[^0-9.]/g, '') || "0");
            const originalBalanceVal = getMappedValue("original_balance");
            const originalBalance = parseFloat(originalBalanceVal?.toString().replace(/[^0-9.]/g, '') || currentBalance.toString());
            const activeVal = getMappedValue("is_active")?.toString().toLowerCase();
            const isActive = activeVal === "true" || activeVal === "1" || activeVal === "active" || activeVal === "yes" || activeVal === undefined;

            if (!cardNumber) return null;

            // Extract custom fields
            const custom_fields: Record<string, any> = {};
            (mappings as any[]).forEach(m => {
                if (m.targetField === "custom" && m.customFieldName) {
                    custom_fields[m.customFieldName] = row[m.csvColumn];
                }
            });

            return {
                location_id: locationId,
                card_number: cardNumber,
                current_balance: currentBalance,
                original_balance: originalBalance,
                is_active: isActive,
                metadata: custom_fields
            };
        }).filter(Boolean);

        const { error } = await (supabase
            .from("gift_cards") as any)
            .upsert(cardsToInsert, { onConflict: 'location_id, card_number' });


        if (error) throw error;

        return NextResponse.json({ success: true, count: cardsToInsert.length });

    } catch (error: any) {
        console.error("Gift card import error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
