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

    // 3. Get Menu Items (filtered by categories for this location)
    const categoryIds = categories?.map((c: any) => c.id) || [];
    let finalItems: any[] = [];

    if (categoryIds.length > 0) {
        const { data: fetchedItems } = await supabase
            .from("menu_items")
            .select("id, name, description, price, category_id, image_url")
            .in("category_id", categoryIds)
            .eq("is_available", true);

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
