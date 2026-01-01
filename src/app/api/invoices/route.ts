// Invoice CRUD API Route
// GET: List invoices, GET by ID, PATCH: Update, DELETE: Remove

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/types/database";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const locationId = searchParams.get("locationId");
        const invoiceId = searchParams.get("id");
        const status = searchParams.get("status");
        const vendorId = searchParams.get("vendorId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Single invoice fetch with line items
        if (invoiceId) {
            const { data: invoice, error } = await (supabase
                .from("invoices") as any)
                .select(`
                    *,
                    vendors (id, name, email, phone, address),
                    invoice_line_items (
                        *,
                        inventory_items (id, name, category, unit)
                    ),
                    invoice_approvals (
                        id, action, notes, created_at,
                        employees (id, first_name, last_name)
                    )
                `)
                .eq("id", invoiceId)
                .single();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }

            return NextResponse.json({ invoice });
        }

        // List invoices
        if (!locationId) {
            return NextResponse.json(
                { error: "locationId is required" },
                { status: 400 }
            );
        }

        let query = (supabase
            .from("invoices") as any)
            .select(`
                *,
                vendors (id, name)
            `)
            .eq("location_id", locationId)
            .order("created_at", { ascending: false });

        if (status) {
            if (status === "needs_review") {
                query = query.eq("processing_status", "needs_review");
            } else if (status === "failed") {
                query = query.eq("processing_status", "failed");
            } else if (status === "pending") {
                // Pending means status is pending AND processing is completed
                query = query.eq("status", "pending").eq("processing_status", "completed");
            } else {
                query = query.eq("status", status);
            }
        }

        if (vendorId) {
            query = query.eq("vendor_id", vendorId);
        }

        if (startDate) {
            query = query.gte("invoice_date", startDate);
        }

        if (endDate) {
            query = query.lte("invoice_date", endDate);
        }

        const { data: invoices, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ invoices });

    } catch (error) {
        console.error("GET invoices error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { invoiceId, action, updates, lineItems } = body;

        if (!invoiceId) {
            return NextResponse.json(
                { error: "invoiceId is required" },
                { status: 400 }
            );
        }

        // Get invoice to check location
        const { data: invoice, error: fetchError } = await (supabase
            .from("invoices") as any)
            .select("id, location_id, status")
            .eq("id", invoiceId)
            .single();

        if (fetchError || !invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // Check if user is Org Owner (bypass employee check)
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .single();

        const { data: organization } = await supabase
            .from("organizations")
            .select("id")
            .eq("owner_id", user.id)
            .single();

        const isOrgOwner = !!organization;

        // Get employee for approval logging
        const { data: employee } = await supabase
            .from("employees")
            .select("id, role")
            .eq("user_id", user.id)
            .eq("location_id", (invoice as any).location_id)
            .eq("is_active", true)
            .single();

        const isManager = employee && ["owner", "manager", "gm", "agm"].includes((employee as any).role);

        if (!isOrgOwner && !isManager) {
            return NextResponse.json({ error: "Unauthorized: Manager access required" }, { status: 403 });
        }

        // Handle approve/reject actions
        if (action === "approve") {
            const { error: updateError } = await (supabase
                .from("invoices") as any)
                .update({
                    status: "approved",
                    processing_status: "completed",
                    approved_by: (employee as any)?.id,
                    approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", invoiceId);

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            // Log approval
            if (employee) {
                await (supabase.from("invoice_approvals") as any).insert({
                    invoice_id: invoiceId,
                    employee_id: (employee as any).id,
                    action: "approved",
                });
            }

            return NextResponse.json({ success: true, status: "approved" });
        }

        if (action === "reject") {
            const { error: updateError } = await (supabase
                .from("invoices") as any)
                .update({
                    status: "disputed",
                    notes: updates?.notes || "Rejected by manager",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", invoiceId);

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            // Log rejection
            if (employee) {
                await (supabase.from("invoice_approvals") as any).insert({
                    invoice_id: invoiceId,
                    employee_id: (employee as any).id,
                    action: "rejected",
                    notes: updates?.notes,
                });
            }

            return NextResponse.json({ success: true, status: "disputed" });
        }

        if (action === "mark_paid") {
            const { error: updateError } = await (supabase
                .from("invoices") as any)
                .update({
                    status: "paid",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", invoiceId);

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, status: "paid" });
        }

        // General update
        if (updates) {
            const { error: updateError } = await (supabase
                .from("invoices") as any)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                } as any)
                .eq("id", invoiceId);

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            // Log edit
            if (employee) {
                await (supabase.from("invoice_approvals") as any).insert({
                    invoice_id: invoiceId,
                    employee_id: (employee as any).id,
                    action: "edited",
                });
            }
        }

        // Update line items if provided
        if (lineItems && Array.isArray(lineItems)) {
            for (const item of lineItems) {
                if (item.id) {
                    // Update existing line item
                    await (supabase
                        .from("invoice_line_items") as any)
                        .update({
                            description: item.description,
                            quantity: item.quantity,
                            unit: item.unit,
                            unit_price: item.unit_price,
                            extended_price: item.extended_price,
                            inventory_item_id: item.inventory_item_id,
                            category: item.category,
                            gl_code: item.gl_code,
                            needs_review: false,
                        })
                        .eq("id", item.id);
                } else {
                    // Insert new line item
                    await (supabase
                        .from("invoice_line_items") as any)
                        .insert({
                            invoice_id: invoiceId,
                            description: item.description,
                            quantity: item.quantity || 1,
                            unit: item.unit,
                            unit_price: item.unit_price || 0,
                            extended_price: item.extended_price || 0,
                            inventory_item_id: item.inventory_item_id,
                            category: item.category,
                            gl_code: item.gl_code,
                        });
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("PATCH invoice error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const invoiceId = searchParams.get("id");

        if (!invoiceId) {
            return NextResponse.json(
                { error: "Invoice ID is required" },
                { status: 400 }
            );
        }

        // Get invoice to delete associated file
        const { data: invoice } = await (supabase
            .from("invoices") as any)
            .select("original_file_url")
            .eq("id", invoiceId)
            .single();

        // Delete the invoice (cascade will delete line items)
        const { error: deleteError } = await (supabase
            .from("invoices") as any)
            .delete()
            .eq("id", invoiceId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // Try to delete the file from storage
        if ((invoice as any)?.original_file_url) {
            try {
                const path = (invoice as any).original_file_url.split("/invoices/")[1];
                if (path) {
                    await supabase.storage.from("invoices").remove([path]);
                }
            } catch (e) {
                console.warn("Failed to delete invoice file:", e);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("DELETE invoice error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
