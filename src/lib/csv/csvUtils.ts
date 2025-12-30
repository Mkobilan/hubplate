// CSV parsing utilities with Gemini AI integration for smart field mapping
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// Standard employee fields that can be mapped
export const STANDARD_EMPLOYEE_FIELDS = {
    first_name: { label: "First Name", required: true, type: "text" },
    last_name: { label: "Last Name", required: true, type: "text" },
    email: { label: "Email", required: false, type: "email" },
    phone: { label: "Phone", required: false, type: "phone" },
    role: { label: "Role", required: true, type: "role" },
    hourly_rate: { label: "Hourly Rate", required: false, type: "number" },
    hire_date: { label: "Hire Date", required: false, type: "date" },
    pin_code: { label: "PIN Code", required: false, type: "text" },
} as const;

export type StandardFieldKey = keyof typeof STANDARD_EMPLOYEE_FIELDS;

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

export interface FieldMapping {
    csvColumn: string;
    targetField: StandardFieldKey | "custom" | "skip";
    customFieldName?: string;
    customFieldLabel?: string;
    customFieldType?: "text" | "number" | "date" | "boolean" | "phone" | "email";
}

export interface AIFieldMappingSuggestion {
    csvColumn: string;
    suggestedField: StandardFieldKey | "custom" | "skip";
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
                }
            }
        });

        // Validate required fields
        if (!employee.first_name) {
            employee.validation_errors.push({
                row: employee.row_index,
                column: "first_name",
                message: "First name is required"
            });
        }
        if (!employee.last_name) {
            employee.validation_errors.push({
                row: employee.row_index,
                column: "last_name",
                message: "Last name is required"
            });
        }

        return employee;
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
