import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

interface MappingRequest {
  headers: string[];
  sampleData: Record<string, string>[];
  type?: "employee" | "customer" | "inventory" | "menu" | "vendor" | "gift_card";
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
    const { headers, sampleData, type = "employee" } = body;

    if (!headers || headers.length === 0) {
      return NextResponse.json({ error: "No headers provided" }, { status: 400 });
    }

    // Check if API key is configured
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.warn("GOOGLE_GEMINI_API_KEY not configured, using fallback mapping");
      return NextResponse.json({ suggestions: fallbackFieldMapping(headers, type) });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Get sample values for context
    const sampleValues: Record<string, string[]> = {};
    headers.forEach(header => {
      sampleValues[header] = sampleData.slice(0, 3).map(row => row[header]).filter(Boolean);
    });

    const employeePrompt = `You are an expert at mapping CSV columns to database fields for a restaurant employee management system.

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
- external_id: Employee's external payroll or POS ID
- ytd_gross: Year-to-date gross earnings
- ytd_net: Year-to-date net earnings
- ytd_tax: Year-to-date taxes withheld

For each CSV column, suggest:
1. Which standard field it maps to (or "custom" for extra fields like address, emergency_contact, etc., or "skip" for irrelevant columns like ID numbers)
2. Confidence level (0.0 to 1.0)
3. If "custom", suggest a field_name (snake_case) and field_label (Human Readable)

Return ONLY a JSON array:
[
  {
    "csvColumn": "Column Name",
    "suggestedField": "first_name" | "last_name" | "email" | "phone" | "role" | "hourly_rate" | "hire_date" | "pin_code" | "external_id" | "ytd_gross" | "ytd_net" | "ytd_tax" | "custom" | "skip",
    "confidence": 0.95,
    "customFieldName": "address" (only if suggestedField is "custom"),
    "customFieldLabel": "Home Address" (only if suggestedField is "custom")
  }
]

JSON:`;

    const customerPrompt = `You are an expert at mapping CSV columns to database fields for a restaurant customer and loyalty management system.

CSV Headers and Sample Values:
${headers.map(h => `- "${h}": [${sampleValues[h]?.map(v => `"${v}"`).join(", ") || ""}]`).join("\n")}

Available standard fields to map to:
- first_name: Customer's first name
- last_name: Customer's last name  
- email: Email address
- phone: Phone number
- birthday: Date of birth
- is_loyalty_member: Whether they are in the loyalty program (boolean)
- loyalty_points: Current points balance
- loyalty_tier: Tier name (Silver, Gold, etc.)
- total_spent: Lifetime spend amount
- total_visits: Number of times visited
- notes: General customer notes

For each CSV column, suggest:
1. Which standard field it maps to (or "custom" for extra attributes, or "skip" for irrelevant columns)
2. Confidence level (0.0 to 1.0)
3. If "custom", suggest a field_name (snake_case) and field_label (Human Readable)

Return ONLY a JSON array:
[
  {
    "csvColumn": "Column Name",
    "suggestedField": "first_name" | "last_name" | "email" | "phone" | "birthday" | "is_loyalty_member" | "loyalty_points" | "loyalty_tier" | "total_spent" | "total_visits" | "notes" | "custom" | "skip",
    "confidence": 0.95,
    "customFieldName": "favorite_table" (only if suggestedField is "custom"),
    "customFieldLabel": "Favorite Table" (only if suggestedField is "custom")
  }
]

JSON:`;


