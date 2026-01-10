// CSV parsing utilities with Gemini AI integration for smart field mapping
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// Standard employee fields that can be mapped
export const STANDARD_EMPLOYEE_FIELDS = {
    first_name: { label: "First Name", required: false, type: "text" },
    last_name: { label: "Last Name", required: false, type: "text" },
    email: { label: "Email", required: false, type: "email" },
    phone: { label: "Phone", required: false, type: "phone" },
    role: { label: "Role", required: false, type: "role" },
    hourly_rate: { label: "Hourly Rate", required: false, type: "number" },
    hire_date: { label: "Hire Date", required: false, type: "date" },
    pin_code: { label: "PIN Code", required: false, type: "text" },
    external_id: { label: "External/Payroll ID", required: false, type: "text" },
    ytd_gross: { label: "YTD Gross Pay", required: false, type: "number" },
    ytd_net: { label: "YTD Net Pay", required: false, type: "number" },
    ytd_tax: { label: "YTD Taxes", required: false, type: "number" },
} as const;

// Standard customer fields that can be mapped
export const STANDARD_CUSTOMER_FIELDS = {
    first_name: { label: "First Name", required: false, type: "text" },
    last_name: { label: "Last Name", required: false, type: "text" },
    email: { label: "Email", required: false, type: "email" },
    phone: { label: "Phone", required: false, type: "phone" },
    birthday: { label: "Birthday", required: false, type: "date" },
    is_loyalty_member: { label: "Loyalty Member", required: false, type: "boolean" },
    loyalty_points: { label: "Loyalty Points", required: false, type: "number" },
    loyalty_tier: { label: "Loyalty Tier", required: false, type: "text" },
    total_spent: { label: "Total Spent", required: false, type: "number" },
    total_visits: { label: "Total Visits", required: false, type: "number" },
    notes: { label: "Notes", required: false, type: "text" },
} as const;

// Standard menu fields that can be mapped
export const STANDARD_MENU_FIELDS = {
    name: { label: "Item Name", required: false, type: "text" },
    description: { label: "Description", required: false, type: "text" },
    category: { label: "Category", required: false, type: "text" },
    price: { label: "Price", required: false, type: "number" },
    cost: { label: "Cost", required: false, type: "number" },
    kds_station: { label: "KDS Station", required: false, type: "text" },
} as const;

// Standard vendor fields that can be mapped
export const STANDARD_VENDOR_FIELDS = {
    name: { label: "Vendor Name", required: false, type: "text" },
    email: { label: "Email", required: false, type: "email" },
    phone: { label: "Phone", required: false, type: "phone" },
    address: { label: "Address", required: false, type: "text" },
    account_number: { label: "Account #", required: false, type: "text" },
    payment_terms: { label: "Terms", required: false, type: "text" },
} as const;

// Standard gift card fields that can be mapped
export const STANDARD_GIFT_CARD_FIELDS = {
    card_number: { label: "Card Number", required: false, type: "text" },
    current_balance: { label: "Current Balance", required: false, type: "number" },
    original_balance: { label: "Original Balance", required: false, type: "number" },
    is_active: { label: "Is Active?", required: false, type: "boolean" },
} as const;

// Standard inventory fields that can be mapped
export const STANDARD_INVENTORY_FIELDS = {
    name: { label: "Item Name", required: false, type: "text" },
    stock_quantity: { label: "Current Stock", required: false, type: "number" },
    unit: { label: "Unit", required: false, type: "text" },
    par_level: { label: "Par Level", required: false, type: "number" },
    cost_per_unit: { label: "Unit Cost", required: false, type: "number" },
    supplier: { label: "Supplier", required: false, type: "text" },
    category: { label: "Category", required: false, type: "text" },
} as const;

// Standard recipe fields that can be mapped
export const STANDARD_RECIPE_FIELDS = {
    name: { label: "Recipe Name", required: false, type: "text" },
    description: { label: "Description", required: false, type: "text" },
    instructions: { label: "Instructions", required: false, type: "text" },
    ingredients: { label: "Ingredients", required: false, type: "text" },
} as const;

