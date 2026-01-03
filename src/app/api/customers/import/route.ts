import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ParsedCustomer } from "@/lib/csv/csvUtils";

interface ImportRequest {
    customers: ParsedCustomer[];
    location_id: string;
}

interface ImportResult {
    success: boolean;
    total_processed: number;
    successful_imports: number;
    failed_imports: number;
    errors: {
        row: number;
        name: string;
        error: string;
    }[];
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: ImportRequest = await request.json();
        const { customers, location_id } = body;

        if (!customers || !Array.isArray(customers) || customers.length === 0) {
            return NextResponse.json({ error: "No customers to import" }, { status: 400 });
        }

        if (!location_id) {
            return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
        }

        // Basic permissions check - only GM, AGM, or Admin/Owner
        const { data: employeeData } = await supabase
            .from("employees")
            .select("role")
            .eq("location_id", location_id)
            .eq("user_id", user.id)
            .single();

        const { data: locationData } = await supabase
            .from("locations")
            .select("owner_id")
            .eq("id", location_id)
            .single();

        const isOwner = (locationData as any)?.owner_id === user.id;
        const isManager = ["manager", "gm", "agm"].includes((employeeData as any)?.role || "");

        if (!isOwner && !isManager) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const result: ImportResult = {
            success: true,
            total_processed: customers.length,
            successful_imports: 0,
            failed_imports: 0,
            errors: []
        };

        // Import in chunks to avoid single record failures blocking the whole batch
        // and to manage payload sizes
        for (const cust of customers) {
            try {
                const customerData = {
                    location_id,
                    first_name: cust.first_name || null,
                    last_name: cust.last_name || null,
                    email: cust.email || null,
                    phone: cust.phone || null,
                    birthday: cust.birthday || null,
                    is_loyalty_member: cust.is_loyalty_member,
                    loyalty_points: cust.loyalty_points,
                    loyalty_tier: cust.loyalty_tier || null,
                    total_spent: cust.total_spent,
                    total_visits: cust.total_visits,
                    notes: cust.notes || null,
                    metadata: cust.custom_fields || {}
                };

                const { error: insError } = await (supabase as any)
                    .from("customers")
                    .insert(customerData);

                if (insError) {
                    result.failed_imports++;
                    result.errors.push({
                        row: cust.row_index,
                        name: `${cust.first_name || "?"} ${cust.last_name || "?"}`,
                        error: insError.message
                    });
                } else {
                    result.successful_imports++;
                }
            } catch (err: any) {
                result.failed_imports++;
                result.errors.push({
                    row: cust.row_index,
                    name: `${cust.first_name || "?"} ${cust.last_name || "?"}`,
                    error: err.message || "Unknown error"
                });
            }
        }

        result.success = result.failed_imports === 0;
        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Customer import error:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
