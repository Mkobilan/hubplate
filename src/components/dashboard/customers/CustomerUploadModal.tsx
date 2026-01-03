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
    Users,
    CheckCircle,
    XCircle,
    ArrowRight
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
    parseCSV,
    transformCSVToCustomers,
    STANDARD_CUSTOMER_FIELDS,
    type CustomerFieldKey,
    type FieldMapping,
    type AIFieldMappingSuggestion,
    type ParsedCustomer,
    type CSVParseResult
} from "@/lib/csv/csvUtils";
import { toast } from "react-hot-toast";

interface CustomerUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    onImportComplete: () => void;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "result";

interface ImportResult {
    success: boolean;
    total_processed: number;
    successful_imports: number;
    failed_imports: number;
    errors: { row: number; name: string; error: string }[];
}

export function CustomerUploadModal({
    isOpen,
    onClose,
    locationId,
    onImportComplete
}: CustomerUploadModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [csvData, setCsvData] = useState<CSVParseResult | null>(null);
    const [mappings, setMappings] = useState<FieldMapping[]>([]);
    const [aiSuggestions, setAiSuggestions] = useState<AIFieldMappingSuggestion[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [parsedCustomers, setParsedCustomers] = useState<ParsedCustomer[]>([]);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const resetState = () => {
        setStep("upload");
        setCsvData(null);
        setMappings([]);
        setAiSuggestions([]);
        setParsedCustomers([]);
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

            // Initialize mappings with skip first
            const initialMappings: FieldMapping[] = parsed.headers.map(h => ({
                csvColumn: h,
                targetField: "skip"
            }));
            setMappings(initialMappings);

            setIsLoadingAI(true);
            try {
                const response = await fetch("/api/ai/csv-mapping", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        headers: parsed.headers,
                        sampleData: parsed.rows.slice(0, 5),
                        type: "customer"
                    })
                });

                const data = await response.json();
                const suggestions: AIFieldMappingSuggestion[] = data.suggestions || [];
                setAiSuggestions(suggestions);

                // Update mappings with suggestions
                setMappings(prev => prev.map(m => {
                    const s = suggestions.find(suggest => suggest.csvColumn === m.csvColumn);
                    if (s) {
                        return {
                            ...m,
                            targetField: s.suggestedField as any,
                            customFieldName: s.customFieldName,
                            customFieldLabel: s.customFieldLabel
                        };
                    }
                    return m;
                }));
            } catch (aiError) {
                console.error("AI mapping error:", aiError);
            } finally {
                setIsLoadingAI(false);
                setStep("mapping");
            }
        } catch (err: any) {
            setError(err.message || "Failed to parse CSV file");
        }
    };

    const updateMapping = (csvColumn: string, updates: Partial<FieldMapping>) => {
        setMappings(prev => prev.map(m =>
            m.csvColumn === csvColumn ? { ...m, ...updates } : m
        ));
    };

    const handlePreview = () => {
        if (!csvData) return;
        const customers = transformCSVToCustomers(csvData.rows, mappings);
        setParsedCustomers(customers);
        setStep("preview");
    };

    const handleImport = async () => {
        if (parsedCustomers.length === 0) return;

        setStep("importing");
        setError(null);

        try {
            const response = await fetch("/api/customers/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customers: parsedCustomers,
                    location_id: locationId,
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
            setError(err.message || "Failed to import customers");
            setStep("preview");
        }
    };

    const validCustomersCount = useMemo(() => {
        return parsedCustomers.length;
    }, [parsedCustomers]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                step === "upload" ? "Import Customers from CSV" :
                    step === "mapping" ? "Map CSV Columns" :
                        step === "preview" ? "Preview Import" :
                            step === "importing" ? "Importing..." :
                                "Import Results"
            }
        >
            <div className="min-h-[400px]">
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

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-400 font-medium">Error</p>
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {step === "upload" && (
                    <div className="space-y-4">
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer",
                                isDragging ? "border-orange-500 bg-orange-500/10" : "border-slate-700 hover:border-slate-600"
                            )}
                            onClick={() => document.getElementById("customer-csv-input")?.click()}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const file = e.dataTransfer.files[0];
                                if (file) handleFileSelect(file);
                            }}
                        >
                            <input
                                id="customer-csv-input"
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
                            <p className="text-lg font-medium mb-2">Drag & drop your Customer CSV</p>
                            <p className="text-sm text-slate-500 mb-4">Support for Toast, Aloha, and custom exports</p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-400">
                                <Upload className="w-4 h-4" />
                                Select CSV File
                            </div>
                        </div>
                    </div>
                )}

                {step === "mapping" && csvData && (
                    <div className="space-y-4">
                        {isLoadingAI && (
                            <div className="flex items-center gap-2 text-orange-400 bg-orange-500/10 px-4 py-2 rounded-lg">
                                <Sparkles className="w-4 h-4 animate-pulse" />
                                <span className="text-sm">Analyzing columns for customer data...</span>
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
                                                        const value = e.target.value as CustomerFieldKey | "custom" | "skip";
                                                        updateMapping(mapping.csvColumn, {
                                                            targetField: value,
                                                            customFieldName: value === "custom" ? mapping.csvColumn.toLowerCase().replace(/\s+/g, "_") : undefined,
                                                            customFieldLabel: value === "custom" ? mapping.csvColumn : undefined
                                                        });
                                                    }}
                                                >
                                                    <option value="skip">-- Skip Column --</option>
                                                    <optgroup label="Customer Fields">
                                                        {Object.entries(STANDARD_CUSTOMER_FIELDS).map(([key, field]) => (
                                                            <option key={key} value={key}>{field.label}</option>
                                                        ))}
                                                    </optgroup>
                                                    <option value="custom">→ Create Custom Field</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setStep("upload")} className="btn btn-secondary flex-1">Back</button>
                            <button onClick={handlePreview} className="btn btn-primary flex-1">Preview Import</button>
                        </div>
                    </div>
                )}

                {step === "preview" && (
                    <div className="space-y-4">
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                            <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-green-400">{validCustomersCount}</p>
                            <p className="text-sm text-green-300">Customers ready to import</p>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="max-h-[250px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-800/50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold">Name</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold">Email/Phone</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold">Loyalty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {parsedCustomers.slice(0, 50).map((cust, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2">{cust.first_name} {cust.last_name}</td>
                                                <td className="px-3 py-2 text-slate-400 text-xs">
                                                    {cust.email || cust.phone || "-"}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {cust.is_loyalty_member ? (
                                                        <span className="text-orange-400 font-bold">{cust.loyalty_points} pts</span>
                                                    ) : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setStep("mapping")} className="btn btn-secondary flex-1">Back</button>
                            <button onClick={handleImport} className="btn btn-primary flex-1">Import Customers</button>
                        </div>
                    </div>
                )}

                {step === "importing" && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-16 h-16 text-orange-500 animate-spin mb-6" />
                        <p className="text-lg font-medium">Importing {validCustomersCount} customers...</p>
                    </div>
                )}

                {step === "result" && importResult && (
                    <div className="space-y-4 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold">Import Complete!</h3>
                        <p className="text-slate-400">
                            Successfully imported {importResult.successful_imports} customers.
                        </p>
                        <button onClick={handleClose} className="btn btn-primary w-full mt-4">Done</button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
