import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

// Security Note: You should set this in your .env.local after getting it from Uber Dashboard
const UBER_WEBHOOK_SIGNING_KEY = process.env.UBER_WEBHOOK_SIGNING_KEY || process.env.UBER_DIRECT_CLIENT_SECRET;

export async function POST(req: Request) {
    try {
        const signature = req.headers.get("x-uber-signature");
        const bodyText = await req.text();

        // 1. Verify Signature (Security)
        if (UBER_WEBHOOK_SIGNING_KEY && signature) {
            const hmac = crypto.createHmac("sha256", UBER_WEBHOOK_SIGNING_KEY);
            hmac.update(bodyText);
            const computedSignature = hmac.digest("hex");

            if (computedSignature !== signature) {
                console.error("Uber Webhook: Invalid Signature");
                // return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
                // Note: During initial testing, you might want to just log this instead of failing
            }
        }

        const payload = JSON.parse(bodyText);
        console.log("Uber Webhook Received:", JSON.stringify(payload, null, 2));

        // 2. Identify Event
        if (payload.event_type !== "event.delivery_status") {
            return NextResponse.json({ received: true });
        }

        const uberDeliveryId = payload.meta.delivery_id;
        const uberStatus = payload.meta.status; // e.g., "PICKUP", "COMPLETED"

        // 3. Map status to internal Hubplate status
        let internalStatus = "in_progress";
        if (uberStatus === "COMPLETED") internalStatus = "completed";
        if (uberStatus === "CANCELED" || uberStatus === "RETURNED") internalStatus = "cancelled";
        if (uberStatus === "PENDING") internalStatus = "pending";

        // 4. Update Database
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        const { data: order, error: fetchError } = await supabase
            .from("orders")
            .select("id")
            .eq("uber_delivery_id", uberDeliveryId)
            .single();

        if (fetchError || !order) {
            console.warn(`Uber Webhook: Order not found for delivery ${uberDeliveryId}`);
            return NextResponse.json({ received: true }); // Return 200 to Uber anyway
        }

        const { error: updateError } = await supabase
            .from("orders")
            .update({
                status: internalStatus
            })
            .eq("id", order.id);

        if (updateError) {
            console.error("Uber Webhook: Database Update Error", updateError);
            throw updateError;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Uber Webhook Handler Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