    const inventoryPrompt = `You are an expert at mapping CSV columns to database fields for a restaurant inventory management system.

CSV Headers and Sample Values:
${headers.map(h => `- "${h}": [${sampleValues[h]?.map(v => `"${v}"`).join(", ") || ""}]`).join("\n")}

Available standard fields to map to:
- name: Item name
- category: Category or department
- unit: Unit of measure (lb, kg, case, each, etc.)
- stock_quantity: Current quantity on hand
- par_level: Minimum stock level
- cost_per_unit: Current cost per unit
- supplier: Primary vendor name

For each CSV column, suggest:
1. Which standard field it maps to (or "custom" for extra fields, or "skip")
2. Confidence level (0.0 to 1.0)
3. If "custom", suggest a field_name (snake_case) and field_label (Human Readable)

Return ONLY a JSON array:
[
  {
    "csvColumn": "Column Name",
    "suggestedField": "name" | "category" | "unit" | "stock_quantity" | "par_level" | "cost_per_unit" | "supplier" | "custom" | "skip",
    "confidence": 0.95,
    "customFieldName": "brand_name" (only if suggestedField is "custom"),
    "customFieldLabel": "Brand Name" (only if suggestedField is "custom")
  }
]

JSON:`;

    const menuPrompt = `You are an expert at mapping CSV columns to database fields for a restaurant menu management system.

CSV Headers and Sample Values:
${headers.map(h => `- "${h}": [${sampleValues[h]?.map(v => `"${v}"`).join(", ") || ""}]`).join("\n")}

Available standard fields to map to:
- name: Item name
- description: Item description
- category: Category (Appetizers, Mains, Drinks, etc.)
- price: Selling price
- cost: Raw food cost
- kds_station: Kitchen Display Station name (Grill, Salad, Bar, etc.)

For each CSV column, suggest:
1. Which standard field it maps to (or "custom" for extra fields, or "skip")
2. Confidence level (0.0 to 1.0)
3. If "custom", suggest a field_name (snake_case) and field_label (Human Readable)

Return ONLY a JSON array:
[
  {
    "csvColumn": "Column Name",
    "suggestedField": "name" | "description" | "category" | "price" | "cost" | "kds_station" | "custom" | "skip",
    "confidence": 0.95,
    "customFieldName": "calories" (only if suggestedField is "custom"),
    "customFieldLabel": "Calories" (only if suggestedField is "custom")
  }
]

JSON:`;

    const vendorPrompt = `You are an expert at mapping CSV columns to database fields for a restaurant vendor management system.

CSV Headers and Sample Values:
${headers.map(h => `- "${h}": [${sampleValues[h]?.map(v => `"${v}"`).join(", ") || ""}]`).join("\n")}

Available standard fields to map to:
- name: Vendor name
- email: Contact email
- phone: Contact phone
- address: Physical address
- account_number: Our account number with them
- payment_terms: Payment terms (Net30, COD, etc.)

For each CSV column, suggest:
1. Which standard field it maps to (or "custom" for extra fields, or "skip")
2. Confidence level (0.0 to 1.0)
3. If "custom", suggest a field_name (snake_case) and field_label (Human Readable)

Return ONLY a JSON array:
[
  {
    "csvColumn": "Column Name",
    "suggestedField": "name" | "email" | "phone" | "address" | "account_number" | "payment_terms" | "custom" | "skip",
    "confidence": 0.95,
    "customFieldName": "contact_person" (only if suggestedField is "custom"),
    "customFieldLabel": "Contact Person" (only if suggestedField is "custom")
  }
]

JSON:`;

    const giftCardPrompt = `You are an expert at mapping CSV columns to database fields for a restaurant gift card system.

CSV Headers and Sample Values:
${headers.map(h => `- "${h}": [${sampleValues[h]?.map(v => `"${v}"`).join(", ") || ""}]`).join("\n")}

Available standard fields to map to:
- card_number: The unique gift card number
- current_balance: The remaining balance on the card
- original_balance: The initial balance when issued
- is_active: Status of the card (true/false)

For each CSV column, suggest:
1. Which standard field it maps to (or "custom" for extra fields, or "skip")
2. Confidence level (0.0 to 1.0)
3. If "custom", suggest a field_name (snake_case) and field_label (Human Readable)

Return ONLY a JSON array:
[
  {
    "csvColumn": "Column Name",
    "suggestedField": "card_number" | "current_balance" | "original_balance" | "is_active" | "custom" | "skip",
    "confidence": 0.95,
    "customFieldName": "customer_name" (only if suggestedField is "custom"),
    "customFieldLabel": "Customer Name" (only if suggestedField is "custom")
  }
]

JSON:`;

