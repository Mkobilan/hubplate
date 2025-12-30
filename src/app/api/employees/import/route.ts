import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ParsedEmployee, VALID_ROLES } from "@/lib/csv/csvUtils";

interface ImportRequest {
    employees: ParsedEmployee[];
    location_id: string;
    organization_id?: string;
    custom_field_definitions: {
        field_name: string;
        field_label: string;
        field_type: string;
    }[];
}

interface ImportResult {
    success: boolean;
    total_processed: number;
    successful_imports: number;
    failed_imports: number;
    created_employees: {
        id: string;
        name: string;
    }[];
    errors: {
        row: number;
        name: string;
        error: string;
    }[];
    created_custom_fields: string[];
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
        const { employees, location_id, organization_id, custom_field_definitions } = body;

        if (!employees || !Array.isArray(employees) || employees.length === 0) {
            return NextResponse.json({ error: "No employees to import" }, { status: 400 });
        }

        if (!location_id) {
            return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
        }

        // Verify user has access to this location (is owner or manager)
        const { data: locationData, error: locationError } = await supabase
            .from("locations")
            .select("id, owner_id, organization_id")
            .eq("id", location_id)
            .single();

        if (locationError || !locationData) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }

        // Check if user is owner or a manager at this location
        const isOwner = (locationData as any).owner_id === user.id;

        if (!isOwner) {
            const { data: employeeData } = await (supabase as any)
                .from("employees")
                .select("role")
                .eq("location_id", location_id)
                .eq("user_id", user.id)
                .single();

            const isManagerOrAgm = (employeeData as any)?.role === "manager" || (employeeData as any)?.role === "gm" || (employeeData as any)?.role === "agm" || (employeeData as any)?.role === "owner";

            if (!isManagerOrAgm) {
                return NextResponse.json({ error: "Only GMs, AGMs, and Owners can import employees" }, { status: 403 });
            }
        }

        const result: ImportResult = {
            success: true,
            total_processed: employees.length,
            successful_imports: 0,
            failed_imports: 0,
            created_employees: [],
            errors: [],
            created_custom_fields: []
        };

        // Step 1: Create custom field definitions if they don't exist
        const customFieldMap: Record<string, string> = {}; // field_name -> field_id

        for (const fieldDef of custom_field_definitions) {
            // Check if field already exists - use type assertion for new table
            const { data: existingField } = await (supabase as any)
                .from("employee_custom_fields")
                .select("id")
                .eq("location_id", location_id)
                .eq("field_name", fieldDef.field_name)
                .single();

            if (existingField) {
                customFieldMap[fieldDef.field_name] = existingField.id;
            } else {
                // Create new field - use type assertion for new table
                const { data: newField, error: fieldError } = await (supabase as any)
                    .from("employee_custom_fields")
                    .insert({
                        location_id,
                        field_name: fieldDef.field_name,
                        field_label: fieldDef.field_label,
                        field_type: fieldDef.field_type || "text",
                        is_required: false,
                        display_order: Object.keys(customFieldMap).length
                    })
                    .select("id")
                    .single();

                if (newField && !fieldError) {
                    customFieldMap[fieldDef.field_name] = newField.id;
                    result.created_custom_fields.push(fieldDef.field_label);
                }
            }
        }

        // Step 2: Import employees
        for (const emp of employees) {
            // Skip employees with critical validation errors (missing required fields)
            const criticalErrors = emp.validation_errors.filter(e =>
                e.column === "first_name" || e.column === "last_name"
            );

            if (criticalErrors.length > 0 || !emp.first_name || !emp.last_name) {
                result.failed_imports++;
                result.errors.push({
                    row: emp.row_index,
                    name: `${emp.first_name || "?"} ${emp.last_name || "?"}`,
                    error: criticalErrors.map(e => e.message).join("; ") || "Missing required fields"
                });
                continue;
            }

            try {
                // Check if employee with same email already exists at this location
                if (emp.email) {
                    const { data: existingEmployee } = await supabase
                        .from("employees")
                        .select("id")
                        .eq("location_id", location_id)
                        .eq("email", emp.email)
                        .single();

                    if (existingEmployee) {
                        result.failed_imports++;
                        result.errors.push({
                            row: emp.row_index,
                            name: `${emp.first_name} ${emp.last_name}`,
                            error: `Employee with email ${emp.email} already exists`
                        });
                        continue;
                    }
                }

                // Insert employee - use type assertion for role compatibility
                const employeeData = {
                    location_id,
                    organization_id: organization_id || (locationData as any).organization_id,
                    first_name: emp.first_name,
                    last_name: emp.last_name,
                    email: emp.email || null,
                    phone: emp.phone || null,
                    role: emp.role as any,
                    hourly_rate: emp.hourly_rate || null,
                    hire_date: emp.hire_date || null,
                    pin_code: emp.pin_code || null,
                    is_active: true
                };

                const { data: newEmployee, error: empError } = await (supabase as any)
                    .from("employees")
                    .insert(employeeData)
                    .select("id")
                    .single();

                if (empError || !newEmployee) {
                    result.failed_imports++;
                    result.errors.push({
                        row: emp.row_index,
                        name: `${emp.first_name} ${emp.last_name}`,
                        error: empError?.message || "Failed to create employee"
                    });
                    continue;
                }

                // Insert custom field values - use type assertion for new table
                const customValueInserts = Object.entries(emp.custom_fields)
                    .filter(([fieldName, value]) => value && customFieldMap[fieldName])
                    .map(([fieldName, value]) => ({
                        employee_id: newEmployee.id,
                        field_id: customFieldMap[fieldName],
                        value
                    }));

                if (customValueInserts.length > 0) {
                    await (supabase as any)
                        .from("employee_custom_values")
                        .insert(customValueInserts);
                }

                result.successful_imports++;
                result.created_employees.push({
                    id: newEmployee.id,
                    name: `${emp.first_name} ${emp.last_name}`
                });

            } catch (error: any) {
                result.failed_imports++;
                result.errors.push({
                    row: emp.row_index,
                    name: `${emp.first_name} ${emp.last_name}`,
                    error: error?.message || "Unknown error"
                });
            }
        }

        result.success = result.failed_imports === 0;

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Employee import error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to import employees" },
            { status: 500 }
        );
    }
}
