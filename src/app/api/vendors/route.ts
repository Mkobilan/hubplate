// Vendors API Route
// CRUD operations for vendor management

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const locationId = searchParams.get("locationId");
        const vendorId = searchParams.get("id");
        const includeStats = searchParams.get("includeStats") === "true";

        if (vendorId) {
            // Single vendor with invoice summary
            const { data: vendor, error } = await (supabase
                .from("vendors") as any)
                .select("*")
                .eq("id", vendorId)
                .single();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }

            // Get invoice stats for this vendor
            if (includeStats) {
                const { data: invoices } = await (supabase
                    .from("invoices") as any)
                    .select("total, status, invoice_date")
                    .eq("vendor_id", vendorId)
                    .order("invoice_date", { ascending: false });

                const stats = {
                    totalInvoices: invoices?.length || 0,
                    totalSpend: invoices?.reduce((sum: number, inv: any) => sum + Number(inv.total), 0) || 0,
                    pendingInvoices: invoices?.filter((inv: any) => inv.status === "pending").length || 0,
                    lastInvoiceDate: invoices?.[0]?.invoice_date || null,
                };

                return NextResponse.json({ vendor, stats });
            }

            return NextResponse.json({ vendor });
        }

        if (!locationId) {
            return NextResponse.json(
                { error: "locationId is required" },
                { status: 400 }
            );
        }

        // List vendors
        let query = (supabase
            .from("vendors") as any)
            .select("*")
            .eq("location_id", locationId)
            .eq("is_active", true)
            .order("name", { ascending: true });

        const { data: vendors, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ vendors });

    } catch (error) {
        console.error("GET vendors error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { locationId, name, email, phone, address, accountNumber, paymentTerms, notes } = body;

        if (!locationId || !name) {
            return NextResponse.json(
                { error: "locationId and name are required" },
                { status: 400 }
            );
        }

        const { data: vendor, error } = await (supabase
            .from("vendors") as any)
            .insert({
                location_id: locationId,
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                address: address?.trim() || null,
                account_number: accountNumber?.trim() || null,
                payment_terms: paymentTerms || "NET30",
                notes: notes?.trim() || null,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json(
                    { error: "A vendor with this name already exists" },
                    { status: 409 }
                );
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ vendor });

    } catch (error) {
        console.error("POST vendor error:", error);
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
        const { vendorId, ...updates } = body;

        if (!vendorId) {
            return NextResponse.json(
                { error: "vendorId is required" },
                { status: 400 }
            );
        }

        // Clean up updates
        const cleanUpdates: Record<string, any> = {};
        if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
        if (updates.email !== undefined) cleanUpdates.email = updates.email?.trim() || null;
        if (updates.phone !== undefined) cleanUpdates.phone = updates.phone?.trim() || null;
        if (updates.address !== undefined) cleanUpdates.address = updates.address?.trim() || null;
        if (updates.accountNumber !== undefined) cleanUpdates.account_number = updates.accountNumber?.trim() || null;
        if (updates.paymentTerms !== undefined) cleanUpdates.payment_terms = updates.paymentTerms;
        if (updates.notes !== undefined) cleanUpdates.notes = updates.notes?.trim() || null;
        if (updates.isActive !== undefined) cleanUpdates.is_active = updates.isActive;
        if (updates.defaultGlCode !== undefined) cleanUpdates.default_gl_code = updates.defaultGlCode;

        cleanUpdates.updated_at = new Date().toISOString();

        const { data: vendor, error } = await (supabase
            .from("vendors") as any)
            .update(cleanUpdates)
            .eq("id", vendorId)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ vendor });

    } catch (error) {
        console.error("PATCH vendor error:", error);
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
        const vendorId = searchParams.get("id");

        if (!vendorId) {
            return NextResponse.json(
                { error: "Vendor ID is required" },
                { status: 400 }
            );
        }

        // Soft delete - just mark as inactive
        const { error } = await (supabase
            .from("vendors") as any)
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", vendorId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("DELETE vendor error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