export type StandardFieldKey = keyof typeof STANDARD_EMPLOYEE_FIELDS;
export type CustomerFieldKey = keyof typeof STANDARD_CUSTOMER_FIELDS;
export type MenuFieldKey = keyof typeof STANDARD_MENU_FIELDS;
export type VendorFieldKey = keyof typeof STANDARD_VENDOR_FIELDS;
export type GiftCardFieldKey = keyof typeof STANDARD_GIFT_CARD_FIELDS;
export type InventoryFieldKey = keyof typeof STANDARD_INVENTORY_FIELDS;
export type RecipeFieldKey = keyof typeof STANDARD_RECIPE_FIELDS;

// Valid roles in the system (including new AGM/GM roles)
export const VALID_ROLES = [
    "owner", "manager", "gm", "agm", "server", "bartender",
    "cook", "host", "busser", "dishwasher", "driver", "expo"
] as const;

export type ValidRole = typeof VALID_ROLES[number];

// Role aliases that AI can map to valid roles
export const ROLE_ALIASES: Record<string, ValidRole> = {
    // Owner variations
    "owner": "owner",
    "proprietor": "owner",
    "restaurant owner": "owner",

    // Manager variations
    "manager": "manager",
    "shift manager": "manager",
    "floor manager": "manager",
    "foh manager": "manager",
    "boh manager": "manager",

    // GM variations
    "gm": "gm",
    "general manager": "gm",

    // AGM variations
    "agm": "agm",
    "assistant manager": "agm",
    "assistant general manager": "agm",
    "asst manager": "agm",
    "asst. manager": "agm",
    "asst gm": "agm",
    "asst general manager": "agm",

    // Server variations
    "server": "server",
    "waiter": "server",
    "waitress": "server",
    "wait staff": "server",
    "waitstaff": "server",
    "food server": "server",

    // Bartender variations
    "bartender": "bartender",
    "bar tender": "bartender",
    "barback": "bartender",
    "barista": "bartender",
    "mixologist": "bartender",

    // Cook variations
    "cook": "cook",
    "line cook": "cook",
    "prep cook": "cook",
    "chef": "cook",
    "sous chef": "cook",
    "kitchen staff": "cook",
    "fry cook": "cook",
    "grill cook": "cook",

    // Host variations
    "host": "host",
    "hostess": "host",
    "greeter": "host",
    "seater": "host",
    "front desk": "host",

    // Busser variations
    "busser": "busser",
    "busboy": "busser",
    "bus boy": "busser",
    "food runner": "busser",
    "runner": "busser",

    // Dishwasher variations
    "dishwasher": "dishwasher",
    "dish washer": "dishwasher",
    "dish": "dishwasher",
    "steward": "dishwasher",
    "kitchen steward": "dishwasher",

    // Driver variations
    "driver": "driver",
    "delivery driver": "driver",
    "delivery": "driver",
    "courier": "driver",

    // Expo variations
    "expo": "expo",
    "expeditor": "expo",
    "expediter": "expo",
    "window": "expo",
};

export interface CSVParseResult {
    headers: string[];
    rows: Record<string, string>[];
    rawData: string[][];
}

export type AllFieldKey = StandardFieldKey | CustomerFieldKey | MenuFieldKey | VendorFieldKey | GiftCardFieldKey | InventoryFieldKey | RecipeFieldKey;

export interface FieldMapping {
    csvColumn: string;
    targetField: AllFieldKey | "custom" | "skip";
    customFieldName?: string;
    customFieldLabel?: string;
    customFieldType?: "text" | "number" | "date" | "boolean" | "phone" | "email";
}

export interface AIFieldMappingSuggestion {
    csvColumn: string;
    suggestedField: AllFieldKey | "custom" | "skip";
    confidence: number; // 0-1
    customFieldName?: string;
    customFieldLabel?: string;
}

export interface ValidationError {
    row: number;
    column: string;
    message: string;
}

export interface ParsedEmployee {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    role: ValidRole;
    hourly_rate?: number;
    hire_date?: string;
    pin_code?: string;
    external_id?: string;
    ytd_gross?: number;
    ytd_net?: number;
    ytd_tax?: number;
    custom_fields: Record<string, string>;
    validation_errors: ValidationError[];
    row_index: number;
}

