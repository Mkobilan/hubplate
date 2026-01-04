import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { uberClient } from "@/lib/delivery/uber";

export async function POST(req: Request) {
    try {
        const { locationId, address, pickupAddress } = await req.json();

        if (!locationId || !address) {
            return NextResponse.json({ error: "Location ID and address are required" }, { status: 400 });
        }

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

        // 1. Fetch Location's Uber ID
        const { data: location, error: locError } = await supabase
            .from("locations")
            .select("uber_organization_id, name, address")
            .eq("id", locationId)
            .single();

        if (locError || !location?.uber_organization_id) {
            return NextResponse.json({ error: "Delivery is not set up for this location" }, { status: 400 });
        }

        // 2. Request Quote from Uber
        // Note: We use the location's uber_organization_id as the customer_id for the quote
        const quote = await uberClient.createQuote({
            customerId: location.uber_organization_id,
            pickup_address: pickupAddress || location.address || "",
            dropoff_address: address,
        });

        // 3. Apply Markup ($1.00 USD = 100 cents)
        const HUBPLATE_MARKUP = 100;
        const finalFee = quote.fee + HUBPLATE_MARKUP;

        return NextResponse.json({
            quote_id: quote.id,
            uber_fee: quote.fee,
            markup: HUBPLATE_MARKUP,
            total_fee: finalFee,
            currency: quote.currency || "usd",
            duration: quote.duration,
            pickup_duration: quote.pickup_duration,
            dropoff_eta: quote.dropoff_eta
        });

    } catch (error: any) {
        console.error("Uber Quote Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
