import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ mapId: string }> }
) {
    try {
        const { mapId } = await params;
        const supabase = await createClient();

        if (!mapId) {
            return NextResponse.json({ error: "Missing mapId" }, { status: 400 });
        }

        // We use creating a client to respect RLS
        const { error } = await (supabase as any)
            .from("seating_maps")
            .delete()
            .eq("id", mapId);

        if (error) {
            console.error("Delete map error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Delete map API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
