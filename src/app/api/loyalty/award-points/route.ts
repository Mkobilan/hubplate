import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { customerId, locationId, amountPaid } = await req.json();

        if (!customerId || !locationId || amountPaid === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Get Earning Rate
        const { data: program } = await (supabaseAdmin
            .from('loyalty_programs') as any)
            .select('points_per_dollar')
            .eq('location_id', locationId)
            .maybeSingle();

        const rate = (program as any)?.points_per_dollar || 1;
        const pointsEarned = Math.floor(amountPaid * rate);

        if (pointsEarned <= 0) {
            return NextResponse.json({ success: true, pointsEarned: 0 });
        }

        // 2. Update Customer
        const { data: customer, error: fetchError } = await (supabaseAdmin
            .from('customers') as any)
            .select('loyalty_points, total_visits, total_spent')
            .eq('id', customerId)
            .single();

        if (fetchError || !customer) {
            throw fetchError || new Error("Customer not found");
        }

        const newPointBalance = (customer.loyalty_points || 0) + pointsEarned;
        const newVisitCount = (customer.total_visits || 0) + 1;
        const newTotalSpent = Number((Number(customer.total_spent || 0) + amountPaid).toFixed(2));

        const { error: updateError } = await (supabaseAdmin.from('customers') as any)
            .update({
                loyalty_points: newPointBalance,
                total_visits: newVisitCount,
                total_spent: newTotalSpent,
                last_visit_at: new Date().toISOString()
            })
            .eq('id', customerId);

        if (updateError) throw updateError;

        console.log(`API: Awarded ${pointsEarned} points to customer ${customerId}. New balance: ${newPointBalance}`);

        return NextResponse.json({
            success: true,
            pointsEarned,
            newBalance: newPointBalance
        });

    } catch (error: any) {
        console.error("Loyalty awarding API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
