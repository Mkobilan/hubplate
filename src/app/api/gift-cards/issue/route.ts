import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { locationId, cardNumber, amount, isDigital, customerId, metadata } = body;

        if (!locationId || !cardNumber || amount === undefined) {
            return NextResponse.json({ error: "Missing required data" }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Check if card number already exists for this location
        const { data: existing } = await (supabase
            .from("gift_cards") as any)
            .select("id")
            .eq("location_id", locationId)
            .eq("card_number", cardNumber)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: "Card number already exists. Use a different one." }, { status: 400 });
        }

        const newCard = {
            location_id: locationId,
            card_number: cardNumber,
            current_balance: amount,
            original_balance: amount,
            is_active: true,
            metadata: {
                ...metadata,
                is_digital: !!isDigital,
                customer_id: customerId || null,
                issued_at: new Date().toISOString(),
                issued_by: user.id
            }
        };

        const { data, error } = await (supabase
            .from("gift_cards") as any)
            .insert(newCard)
            .select()
            .single();


        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("Gift card issuance error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
