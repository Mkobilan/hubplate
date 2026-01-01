// Invoice Upload API Route
// Handles file upload, storage, and triggers AI processing

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { extractInvoiceData, matchLineItemsToInventory, findMatchingVendor, getGLCode } from "@/lib/ai/invoiceProcessor";
import { Database } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow 60 seconds for AI processing

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const locationId = formData.get("locationId") as string | null;
        const source = (formData.get("source") as string) || "upload";

        if (!file || !locationId) {
            return NextResponse.json(
                { error: "File and locationId are required" },
                { status: 400 }
            );
        }

        // Check if user is Org Owner or Manager
        const { data: organization } = await supabase
            .from("organizations")
            .select("id")
            .eq("owner_id", user.id)
            .single();

        const isOrgOwner = !!organization;

        const { data: employee } = await supabase
            .from("employees")
            .select("id, role")
            .eq("user_id", user.id)
            .eq("location_id", locationId)
            .eq("is_active", true)
            .single();

        const isManager = (employee as any)?.role && ["owner", "manager", "gm", "agm"].includes((employee as any).role);

        if (!isOrgOwner && !isManager) {
            return NextResponse.json({ error: "Unauthorized: Manager access required" }, { status: 403 });
        }

        // Validate file type
        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Allowed: PDF, JPEG, PNG, WebP, HEIC" },
                { status: 400 }
            );
        }

        // Check for Gemini API Key
        if (!process.env.GOOGLE_GEMINI_API_KEY) {
            console.error("CRITICAL: GOOGLE_GEMINI_API_KEY is not set");
            return NextResponse.json(
                { error: "AI configuration missing. Please contact support." },
                { status: 500 }
            );
        }

        // Convert file to base64 for AI processing
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        // Ensure bucket exists (using Admin Client)
        const supabaseAdmin = await createAdminClient();
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.id === "invoices");

        if (!bucketExists) {
            console.log("Creating 'invoices' bucket...");
            const { error: bucketError } = await supabaseAdmin.storage.createBucket("invoices", {
                public: true,
                allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"],
                fileSizeLimit: 52428800 // 50MB
            });

            if (bucketError) {
                console.error("Error creating bucket:", bucketError);
                return NextResponse.json({ error: "Failed to initialize storage. Please try again later." }, { status: 500 });
            }
        } else {
            // Ensure existing bucket is public
            console.log("Ensuring 'invoices' bucket is public...");
            await supabaseAdmin.storage.updateBucket("invoices", {
                public: true,
                allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"]
            });
        }

        // Upload file to Supabase Storage (using Admin Client to ensure success/bypass RLS)
        const fileName = `${locationId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from("invoices")
            .upload(fileName, file, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json(
                { error: `Upload failed: ${uploadError.message}` },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from("invoices")
            .getPublicUrl(fileName);

        console.log("Generated Invoice URL:", urlData.publicUrl);

        // Create invoice record with processing status
        const { data: invoice, error: invoiceError } = await (supabase
            .from("invoices") as any)
            .insert({
                location_id: locationId,
                source: source as "upload" | "scan" | "manual",
                original_file_url: urlData.publicUrl,
                original_file_name: file.name,
                processing_status: "processing",
            })
            .select()
            .single();

        if (invoiceError) {
            console.error("Invoice creation error:", invoiceError);
            return NextResponse.json(
                { error: "Failed to create invoice record" },
                { status: 500 }
            );
        }

        // Process with AI (async but we'll wait for it)
        try {
            // Extract invoice data using Gemini Vision
            const extractedData = await extractInvoiceData(base64, file.type);

            // Fetch existing vendors for matching
            const { data: existingVendors } = await (supabase
                .from("vendors") as any)
                .select("id, name, email, phone")
                .eq("location_id", locationId)
                .eq("is_active", true);

            // Try to find matching vendor
            let vendorId: string | null = null;
            const vendorMatch = await findMatchingVendor(
                extractedData.vendor,
                existingVendors || []
            );

            if (vendorMatch && vendorMatch.confidence >= 0.8) {
                vendorId = vendorMatch.vendorId;
            } else {
                // Create new vendor
                const { data: newVendor } = await (supabase
                    .from("vendors") as any)
                    .insert({
                        location_id: locationId,
                        name: extractedData.vendor.name,
                        address: extractedData.vendor.address,
                        phone: extractedData.vendor.phone,
                        email: extractedData.vendor.email,
                        account_number: extractedData.vendor.accountNumber,
                    })
                    .select()
                    .single();

                if (newVendor) {
                    vendorId = (newVendor as any).id;
                }
            }

            // Fetch inventory items for matching
            const { data: inventoryItems } = await supabase
                .from("inventory_items")
                .select("id, name, category, unit")
                .eq("location_id", locationId);

            // Match line items to inventory
            const inventoryMatches = await matchLineItemsToInventory(
                extractedData.lineItems,
                inventoryItems || []
            );

            // Determine if needs review
            const needsReview =
                extractedData.confidence < 0.8 ||
                extractedData.lineItems.some(item => item.confidence < 0.7);

            // Update invoice with extracted data
            const { error: updateError } = await (supabase
                .from("invoices") as any)
                .update({
                    vendor_id: vendorId,
                    invoice_number: extractedData.invoiceNumber,
                    invoice_date: extractedData.invoiceDate,
                    due_date: extractedData.dueDate || null,
                    subtotal: extractedData.subtotal,
                    tax: extractedData.tax,
                    total: extractedData.total,
                    processing_status: needsReview ? "needs_review" : "completed",
                    ocr_raw_data: extractedData as any,
                    updated_at: new Date().toISOString(),
                } as any)
                .eq("id", (invoice as any).id);

            if (updateError) {
                console.error("Invoice update error:", updateError);
            }

            // Create line items
            const lineItemInserts = extractedData.lineItems.map((item, index) => {
                const match = inventoryMatches.find(m => m.lineItemIndex === index);
                return {
                    invoice_id: (invoice as any).id,
                    inventory_item_id: match?.inventoryItemId || null,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    unit_price: item.unitPrice,
                    extended_price: item.extendedPrice,
                    gl_code: getGLCode(item.suggestedCategory),
                    category: item.suggestedCategory,
                    sub_category: item.suggestedSubCategory || null,
                    confidence_score: item.confidence,
                    needs_review: item.confidence < 0.7 || !match,
                };
            });

            if (lineItemInserts.length > 0) {
                const { error: lineItemsError } = await (supabase
                    .from("invoice_line_items") as any)
                    .insert(lineItemInserts);

                if (lineItemsError) {
                    console.error("Line items insert error:", lineItemsError);
                }
            }

            if (employee || isOrgOwner) {
                await (supabase.from("invoice_approvals") as any).insert({
                    invoice_id: (invoice as any).id,
                    employee_id: (employee as any)?.id || null, // Will be null for org owners without employee record
                    action: "submitted",
                    notes: `Uploaded via ${source}`,
                });
            }

            return NextResponse.json({
                success: true,
                invoiceId: (invoice as any).id,
                processingStatus: needsReview ? "needs_review" : "completed",
                extractedData: {
                    vendor: extractedData.vendor.name,
                    invoiceNumber: extractedData.invoiceNumber,
                    total: extractedData.total,
                    lineItemCount: extractedData.lineItems.length,
                    confidence: extractedData.confidence,
                },
            });

        } catch (aiError) {
            console.error("AI processing error:", aiError);

            // Update invoice with failed status
            await (supabase
                .from("invoices") as any)
                .update({
                    processing_status: "failed",
                    processing_errors: { error: String(aiError) },
                    updated_at: new Date().toISOString(),
                })
                .eq("id", (invoice as any).id);

            return NextResponse.json({
                success: false,
                invoiceId: (invoice as any).id,
                processingStatus: "failed",
                error: "AI processing failed. Please enter invoice data manually.",
            });
        }

    } catch (error) {
        console.error("Invoice upload error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
