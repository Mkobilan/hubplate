import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

interface MappingRequest {
    headers: string[];
    sampleData: Record<string, string>[];
}

interface AIFieldMappingSuggestion {
    csvColumn: string;
    suggestedField: string;
    confidence: number;
    customFieldName?: string;
    customFieldLabel?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: MappingRequest = await request.json();
        const { headers, sampleData } = body;

        if (!headers || headers.length === 0) {
            return NextResponse.json({ error: "No headers provided" }, { status: 400 });
        }

        // Check if API key is configured
        if (!process.env.GOOGLE_GEMINI_API_KEY) {
            console.warn("GOOGLE_GEMINI_API_KEY not configured, using fallback mapping");
            return NextResponse.json({ suggestions: fallbackFieldMapping(headers) });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // Get sample values for context
        const sampleValues: Record<string, string[]> = {};
        headers.forEach(header => {
            sampleValues[header] = sampleData.slice(0, 3).map(row => row[header]).filter(Boolean);
        });

        const prompt = `You are an expert at mapping CSV columns to database fields for a restaurant employee management system.

CSV Headers and Sample Values:
${headers.map(h => `- "${h}": [${sampleValues[h]?.map(v => `"${v}"`).join(", ") || ""}]`).join("\n")}

Available standard fields to map to:
- first_name: Employee's first name
- last_name: Employee's last name  
- email: Email address
- phone: Phone number
- role: Job role (server, cook, host, bartender, manager, agm, owner, etc.)
- hourly_rate: Pay rate per hour
- hire_date: Date of hire
- pin_code: Clock-in PIN code

For each CSV column, suggest:
1. Which standard field it maps to (or "custom" for extra fields like address, emergency_contact, etc., or "skip" for irrelevant columns like ID numbers)
2. Confidence level (0.0 to 1.0)
3. If "custom", suggest a field_name (snake_case) and field_label (Human Readable)

Return ONLY a JSON array:
[
  {
    "csvColumn": "Column Name",
    "suggestedField": "first_name" | "last_name" | "email" | "phone" | "role" | "hourly_rate" | "hire_date" | "pin_code" | "custom" | "skip",
    "confidence": 0.95,
    "customFieldName": "address" (only if suggestedField is "custom"),
    "customFieldLabel": "Home Address" (only if suggestedField is "custom")
  }
]

JSON:`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("AI mapping failed, using fallback");
            return NextResponse.json({ suggestions: fallbackFieldMapping(headers) });
        }

        const suggestions = JSON.parse(jsonMatch[0]) as AIFieldMappingSuggestion[];
        return NextResponse.json({ suggestions });

    } catch (error: any) {
        console.error("AI field mapping error:", error);
        // Return fallback mapping on error
        const body = await request.clone().json();
        return NextResponse.json({ suggestions: fallbackFieldMapping(body.headers || []) });
    }
}

/**
 * Fallback field mapping without AI
 */
function fallbackFieldMapping(headers: string[]): AIFieldMappingSuggestion[] {
    const commonMappings: Record<string, string> = {
        "first_name": "first_name",
        "firstname": "first_name",
        "first name": "first_name",
        "fname": "first_name",
        "last_name": "last_name",
        "lastname": "last_name",
        "last name": "last_name",
        "lname": "last_name",
        "email": "email",
        "email address": "email",
        "e-mail": "email",
        "phone": "phone",
        "phone number": "phone",
        "telephone": "phone",
        "mobile": "phone",
        "cell": "phone",
        "role": "role",
        "position": "role",
        "job title": "role",
        "title": "role",
        "hourly_rate": "hourly_rate",
        "hourly rate": "hourly_rate",
        "pay rate": "hourly_rate",
        "rate": "hourly_rate",
        "wage": "hourly_rate",
        "hire_date": "hire_date",
        "hire date": "hire_date",
        "start date": "hire_date",
        "start_date": "hire_date",
        "date hired": "hire_date",
        "pin": "pin_code",
        "pin_code": "pin_code",
        "pin code": "pin_code",
    };

    return headers.map(header => {
        const normalized = header.toLowerCase().trim();
        const mapped = commonMappings[normalized];

        if (mapped) {
            return {
                csvColumn: header,
                suggestedField: mapped,
                confidence: 0.9
            };
        }

        // Check if it might be a custom field
        const isLikelyCustom = [
            "address", "street", "city", "state", "zip", "emergency",
            "contact", "notes", "ssn", "social", "license", "id",
            "department", "location", "shift"
        ].some(keyword => normalized.includes(keyword));

        if (isLikelyCustom) {
            return {
                csvColumn: header,
                suggestedField: "custom",
                confidence: 0.7,
                customFieldName: normalized.replace(/\s+/g, "_"),
                customFieldLabel: header
            };
        }

        return {
            csvColumn: header,
            suggestedField: "skip",
            confidence: 0.5
        };
    });
}