    const prompt = type === "customer" ? customerPrompt :
      type === "inventory" ? inventoryPrompt :
        type === "menu" ? menuPrompt :
          type === "vendor" ? vendorPrompt :
            type === "gift_card" ? giftCardPrompt :
              employeePrompt;
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("AI mapping failed, using fallback");
      return NextResponse.json({ suggestions: fallbackFieldMapping(headers, type) });
    }

    const suggestions = JSON.parse(jsonMatch[0]) as AIFieldMappingSuggestion[];
    return NextResponse.json({ suggestions });

  } catch (error: any) {
    console.error("AI field mapping error:", error);
    // Return fallback mapping on error
    const body = await request.clone().json();
    return NextResponse.json({ suggestions: fallbackFieldMapping(body.headers || [], body.type || "employee") });
  }
}

/**
 * Fallback field mapping without AI
 */
function fallbackFieldMapping(headers: string[], type: "employee" | "customer" | "inventory" | "menu" | "vendor" | "gift_card" = "employee"): AIFieldMappingSuggestion[] {
  const employeeMappings: Record<string, string> = {
    "first_name": "first_name", "firstname": "first_name", "first name": "first_name", "fname": "first_name",
    "last_name": "last_name", "lastname": "last_name", "last name": "last_name", "lname": "last_name",
    "email": "email", "email address": "email", "e-mail": "email",
    "phone": "phone", "phone number": "phone", "telephone": "phone", "mobile": "phone",
    "role": "role", "position": "role", "job title": "role",
    "hourly_rate": "hourly_rate", "hourly rate": "hourly_rate", "pay rate": "hourly_rate",
    "hire_date": "hire_date", "hire date": "hire_date",
    "pin": "pin_code", "pin_code": "pin_code", "pin code": "pin_code",
    "external_id": "external_id", "payroll id": "external_id", "pos id": "external_id"
  };

  const customerMappings: Record<string, string> = {
    "first_name": "first_name", "last_name": "last_name", "email": "email", "phone": "phone",
    "birthday": "birthday", "dob": "birthday", "loyalty": "is_loyalty_member",
    "points": "loyalty_points", "tier": "loyalty_tier", "spent": "total_spent",
    "visits": "total_visits", "notes": "notes"
  };

  const inventoryMappings: Record<string, string> = {
    "name": "name", "item": "name", "category": "category", "unit": "unit",
    "stock": "stock_quantity", "quantity": "stock_quantity", "qty": "stock_quantity",
    "par": "par_level", "cost": "cost_per_unit", "supplier": "supplier", "vendor": "supplier"
  };

  const menuMappings: Record<string, string> = {
    "name": "name", "item": "name", "description": "description", "desc": "description",
    "category": "category", "cat": "category", "price": "price", "cost": "cost",
    "kds": "kds_station", "station": "kds_station", "printer": "kds_station"
  };

  const vendorMappings: Record<string, string> = {
    "name": "name", "vendor": "name", "supplier": "name", "email": "email",
    "phone": "phone", "address": "address", "account": "account_number", "terms": "payment_terms"
  };

  const giftCardMappings: Record<string, string> = {
    "card_number": "card_number", "number": "card_number", "balance": "current_balance",
    "current": "current_balance", "original": "original_balance", "active": "is_active"
  };

  const mappingsMap: Record<string, Record<string, string>> = {
    employee: employeeMappings,
    customer: customerMappings,
    inventory: inventoryMappings,
    menu: menuMappings,
    vendor: vendorMappings,
    gift_card: giftCardMappings
  };

  const commonMappings = mappingsMap[type] || employeeMappings;

  return headers.map(header => {
    const normalized = header.toLowerCase().trim();
    const mapped = commonMappings[normalized];

    if (mapped) {
      return { csvColumn: header, suggestedField: mapped, confidence: 0.9 };
    }

    return {
      csvColumn: header,
      suggestedField: "skip",
      confidence: 0.5
    };
  });
}