export interface ParsedCustomer {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    birthday?: string;
    is_loyalty_member: boolean;
    loyalty_points: number;
    loyalty_tier?: string;
    total_spent: number;
    total_visits: number;
    notes?: string;
    custom_fields: Record<string, string>;
    validation_errors: ValidationError[];
    row_index: number;
}

export interface ParsedIngredient {
    name: string;
    quantity: number;
    unit: string;
}

export interface ParsedRecipe {
    name: string;
    description?: string;
    instructions?: string;
    ingredients_raw: string;
    parsed_ingredients: ParsedIngredient[];
    custom_fields: Record<string, string>;
    validation_errors: ValidationError[];
    row_index: number;
}

/**
 * Parse CSV string into structured data
 */
export function parseCSV(csvContent: string): CSVParseResult {
    const lines = csvContent.trim().split(/\r?\n/);
    if (lines.length < 2) {
        throw new Error("CSV must contain at least a header row and one data row");
    }

    // Parse header row
    const headers = parseCSVLine(lines[0]);

    // Parse data rows
    const rawData: string[][] = [];
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = parseCSVLine(line);
        rawData.push(values);

        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
            row[header] = values[idx] || "";
        });
        rows.push(row);
    }

    return { headers, rows, rawData };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

/**
 * Use Gemini AI to suggest field mappings based on CSV headers
 */
