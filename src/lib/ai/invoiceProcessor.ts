// Uses Gemini 1.5 Flash for OCR and intelligent data extraction from invoices

import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// ============================================
// TYPES
// ============================================

export interface ExtractedVendor {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    accountNumber?: string;
}

export interface ExtractedLineItem {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    extendedPrice: number;
    suggestedCategory: string;
    suggestedSubCategory: string;
    confidence: number;
}

export interface ExtractedInvoice {
    vendor: ExtractedVendor;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    lineItems: ExtractedLineItem[];
    subtotal: number;
    tax: number;
    total: number;
    confidence: number;
    processingNotes: string[];
}

export interface InventoryMatchSuggestion {
    lineItemIndex: number;
    inventoryItemId: string;
    inventoryItemName: string;
    confidence: number;
    reasoning: string;
}

// ============================================
// INVOICE EXTRACTION
// ============================================

/**
 * Extract structured invoice data from an image or PDF using Gemini Vision
 */
export async function extractInvoiceData(
    fileBase64: string,
    mimeType: string
): Promise<ExtractedInvoice> {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const imagePart: Part = {
        inlineData: {
            mimeType: mimeType,
            data: fileBase64,
        },
    };

    const prompt = `You are an expert invoice processor specialized in restaurant supplier invoices. 
Analyze this document (which may be a PDF or image) and extract all data into a structured JSON format.

RESTAURANT CONTEXT:
- Vendors are usually food distributors (Sysco, US Foods, PFG), beverage companies (Coca-Cola, Pepsi, breweries), or local produce/meat/linen suppliers.
- Line items are food ingredients, beverages, or supplies.
- Units often include: CA (Case), EA (Each), LB (Pound), BAG, BX (Box), PK (Pack).

EXTRACTION RULES:
1. VENDOR: Extract the full legal name, address, and phone.
2. INVOICE DETAILS: Find the invoice number, billing date, and due date.
3. LINE ITEMS: Extract EVERY line item. 
   - Description: Full product description.
   - Quantity: The number of units.
   - Unit: The unit of measure (e.g., CS, EA, LB).
   - Unit Price: Cost per single unit.
   - Extended Price: Total for that line (Qty * Unit Price).
   - Category: One of [food, beverage, alcohol, supplies, linens, equipment, chemicals, paper_goods, other].
   - Sub-Category (for food): [beef, pork, poultry, seafood, dairy, produce, frozen, dry_goods, bakery, condiments].
4. TOTALS: Subtotal, Tax, and Grand Total.

Return ONLY a valid JSON object. If a value is missing, use null.

JSON STRUCTURE:
{
    "vendor": {
        "name": "string",
        "address": "string or null",
        "phone": "string or null", 
        "email": "string or null",
        "accountNumber": "string or null"
    },
    "invoiceNumber": "string",
    "invoiceDate": "YYYY-MM-DD",
    "dueDate": "YYYY-MM-DD or null",
    "lineItems": [
        {
            "description": "string",
            "quantity": number,
            "unit": "string",
            "unitPrice": number,
            "extendedPrice": number,
            "suggestedCategory": "string",
            "suggestedSubCategory": "string or null",
            "confidence": number (0-1)
        }
    ],
    "subtotal": number,
    "tax": number,
    "total": number,
    "confidence": number (0-1),
    "processingNotes": ["string"]
}`;

    try {
        console.log(`AI Processing start for ${mimeType}`);
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        console.log("AI Raw Response Length:", text.length);
        if (text.length < 50) {
            console.log("AI Raw Response (short):", text);
        }

        // Extract JSON from response (handle markdown code blocks and potential garbage)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            jsonStr = jsonMatch[0].trim();
            // Remove markdown backticks if they exist
            if (jsonStr.startsWith("```")) {
                jsonStr = jsonStr.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
            }
        }

        try {
            const parsed = JSON.parse(jsonStr);
            console.log("AI JSON parsing successful");
            // Validate and clean the extracted data
            return validateAndCleanInvoice(parsed);
        } catch (parseError) {
            console.error("AI JSON Parse Error. Raw string segment:", jsonStr.substring(0, 200));
            throw parseError;
        }
    } catch (error) {
        console.error("Error in extractInvoiceData:", error);
        throw new Error(`Failed to extract invoice data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Validate and clean extracted invoice data
 */
function validateAndCleanInvoice(data: any): ExtractedInvoice {
    const processingNotes: string[] = data.processingNotes || [];

    // Ensure line items have valid numbers
    const lineItems: ExtractedLineItem[] = (data.lineItems || []).map((item: any, index: number) => {
        const quantity = parseFloat(item.quantity) || 1;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        let extendedPrice = parseFloat(item.extendedPrice) || 0;

        // Recalculate extended price if it doesn't match
        const calculated = quantity * unitPrice;
        if (Math.abs(calculated - extendedPrice) > 0.01) {
            extendedPrice = calculated;
            processingNotes.push(`Line ${index + 1}: Recalculated extended price`);
        }

        return {
            description: String(item.description || "Unknown Item"),
            quantity,
            unit: String(item.unit || "each"),
            unitPrice,
            extendedPrice,
            suggestedCategory: item.suggestedCategory || "other",
            suggestedSubCategory: item.suggestedSubCategory || "",
            confidence: parseFloat(item.confidence) || 0.8,
        };
    });

    // Calculate subtotal from line items if missing
    const calculatedSubtotal = lineItems.reduce((sum, item) => sum + item.extendedPrice, 0);
    const subtotal = parseFloat(data.subtotal) || calculatedSubtotal;
    const tax = parseFloat(data.tax) || 0;
    const total = parseFloat(data.total) || (subtotal + tax);

    return {
        vendor: {
            name: String(data.vendor?.name || "Unknown Vendor"),
            address: data.vendor?.address || undefined,
            phone: data.vendor?.phone || undefined,
            email: data.vendor?.email || undefined,
            accountNumber: data.vendor?.accountNumber || undefined,
        },
        invoiceNumber: String(data.invoiceNumber || ""),
        invoiceDate: String(data.invoiceDate || new Date().toISOString().split("T")[0]),
        dueDate: data.dueDate || undefined,
        lineItems,
        subtotal,
        tax,
        total,
        confidence: parseFloat(data.confidence) || 0.8,
        processingNotes,
    };
}

// ============================================
// INVENTORY MATCHING
// ============================================

/**
 * Use AI to match invoice line items to existing inventory items
 */
export async function matchLineItemsToInventory(
    lineItems: ExtractedLineItem[],
    inventoryItems: { id: string; name: string; category: string | null; unit: string }[]
): Promise<InventoryMatchSuggestion[]> {
    if (lineItems.length === 0 || inventoryItems.length === 0) {
        return [];
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are matching invoice line items to a restaurant's inventory database.

INVOICE LINE ITEMS:
${lineItems.map((item, i) => `${i}: "${item.description}" (${item.quantity} ${item.unit} @ $${item.unitPrice})`).join("\n")}

INVENTORY DATABASE:
${inventoryItems.map(item => `ID: ${item.id} | Name: "${item.name}" | Category: ${item.category || "uncategorized"} | Unit: ${item.unit}`).join("\n")}

For each invoice line item, suggest the best matching inventory item. Consider:
- Product name similarity (brand names, descriptive terms)
- Unit compatibility (e.g., "case" might contain multiple "each")
- Category relevance

Return ONLY valid JSON array:
[
    {
        "lineItemIndex": 0,
        "inventoryItemId": "uuid-string",
        "inventoryItemName": "matched item name",
        "confidence": 0.95,
        "reasoning": "Brief explanation"
    }
]

Only include matches with confidence >= 0.6. If no good match exists, omit that line item.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        const suggestions = JSON.parse(jsonStr);

        // Validate suggestions
        return (suggestions || []).filter((s: any) =>
            typeof s.lineItemIndex === "number" &&
            typeof s.inventoryItemId === "string" &&
            typeof s.confidence === "number" &&
            s.confidence >= 0.6
        ).map((s: any) => ({
            lineItemIndex: s.lineItemIndex,
            inventoryItemId: s.inventoryItemId,
            inventoryItemName: s.inventoryItemName || "",
            confidence: s.confidence,
            reasoning: s.reasoning || "",
        }));
    } catch (error) {
        console.error("Error matching to inventory:", error);
        return [];
    }
}

// ============================================
// VENDOR MATCHING
// ============================================

/**
 * Find or suggest a matching vendor from existing vendors
 */
export async function findMatchingVendor(
    extractedVendor: ExtractedVendor,
    existingVendors: { id: string; name: string; email?: string | null; phone?: string | null }[]
): Promise<{ vendorId: string; confidence: number } | null> {
    const extractedName = extractedVendor.name.toLowerCase().trim();

    // First, try exact or close name match
    for (const vendor of existingVendors) {
        const existingName = vendor.name.toLowerCase().trim();

        // Exact match
        if (existingName === extractedName) {
            return { vendorId: vendor.id, confidence: 1.0 };
        }

        // Contains match (e.g., "SYSCO CENTRAL FLORIDA" matches "Sysco")
        if (existingName.includes(extractedName) || extractedName.includes(existingName)) {
            return { vendorId: vendor.id, confidence: 0.9 };
        }

        // First word match for common vendors
        const extractedFirst = extractedName.split(/\s+/)[0];
        const existingFirst = existingName.split(/\s+/)[0];
        if (extractedFirst === existingFirst && extractedFirst.length > 3) {
            return { vendorId: vendor.id, confidence: 0.85 };
        }
    }

    // No match found
    return null;
}

// ============================================
// CATEGORY ASSIGNMENT
// ============================================

/**
 * Standard GL codes for restaurant expense categories
 */
export const GL_CODES: Record<string, { code: string; label: string }> = {
    food: { code: "5100", label: "Cost of Goods - Food" },
    beverage: { code: "5200", label: "Cost of Goods - Beverage" },
    alcohol: { code: "5300", label: "Cost of Goods - Alcohol" },
    supplies: { code: "5400", label: "Operating Supplies" },
    linens: { code: "5410", label: "Linen & Uniforms" },
    equipment: { code: "5500", label: "Equipment & Smallwares" },
    chemicals: { code: "5420", label: "Cleaning Supplies" },
    paper_goods: { code: "5430", label: "Paper Goods" },
    other: { code: "5900", label: "Other Operating Expenses" },
};

/**
 * Get GL code for a category
 */
export function getGLCode(category: string): string {
    return GL_CODES[category]?.code || GL_CODES.other.code;
}
