import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PublicMenu from "./components/PublicMenu";

export const dynamic = "force-dynamic";

export default async function GuestMenuPage({
    params,
    searchParams
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
    const { slug } = await params;
    const { table: tableNumber } = await searchParams;
    const supabase = await createClient();

    // 1. Get Location by Slug
    const { data: location } = await supabase
        .from("locations")
        .select("id, name, ordering_enabled")
        .eq("slug", slug)
        .single() as any;

    if (!location || !location.ordering_enabled) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
                <h1 className="text-2xl font-bold text-slate-100 mb-2">Not Available</h1>
                <p className="text-slate-500">
                    This location is either not found or not accepting online orders right now.
                </p>
            </div>
        );
    }

    // 2. Get Categories
    const { data: categories } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("location_id", location.id)
        .order("sort_order");

    // 3. Get Menu Items (filtered by location)
    let finalItems: any[] = [];
    if (location.id) {
        console.log(`Fetching items for Location ID: ${location.id}`);

        const { data: fetchedItems, error } = await supabase
            .from("menu_items")
            .select("id, name, description, price, category_id, image_url, location_id, available")
            .eq("location_id", location.id)
            .eq("available", true);

        if (error) {
            console.error("Error fetching items:", error);
        } else {
            console.log(`Fetched ${fetchedItems?.length || 0} items for location.`);
            if (fetchedItems?.length === 0) {
                // Try fetching without 'available' filter to debug
                const { count } = await supabase
                    .from("menu_items")
                    .select("*", { count: 'exact', head: true })
                    .eq("location_id", location.id);
                console.log(`Total items in DB for this location (ignoring avail status): ${count}`);
            }
        }

        finalItems = fetchedItems || [];
    }



    return (
        <PublicMenu
            items={finalItems}
            categories={categories || []}
            locationId={location.id}
            locationName={location.name}
            tableNumber={tableNumber}
        />
    );
}