export async function suggestFieldMappingsWithAI(
    csvHeaders: string[],
    sampleData: Record<string, string>[]
): Promise<AIFieldMappingSuggestion[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Get sample values for context
    const sampleValues: Record<string, string[]> = {};
    csvHeaders.forEach(header => {
        sampleValues[header] = sampleData.slice(0, 3).map(row => row[header]).filter(Boolean);
    });

    const prompt = `You are an expert at mapping CSV columns to database fields for a restaurant employee management system.

CSV Headers and Sample Values:
${csvHeaders.map(h => `- "${h}": [${sampleValues[h].map(v => `"${v}"`).join(", ")}]`).join("\n")}

Available standard fields to map to:
- first_name: Employee's first name
- last_name: Employee's last name  
- email: Email address
- phone: Phone number
- role: Job role (server, cook, host, etc.)
- hourly_rate: Pay rate per hour
- hire_date: Date of hire
- pin_code: Clock-in PIN code

For each CSV column, suggest:
1. Which standard field it maps to (or "custom" for extra fields like address, emergency_contact, etc., or "skip" for irrelevant columns)
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

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("AI mapping failed, using fallback");
            return fallbackFieldMapping(csvHeaders);
        }

        return JSON.parse(jsonMatch[0]) as AIFieldMappingSuggestion[];
    } catch (error) {
        console.error("AI field mapping error:", error);
        return fallbackFieldMapping(csvHeaders);
    }
}

/**
 * Fallback field mapping without AI
 */
function fallbackFieldMapping(headers: string[]): AIFieldMappingSuggestion[] {
    const commonMappings: Record<string, StandardFieldKey> = {
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
        "external_id": "external_id",
        "external id": "external_id",
        "payroll_id": "external_id",
        "payroll id": "external_id",
        "employee_id": "external_id",
        "employee id": "external_id",
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
                suggestedField: "custom" as const,
                confidence: 0.7,
                customFieldName: normalized.replace(/\s+/g, "_"),
                customFieldLabel: header
            };
        }

        return {
            csvColumn: header,
            suggestedField: "skip" as const,
            confidence: 0.5
        };
    });
}

/**
 * Normalize role value to valid system role
 */
export function normalizeRole(roleValue: string): ValidRole | null {
    if (!roleValue) return null;

    const normalized = roleValue.toLowerCase().trim();

    // Direct match
    if (VALID_ROLES.includes(normalized as ValidRole)) {
        return normalized as ValidRole;
    }

    // Alias match
    if (ROLE_ALIASES[normalized]) {
        return ROLE_ALIASES[normalized];
    }

    return null;
}

/**
 * Validate and transform employees from CSV data
 */
export function transformCSVToEmployees(
    csvRows: Record<string, string>[],
    mappings: FieldMapping[],
    defaultRole: ValidRole = "server"
): ParsedEmployee[] {
    return csvRows.map((row, index) => {
        const employee: ParsedEmployee = {
            first_name: "",
            last_name: "",
            role: defaultRole,
            custom_fields: {},
            validation_errors: [],
            row_index: index + 2 // +2 for 1-indexing and header row
        };

        mappings.forEach(mapping => {
            if (mapping.targetField === "skip") return;

            const value = row[mapping.csvColumn]?.trim() || "";

            if (mapping.targetField === "custom") {
                if (value && mapping.customFieldName) {
                    employee.custom_fields[mapping.customFieldName] = value;
                }
            } else {
                // Standard field
                switch (mapping.targetField) {
                    case "first_name":
                        employee.first_name = value;
                        break;
                    case "last_name":
                        employee.last_name = value;
                        break;
                    case "email":
                        if (value && !isValidEmail(value)) {
                            employee.validation_errors.push({
                                row: employee.row_index,
                                column: mapping.csvColumn,
                                message: `Invalid email format: ${value}`
                            });
                        } else {
                            employee.email = value || undefined;
                        }
                        break;
                    case "phone":
                        employee.phone = value || undefined;
                        break;
                    case "role":
                        const normalizedRole = normalizeRole(value);
                        if (normalizedRole) {
                            employee.role = normalizedRole;
                        } else if (value) {
                            employee.validation_errors.push({
                                row: employee.row_index,
                                column: mapping.csvColumn,
                                message: `Unknown role: ${value}. Using default: ${defaultRole}`
                            });
                        }
                        break;
                    case "hourly_rate":
                        if (value) {
                            const rate = parseFloat(value.replace(/[^0-9.]/g, ""));
                            if (!isNaN(rate) && rate >= 0) {
                                employee.hourly_rate = rate;
                            } else {
                                employee.validation_errors.push({
                                    row: employee.row_index,
                                    column: mapping.csvColumn,
                                    message: `Invalid hourly rate: ${value}`
                                });
                            }
                        }
                        break;
                    case "hire_date":
                        if (value) {
                            const date = parseDate(value);
                            if (date) {
                                employee.hire_date = date;
                            } else {
                                employee.validation_errors.push({
                                    row: employee.row_index,
                                    column: mapping.csvColumn,
                                    message: `Invalid date format: ${value}`
                                });
                            }
                        }
                        break;
                    case "pin_code":
                        if (value) {
                            const pin = value.replace(/\D/g, "");
                            if (pin.length === 4 || pin.length === 6) {
                                employee.pin_code = pin;
                            } else {
                                employee.validation_errors.push({
                                    row: employee.row_index,
                                    column: mapping.csvColumn,
                                    message: `PIN must be 4 or 6 digits: ${value}`
                                });
                            }
                        }
                        break;
                    case "external_id":
                        employee.external_id = value || undefined;
                        break;
                    case "ytd_gross":
                        if (value) {
                            const val = parseFloat(value.replace(/[^0-9.]/g, ""));
                            if (!isNaN(val)) employee.ytd_gross = val;
                        }
                        break;
                    case "ytd_net":
                        if (value) {
                            const val = parseFloat(value.replace(/[^0-9.]/g, ""));
                            if (!isNaN(val)) employee.ytd_net = val;
                        }
                        break;
                    case "ytd_tax":
                        if (value) {
                            const val = parseFloat(value.replace(/[^0-9.]/g, ""));
                            if (!isNaN(val)) employee.ytd_tax = val;
                        }
                        break;
                }
            }
        });

        // No longer enforcing required fields for employees in CSV upload
        // Users can map whatever they want. Default values handle the rest.

        return employee;
    });
}

/**
 * Validate and transform customers from CSV data
 */
export function transformCSVToCustomers(
    csvRows: Record<string, string>[],
    mappings: FieldMapping[],
): ParsedCustomer[] {
    return csvRows.map((row, index) => {
        const customer: ParsedCustomer = {
            is_loyalty_member: false,
            loyalty_points: 0,
            total_spent: 0,
            total_visits: 0,
            custom_fields: {},
            validation_errors: [],
            row_index: index + 2
        };

        mappings.forEach(mapping => {
            if (mapping.targetField === "skip") return;

            const value = row[mapping.csvColumn]?.trim() || "";

            if (mapping.targetField === "custom") {
                if (value && mapping.customFieldName) {
                    customer.custom_fields[mapping.customFieldName] = value;
                }
            } else {
                const target = mapping.targetField as CustomerFieldKey;
                switch (target) {
                    case "first_name":
                        customer.first_name = value;
                        break;
                    case "last_name":
                        customer.last_name = value;
                        break;
                    case "email":
                        if (value && !isValidEmail(value)) {
                            customer.validation_errors.push({
                                row: customer.row_index,
                                column: mapping.csvColumn,
                                message: `Invalid email format: ${value}`
                            });
                        } else {
                            customer.email = value || undefined;
                        }
                        break;
                    case "phone":
                        customer.phone = value || undefined;
                        break;
                    case "birthday":
                        if (value) {
                            const date = parseDate(value);
                            if (date) customer.birthday = date;
                        }
                        break;
                    case "is_loyalty_member":
                        customer.is_loyalty_member = value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "yes";
                        break;
                    case "loyalty_points":
                        customer.loyalty_points = parseInt(value) || 0;
                        break;
                    case "loyalty_tier":
                        customer.loyalty_tier = value;
                        break;
                    case "total_spent":
                        customer.total_spent = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
                        break;
                    case "total_visits":
                        customer.total_visits = parseInt(value) || 0;
                        break;
                    case "notes":
                        customer.notes = value;
                        break;
                }
            }
        });

        return customer;
    });
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseDate(dateStr: string): string | null {
    // Try various date formats
    const formats = [
        /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
        /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
        /^(\d{2})-(\d{2})-(\d{4})$/, // MM-DD-YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, // M/D/YY or MM/DD/YY
    ];

    for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
            let year: number, month: number, day: number;

            if (format === formats[0]) {
                // YYYY-MM-DD
                [, year, month, day] = match.map(Number) as [string, number, number, number];
            } else {
                // MM/DD/YYYY or similar
                [, month, day, year] = match.map(Number) as [string, number, number, number];
                if (year < 100) {
                    year = year > 50 ? 1900 + year : 2000 + year;
                }
            }

            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split("T")[0];
            }
        }
    }

    // Try native parsing as fallback
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
    }

    return null;
}

/**
 * Force-cleans an ingredient name for matching purposes.
 * Strips quantities, units, fractions, and parenthetical notes.
 * Handles both prefix (1 oz Vodka) and suffix (Vodka 1oz) formats.
 */
export function cleanIngredientName(name: string): string {
    if (!name) return "";

    return name.toLowerCase()
        // 1. Remove parenthetical notes: "Vodka (Premium)" -> "Vodka"
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        // 2. Remove common qty+unit from START: "1.5 oz Tequila" -> "Tequila"
        // Handles fractions like "1/2" or "1 1/2"
        .replace(/^[\d\s./-]+\s*(oz|ml|cl|tsp|tbsp|dash|dashes|drop|drops|splash|barspoon|part|parts|cup|g|kg|lb)?\s+/i, ' ')
        // 3. Remove common qty+unit from END: "Tequila 1.5oz" -> "Tequila"
        .replace(/\s+[\d\s./-]+\s*(ml|l|oz|cl|g|kg|lb|units|unit|pk|pack|btl|bottle|btls)?$/i, ' ')
        // 4. Remove standalone units at the end if they survived: "Tequila oz" -> "Tequila"
        .replace(/\s+(oz|ml|cl|tsp|tbsp|dash|dashes|drop|drops|splash|barspoon|part|parts|cup|g|kg|lb)$/i, '')
        // 5. Clean up any leftover symbols or multiple spaces
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        // 6. Final safety: remove stray trailing punctuation that might have survived
        .replace(/[):,.-]+$/g, '')
        .trim();
}

/**
 * Checks if a string is likely instructional noise rather than an actual ingredient.
 */
export function isInstructionalNoise(name: string): boolean {
    if (!name) return false;
    const lower = name.toLowerCase().trim();
    const blacklist = [
        "top up",
        "muddle",
        "optional",
        "express oils",
        "combine",
        "shake",
        "stir",
        "strain",
        "garnish",
        "pour",
        "express",
        "variation"
    ];

    // Check if the string perfectly matches or heavily features these words with little else
    return blacklist.some(word => {
        if (lower === word) return true;
        if (lower === word + ")") return true;
        if (lower.length < word.length + 5 && lower.includes(word)) return true;
        return false;
    });
}

/**
 * Parse ingredients string into structured data
 * Supports multiple formats:
 * - Pipe-separated: "Tequila|2|oz;Lime Juice|1|oz"
 * - Colon-separated: "Grenadine Syrup: 0.33 oz, Angostura Bitters: 1 dash"
 * - Natural language: "2oz Tequila, 1oz Lime Juice, Vodka 1.5oz"
 * - Simple list: "Tequila, Lime Juice, Agave"
 */
export function parseIngredients(ingredientsStr: string): ParsedIngredient[] {
    if (!ingredientsStr || !ingredientsStr.trim()) return [];

    const ingredients: ParsedIngredient[] = [];

    // Try pipe-separated list of items: "Item:Qty|Item:Qty" (User's format)
    // Example: "Ground Beef:0.5 lb|Hamburger Buns:1|Cheddar Cheese:2 oz"
    if (ingredientsStr.includes("|")) {
        // Check if it's the specific format "Name:Qty|Name:Qty"
        // If splitting by | gives us parts that look like "Name:Value", treat | as proper separator
        const pipeParts = ingredientsStr.split("|").map(s => s.trim()).filter(Boolean);
        const hasColons = pipeParts.every(p => p.includes(":") || /^\d/.test(p) === false); // Heuristic: mostly strings with colons

        if (hasColons && pipeParts.length > 1) {
            const ingredients: ParsedIngredient[] = [];
            for (const part of pipeParts) {
                // Parse "Name:Qty Unit" or "Name:Qty"
                const colonMatch = part.match(/^([^:]+):\s*(.+)$/);
                if (colonMatch) {
                    const [, name, qtyPart] = colonMatch;
                    // qtyPart might be "0.5 lb" or "1"
                    const qtyMatch = qtyPart.trim().match(/^([\d./]+)\s*(.*)$/);
                    if (qtyMatch) {
                        const [, qtyStr, unit] = qtyMatch;
                        ingredients.push({
                            name: name.trim(),
                            quantity: evalFraction(qtyStr),
                            unit: unit?.trim() || "unit"
                        });
                    } else {
                        // Just name and maybe funky matching
                        ingredients.push({
                            name: name.trim(),
                            quantity: 1,
                            unit: "unit"
                        });
                    }
                } else {
                    // Fallback for "Item Name" without colon in a pipe list
                    ingredients.push({
                        name: part.trim(),
                        quantity: 1,
                        unit: "unit"
                    });
                }
            }
            if (ingredients.length > 0) return ingredients;
        }

        // Fallback to original logic: "Item|Qty|Unit;Item|Qty|Unit"
        // Only if we see semicolons, OR if the split parts look like fields
        if (ingredientsStr.includes(";")) {
            const parts = ingredientsStr.split(";").map(s => s.trim()).filter(Boolean);
            const ingredients: ParsedIngredient[] = [];
            for (const part of parts) {
                const [name, qtyStr, unit] = part.split("|").map(s => s.trim());
                if (name) {
                    const qty = parseFloat(qtyStr) || 1;
                    ingredients.push({
                        name,
                        quantity: qty,
                        unit: unit || "unit"
                    });
                }
            }
            return ingredients;
        }
    }

    // Try colon-separated format: "Grenadine Syrup: 0.33 oz" or "Item: qty unit"
    const colonPattern = /^([^:]+):\s*([\d./]+)\s*(.*)$/;
    const parts = ingredientsStr.split(/[,;]/).map(s => s.trim()).filter(Boolean);

    const colonCount = parts.filter(p => colonPattern.test(p)).length;
    if (colonCount > 0 && colonCount >= parts.length / 2) {
        for (const part of parts) {
            const match = part.match(colonPattern);
            if (match) {
                const [, name, qtyStr, unitRest] = match;
                // Handle fractions in quantity
                let qty = 1;
                if (qtyStr.includes("/")) {
                    const [num, den] = qtyStr.split("/").map(Number);
                    qty = num / den;
                } else {
                    qty = parseFloat(qtyStr) || 1;
                }

                const unit = unitRest.replace(/\s*\([^)]*\)\s*/g, '').trim() || "unit";
                ingredients.push({
                    name: name.trim(),
                    quantity: qty,
                    unit
                });
            } else {
                ingredients.push({
                    name: part.replace(/:\s*$/, '').trim(),
                    quantity: 1,
                    unit: "unit"
                });
            }
        }
        return ingredients;
    }

    // Natural language format: "2oz Tequila", "Vodka 1.5oz", etc.
    // Try both directions
    const prefixPattern = /^([\d.\s/]+)\s*([a-zA-Z]+)?\s+(.+)$/;
    const suffixPattern = /^(.+?)\s+([\d.\s/]+)\s*([a-zA-Z]+)?$/;

    for (const part of parts) {
        const prefixMatch = part.match(prefixPattern);
        const suffixMatch = part.match(suffixPattern);

        if (prefixMatch) {
            const [, qtyStr, unit, name] = prefixMatch;
            ingredients.push({
                name: name.trim(),
                quantity: evalFraction(qtyStr),
                unit: unit || "unit"
            });
        } else if (suffixMatch) {
            const [, name, qtyStr, unit] = suffixMatch;
            ingredients.push({
                name: name.trim(),
                quantity: evalFraction(qtyStr),
                unit: unit || "unit"
            });
        } else {
            ingredients.push({
                name: part.trim(),
                quantity: 1,
                unit: "unit"
            });
        }
    }

    return ingredients;
}

/**
 * Safely evaluates a fraction string (e.g. "1 1/2" or "0.5")
 */
function evalFraction(str: string): number {
    if (!str) return 1;
    const s = str.trim();
    if (s.includes("/")) {
        const parts = s.split(/\s+/);
        if (parts.length === 2) {
            // "1 1/2"
            const whole = parseFloat(parts[0]);
            const [num, den] = parts[1].split("/").map(Number);
            return whole + (num / den);
        } else {
            // "1/2"
            const [num, den] = s.split("/").map(Number);
            return num / den;
        }
    }
    return parseFloat(s) || 1;
}

/**
 * Validate and transform recipes from CSV data
 */
export function transformCSVToRecipes(
    csvRows: Record<string, string>[],
    mappings: FieldMapping[]
): ParsedRecipe[] {
    return csvRows.map((row, index) => {
        const recipe: ParsedRecipe = {
            name: "",
            ingredients_raw: "",
            parsed_ingredients: [],
            custom_fields: {},
            validation_errors: [],
            row_index: index + 2 // +2 for 1-indexing and header row
        };

        mappings.forEach(mapping => {
            if (mapping.targetField === "skip") return;

            const value = row[mapping.csvColumn]?.trim() || "";

            if (mapping.targetField === "custom") {
                if (value && mapping.customFieldName) {
                    recipe.custom_fields[mapping.customFieldName] = value;
                }
            } else {
                const target = mapping.targetField as RecipeFieldKey;
                switch (target) {
                    case "name":
                        recipe.name = value;
                        break;
                    case "description":
                        recipe.description = value || undefined;
                        break;
                    case "instructions":
                        recipe.instructions = value || undefined;
                        break;
                    case "ingredients":
                        recipe.ingredients_raw = value;
                        recipe.parsed_ingredients = parseIngredients(value);
                        break;
                }
            }
        });

        // Removing strict validation for recipes
        // Data handled gracefully in the Modal's handleImport

        return recipe;
    });
}

