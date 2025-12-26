
import { createClient } from "@/lib/supabase/server";
import { generateMenuSuggestions } from "@/lib/ai/gemini";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { locationId, prompt } = await req.json();

        if (!locationId) {
            return new NextResponse("Location ID is required", { status: 400 });
        }

        const supabase = await createClient();

        // 1. Fetch Menu Items (names)
        const { data: menuData } = await supabase
            .from("menu_items")
            .select("name")
            .eq("location_id", locationId)
            .eq("is_active", true);

        const menuItems = menuData?.map((i: { name: string }) => i.name) || [];

        // 2. Fetch Inventory Items (names)
        const { data: invData } = await supabase
            .from("inventory_items")
            .select("name")
            .eq("location_id", locationId);

        const inventoryItems = invData?.map((i: { name: string }) => i.name) || [];

        // 3. Generate Suggestions
        const suggestions = await generateMenuSuggestions(
            menuItems,
            inventoryItems,
            prompt || "Surprise me with a creative new dish",
            "American Grill" // TODO: Fetch from location settings if available
        );

        return NextResponse.json(suggestions);
    } catch (error) {
        console.error("Error generating suggestions:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
