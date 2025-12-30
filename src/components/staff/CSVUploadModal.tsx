"use client";

import { useState, useCallback, useMemo } from "react";
import {
    Upload,
    FileSpreadsheet,
    X,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Check,
    AlertCircle,
    Sparkles,
    MapPin,
    Eye,
    Download,
    Users,
    CheckCircle,
    XCircle,
    ArrowRight
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
    parseCSV,
    transformCSVToEmployees,
    STANDARD_EMPLOYEE_FIELDS,
    VALID_ROLES,
    type StandardFieldKey,
    type FieldMapping,
    type AIFieldMappingSuggestion,
    type ParsedEmployee,
    type CSVParseResult
} from "@/lib/csv/csvUtils";

interface CSVUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    organizationId?: string;
    onImportComplete: () => void;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "result";

interface ImportResult {
    success: boolean;
    total_processed: number;
    successful_imports: number;
    failed_imports: number;
    created_employees: { id: string; name: string }[];
    errors: { row: number; name: string; error: string }[];
    created_custom_fields: string[];
}

export function CSVUploadModal({
    isOpen,
    onClose,
    locationId,
    organizationId,
    onImportComplete
}: CSVUploadModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [csvData, setCsvData] = useState<CSVParseResult | null>(null);
    const [mappings, setMappings] = useState<FieldMapping[]>([]);
    const [aiSuggestions, setAiSuggestions] = useState<AIFieldMappingSuggestion[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [parsedEmployees, setParsedEmployees] = useState<ParsedEmployee[]>([]);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [defaultRole, setDefaultRole] = useState<typeof VALID_ROLES[number]>("server");

    const resetState = () => {
        setStep("upload");
        setCsvData(null);
        setMappings([]);
        setAiSuggestions([]);
        setParsedEmployees([]);
        setImportResult(null);
        setError(null);
        setIsLoadingAI(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileSelect = async (file: File) => {
        if (!file.name.endsWith(".csv")) {
            setError("Please upload a CSV file");
            return;
        }

        try {
            setError(null);
            const text = await file.text();
            const parsed = parseCSV(text);

            if (parsed.rows.length === 0) {
                setError("CSV file appears to be empty");
                return;
            }

            setCsvData(parsed);

            // Get AI suggestions for field mapping via API route
            setIsLoadingAI(true);
            try {
                const response = await fetch("/api/ai/csv-mapping", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        headers: parsed.headers,
                        sampleData: parsed.rows.slice(0, 5)
                    })
                });

                const data = await response.json();
                const suggestions: AIFieldMappingSuggestion[] = data.suggestions || [];
                setAiSuggestions(suggestions);

                // Initialize mappings from AI suggestions
                const initialMappings: FieldMapping[] = suggestions.map(s => ({
                    csvColumn: s.csvColumn,
                    targetField: s.suggestedField,
                    customFieldName: s.customFieldName,
                    customFieldLabel: s.customFieldLabel,
                    customFieldType: "text"
                }));
                setMappings(initialMappings);
            } catch (aiError) {
                console.error("AI mapping error:", aiError);
                // Use basic mappings as fallback
                const basicMappings: FieldMapping[] = parsed.headers.map(h => ({
                    csvColumn: h,
                    targetField: "skip"
                }));
                setMappings(basicMappings);
            }
            setIsLoadingAI(false);
            setStep("mapping");
        } catch (err: any) {
            setError(err.message || "Failed to parse CSV file");
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const updateMapping = (csvColumn: string, updates: Partial<FieldMapping>) => {
        setMappings(prev => prev.map(m =>
            m.csvColumn === csvColumn ? { ...m, ...updates } : m
        ));
    };

    const handlePreview = () => {
        if (!csvData) return;
        const employees = transformCSVToEmployees(csvData.rows, mappings, defaultRole);
        setParsedEmployees(employees);
        setStep("preview");
    };

    const handleImport = async () => {
        if (parsedEmployees.length === 0) return;

        setStep("importing");
        setError(null);

        try {
            // Collect custom field definitions
            const customFieldDefs = mappings
                .filter(m => m.targetField === "custom" && m.customFieldName)
                .map(m => ({
                    field_name: m.customFieldName!,
                    field_label: m.customFieldLabel || m.customFieldName!,
                    field_type: m.customFieldType || "text"
                }));

            const response = await fetch("/api/employees/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employees: parsedEmployees,
                    location_id: locationId,
                    organization_id: organizationId,
                    custom_field_definitions: customFieldDefs
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Import failed");
            }

            setImportResult(result);
            setStep("result");

            if (result.successful_imports > 0) {
                onImportComplete();
            }
        } catch (err: any) {
            setError(err.message || "Failed to import employees");
            setStep("preview");
        }
    };

    // Calculate valid employees count for preview
    const validEmployeesCount = useMemo(() => {
        return parsedEmployees.filter(e =>
            e.first_name && e.last_name &&
            !e.validation_errors.some(err => err.column === "first_name" || err.column === "last_name")
        ).length;
    }, [parsedEmployees]);

    const warningsCount = useMemo(() => {
        return parsedEmployees.reduce((sum, e) => sum + e.validation_errors.length, 0);
    }, [parsedEmployees]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                step === "upload" ? "Import Employees from CSV" :
                    step === "mapping" ? "Map CSV Columns" :
                        step === "preview" ? "Preview Import" :
                            step === "importing" ? "Importing..." :
                                "Import Results"
            }
        >
            <div className="min-h-[400px]">
                {/* Progress Steps */}
                {step !== "result" && step !== "importing" && (
                    <div className="flex items-center justify-center gap-2 mb-6">
                        {["upload", "mapping", "preview"].map((s, i) => (
                            <div key={s} className="flex items-center">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                                    step === s ? "bg-orange-500 text-white" :
                                        ["mapping", "preview"].indexOf(step) > i ? "bg-green-500 text-white" :
                                            "bg-slate-800 text-slate-500"
                                )}>
                                    {["mapping", "preview"].indexOf(step) > i ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        i + 1
                                    )}
                                </div>
                                {i < 2 && (
                                    <div className={cn(
                                        "w-12 h-0.5 mx-1",
                                        ["mapping", "preview"].indexOf(step) > i ? "bg-green-500" : "bg-slate-700"
                                    )} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-400 font-medium">Error</p>
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {/* Step: Upload */}
                {step === "upload" && (
                    <div className="space-y-4">
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={cn(
                                "border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer",
                                isDragging ? "border-orange-500 bg-orange-500/10" : "border-slate-700 hover:border-slate-600"
                            )}
                            onClick={() => document.getElementById("csv-file-input")?.click()}
                        >
                            <input
                                id="csv-file-input"
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileSelect(file);
                                }}
                            />
                            <FileSpreadsheet className={cn(
                                "w-16 h-16 mx-auto mb-4",
                                isDragging ? "text-orange-500" : "text-slate-500"
                            )} />
                            <p className="text-lg font-medium mb-2">
                                {isDragging ? "Drop your CSV file here" : "Drag & drop your CSV file"}
                            </p>
                            <p className="text-sm text-slate-500 mb-4">or click to browse</p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-400">
                                <Upload className="w-4 h-4" />
                                Select CSV File
                            </div>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Expected CSV Format</p>
                            <p className="text-sm text-slate-400 mb-3">
                                Your CSV should include columns for employee information. We'll use AI to automatically detect and map your columns.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(STANDARD_EMPLOYEE_FIELDS).map(([key, field]) => (
                                    <span key={key} className={cn(
                                        "px-2 py-1 rounded text-xs",
                                        field.required ? "bg-orange-500/20 text-orange-400" : "bg-slate-800 text-slate-400"
                                    )}>
                                        {field.label} {field.required && "*"}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step: Mapping */}
                {step === "mapping" && csvData && (
                    <div className="space-y-4">
                        {isLoadingAI && (
                            <div className="flex items-center gap-2 text-orange-400 bg-orange-500/10 px-4 py-2 rounded-lg">
                                <Sparkles className="w-4 h-4 animate-pulse" />
                                <span className="text-sm">AI is analyzing your columns...</span>
                            </div>
                        )}

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {mappings.map((mapping) => {
                                const suggestion = aiSuggestions.find(s => s.csvColumn === mapping.csvColumn);
                                const sampleValue = csvData.rows[0]?.[mapping.csvColumn] || "";

                                return (
                                    <div key={mapping.csvColumn} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium truncate">{mapping.csvColumn}</p>
                                                    {suggestion && suggestion.confidence > 0.8 && (
                                                        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded uppercase font-bold flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3" />
                                                            AI Match
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 truncate">e.g., "{sampleValue}"</p>
                                            </div>

                                            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                                            <div className="w-48">
                                                <select
                                                    className="input py-1.5 text-sm w-full"
                                                    value={mapping.targetField}
                                                    onChange={(e) => {
                                                        const value = e.target.value as StandardFieldKey | "custom" | "skip";
                                                        updateMapping(mapping.csvColumn, {
                                                            targetField: value,
                                                            customFieldName: value === "custom" ? mapping.csvColumn.toLowerCase().replace(/\s+/g, "_") : undefined,
                                                            customFieldLabel: value === "custom" ? mapping.csvColumn : undefined
                                                        });
                                                    }}
                                                >
                                                    <option value="skip">-- Skip Column --</option>
                                                    <optgroup label="Standard Fields">
                                                        {Object.entries(STANDARD_EMPLOYEE_FIELDS).map(([key, field]) => (
                                                            <option key={key} value={key}>{field.label}</option>
                                                        ))}
                                                    </optgroup>
                                                    <option value="custom">→ Create Custom Field</option>
                                                </select>
                                            </div>
                                        </div>

                                        {mapping.targetField === "custom" && (
                                            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs text-slate-500">Field Name (internal)</label>
                                                    <input
                                                        type="text"
                                                        className="input py-1.5 text-sm"
                                                        value={mapping.customFieldName || ""}
                                                        onChange={(e) => updateMapping(mapping.csvColumn, { customFieldName: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                                                        placeholder="e.g., address"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500">Display Label</label>
                                                    <input
                                                        type="text"
                                                        className="input py-1.5 text-sm"
                                                        value={mapping.customFieldLabel || ""}
                                                        onChange={(e) => updateMapping(mapping.csvColumn, { customFieldLabel: e.target.value })}
                                                        placeholder="e.g., Home Address"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                            <label className="text-xs text-slate-500 uppercase font-bold">Default Role (if not specified in CSV)</label>
                            <select
                                className="input py-1.5 text-sm mt-2"
                                value={defaultRole}
                                onChange={(e) => setDefaultRole(e.target.value as typeof VALID_ROLES[number])}
                            >
                                {VALID_ROLES.map(role => (
                                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep("upload")}
                                className="btn btn-secondary flex-1"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                            <button
                                onClick={handlePreview}
                                className="btn btn-primary flex-1"
                            >
                                Preview Import
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Preview */}
                {step === "preview" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                                <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-green-400">{validEmployeesCount}</p>
                                <p className="text-sm text-green-300">Ready to Import</p>
                            </div>
                            <div className={cn(
                                "border rounded-xl p-4 text-center",
                                warningsCount > 0 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-slate-900/50 border-slate-800"
                            )}>
                                <AlertCircle className={cn("w-8 h-8 mx-auto mb-2", warningsCount > 0 ? "text-yellow-400" : "text-slate-500")} />
                                <p className={cn("text-2xl font-bold", warningsCount > 0 ? "text-yellow-400" : "text-slate-500")}>{warningsCount}</p>
                                <p className={cn("text-sm", warningsCount > 0 ? "text-yellow-300" : "text-slate-500")}>Warnings</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="max-h-[200px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-800/50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold">Name</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold">Role</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold">Email</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {parsedEmployees.map((emp, i) => {
                                            const hasErrors = emp.validation_errors.length > 0;
                                            const isMissingRequired = !emp.first_name || !emp.last_name;

                                            return (
                                                <tr key={i} className={cn(
                                                    isMissingRequired ? "bg-red-500/5" : hasErrors ? "bg-yellow-500/5" : ""
                                                )}>
                                                    <td className="px-3 py-2">
                                                        {emp.first_name} {emp.last_name}
                                                        {isMissingRequired && <span className="text-red-400 text-xs ml-2">(incomplete)</span>}
                                                    </td>
                                                    <td className="px-3 py-2 capitalize">{emp.role}</td>
                                                    <td className="px-3 py-2 text-slate-400">{emp.email || "-"}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        {isMissingRequired ? (
                                                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                                                        ) : hasErrors ? (
                                                            <AlertCircle className="w-4 h-4 text-yellow-500 mx-auto" />
                                                        ) : (
                                                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {warningsCount > 0 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                                <p className="text-xs text-yellow-400 font-bold uppercase mb-2">Warnings</p>
                                <div className="max-h-[80px] overflow-y-auto space-y-1">
                                    {parsedEmployees.flatMap(emp =>
                                        emp.validation_errors.map((err, i) => (
                                            <p key={`${emp.row_index}-${i}`} className="text-xs text-yellow-300">
                                                Row {err.row}: {err.message}
                                            </p>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep("mapping")}
                                className="btn btn-secondary flex-1"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={validEmployeesCount === 0}
                                className="btn btn-primary flex-1"
                            >
                                Import {validEmployeesCount} Employees
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Importing */}
                {step === "importing" && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-16 h-16 text-orange-500 animate-spin mb-6" />
                        <p className="text-lg font-medium mb-2">Importing Employees...</p>
                        <p className="text-sm text-slate-500">This may take a moment</p>
                    </div>
                )}

                {/* Step: Result */}
                {step === "result" && importResult && (
                    <div className="space-y-4">
                        <div className={cn(
                            "rounded-2xl p-6 text-center",
                            importResult.success ? "bg-green-500/10 border border-green-500/30" : "bg-yellow-500/10 border border-yellow-500/30"
                        )}>
                            {importResult.success ? (
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            ) : (
                                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                            )}
                            <h3 className={cn("text-2xl font-bold mb-2", importResult.success ? "text-green-400" : "text-yellow-400")}>
                                {importResult.success ? "Import Complete!" : "Import Completed with Warnings"}
                            </h3>
                            <p className="text-slate-400">
                                Successfully imported {importResult.successful_imports} of {importResult.total_processed} employees
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                                <p className="text-2xl font-bold text-green-400">{importResult.successful_imports}</p>
                                <p className="text-xs text-slate-500">Imported</p>
                            </div>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                                <p className="text-2xl font-bold text-red-400">{importResult.failed_imports}</p>
                                <p className="text-xs text-slate-500">Failed</p>
                            </div>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                                <p className="text-2xl font-bold text-blue-400">{importResult.created_custom_fields.length}</p>
                                <p className="text-xs text-slate-500">New Fields</p>
                            </div>
                        </div>

                        {importResult.created_custom_fields.length > 0 && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                                <p className="text-xs text-blue-400 font-bold uppercase mb-2">New Custom Fields Created</p>
                                <div className="flex flex-wrap gap-2">
                                    {importResult.created_custom_fields.map(field => (
                                        <span key={field} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                                            {field}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {importResult.errors.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                                <p className="text-xs text-red-400 font-bold uppercase mb-2">Failed Imports</p>
                                <div className="max-h-[100px] overflow-y-auto space-y-1">
                                    {importResult.errors.map((err, i) => (
                                        <p key={i} className="text-xs text-red-300">
                                            Row {err.row} ({err.name}): {err.error}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleClose}
                            className="btn btn-primary w-full"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
