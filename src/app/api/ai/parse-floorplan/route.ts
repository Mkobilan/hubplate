import { NextRequest, NextResponse } from "next/server";
import { parseFloorplan } from "@/lib/ai/gemini";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const locationId = formData.get("locationId") as string;

        if (!file || !locationId) {
            return NextResponse.json({ error: "Missing file or locationId" }, { status: 400 });
        }

        // Convert file to base64
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");

        // Use the centralized gemini service
        const parsedData = await parseFloorplan(base64);

        return NextResponse.json(parsedData);

    } catch (error: any) {
        console.error("Floorplan parsing error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
