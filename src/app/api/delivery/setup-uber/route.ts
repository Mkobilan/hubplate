import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client"; // Note: this is for server-side in route handlers too if configured, but better use @supabase/ssr helper
// Actually better use createServerClient from @supabase/ssr in route handlers
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { uberClient } from "@/lib/delivery/uber";

export async function POST(req: Request) {
    try {
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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { locationId } = await req.json();
        if (!locationId) {
            return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
        }

        // Fetch location details
        const { data: location, error: locError } = await supabase
            .from("locations")
            .select("*")
            .eq("id", locationId)
            .single();

        if (locError || !location) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }

        if (!location.address) {
            return NextResponse.json({ error: "Location address is required to setup Uber" }, { status: 400 });
        }

        // Parse address - for now assume it's a string and we might need to parse it or have it structured
        // In a real app, we'd have structured address in DB.
        // Let's try to parse a "Main St, City, State ZIP, Country" format
        // Or just send a mock structured one if parsing is too hard for this prototype.
        // THE USER provided: "633 S Wabash Ave, Chicago, IL 60605"

        // For now, let's use a helper to guess parts or just use the string if Uber allows (but we found it needs structured)

        // Create Sub-Org
        const subOrg = await uberClient.createSubOrganization({
            name: location.name,
            address: {
                street1: location.address.split(",")[0].trim(),
                city: location.address.split(",")[1]?.trim() || "",
                state: location.address.split(",")[2]?.trim().split(" ")[0] || "",
                zipcode: location.address.split(",")[2]?.trim().split(" ")[1] || "",
                country_iso2: "US"
            }
        });

        // Save uber_organization_id to location
        const { error: updateError } = await supabase
            .from("locations")
            .update({ uber_organization_id: subOrg.organization_id })
            .eq("id", locationId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, organization_id: subOrg.organization_id });
    } catch (error: any) {
        console.error("Uber Setup Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
