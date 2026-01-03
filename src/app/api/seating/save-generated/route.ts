import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createAdminClient();
        const body = await request.json();
        const { locationId, tables, name } = body;

        console.log(`AI Layout Save: Received request for loc ${locationId}, ${tables?.length} tables`);

        if (!locationId || !tables) {
            return NextResponse.json({ error: "Missing data" }, { status: 400 });
        }

        // 1. Create a new map
        const { data: map, error: mapError } = await supabase
            .from("seating_maps")
            .insert({
                location_id: locationId,
                name: name || "AI Generated Layout",
                is_active: true
            })
            .select("id")
            .single();

        if (mapError) {
            console.error("AI Layout Save: Seating map error:", mapError);
            throw mapError;
        }

        if (!map) throw new Error("Failed to create map record");

        console.log(`AI Layout Save: Created map ${map.id}`);

        // 2. Insert tables
        if (tables && tables.length > 0) {
            const tablesToInsert = tables.map((t: any) => ({
                map_id: map.id,
                label: t.label || "Table",
                shape: t.shape || "rect",
                object_type: t.object_type || "table",
                x: Math.round(t.x || 0),
                y: Math.round(t.y || 0),
                width: Math.round(t.width || 60),
                height: Math.round(t.height || 60),
                rotation: 0,
                capacity: parseInt(t.capacity) || 4,
                is_active: true
            }));

            const { error: tablesError } = await supabase
                .from("seating_tables")
                .insert(tablesToInsert);

            if (tablesError) {
                console.error("AI Layout Save: Seating tables error:", tablesError);
                throw tablesError;
            }
            console.log(`AI Layout Save: Successfully inserted ${tablesToInsert.length} tables`);
        }

        return NextResponse.json({ success: true, mapId: map.id });

    } catch (error: any) {
        console.error("Layout save error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
