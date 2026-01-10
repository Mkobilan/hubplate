"use client";

import { useState } from "react";
import Papa from "papaparse";
import { toast } from "react-hot-toast";
import {
    X,
    Upload,
    ArrowRight,
    Loader2,
    Check,
    AlertCircle,
    Info,
    Truck,
    Sparkles,
    ChevronLeft
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import {
    STANDARD_VENDOR_FIELDS,
    type FieldMapping,
    type AIFieldMappingSuggestion,
    type VendorFieldKey
} from "@/lib/csv/csvUtils";

interface VendorImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    onComplete: () => void;
}

const VENDOR_COLUMNS = [
    { key: "name", label: "Vendor Name", required: false },
    { key: "email", label: "Email", required: false },
    { key: "phone", label: "Phone", required: false },
    { key: "address", label: "Address", required: false },
    { key: "account_number", label: "Account #", required: false },
    { key: "payment_terms", label: "Terms", required: false },
];

export function VendorImportModal({ isOpen, onClose, locationId, onComplete }: VendorImportModalProps) {
    const [step, setStep] = useState<"upload" | "mapping" | "importing">("upload");
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [mappings, setMappings] = useState<FieldMapping[]>([]);
    const [aiSuggestions, setAiSuggestions] = useState<AIFieldMappingSuggestion[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [loading, setLoading] = useState(false);

    const resetState = () => {
        setStep("upload");
        setCsvHeaders([]);
        setCsvData([]);
        setMappings([]);
        setAiSuggestions([]);
        setIsLoadingAI(false);
        setLoading(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    if (results.meta.fields && results.meta.fields.length > 0) {
                        const headers = results.meta.fields;
                        setCsvHeaders(headers);
                        setCsvData(results.data);
                        setStep("mapping");

                        // Initialize mappings with skip first so UI shows immediately
                        const initialMappings: FieldMapping[] = headers.map(h => ({
                            csvColumn: h,
                            targetField: "skip"
                        }));
                        setMappings(initialMappings);

                        // Get AI suggestions
                        setIsLoadingAI(true);
                        try {
                            const response = await fetch("/api/ai/csv-mapping", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    headers: headers,
                                    sampleData: results.data.slice(0, 5),
                                    type: "vendor"
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
                        } catch (err) {
                            console.error("AI mapping error:", err);
                        } finally {
                            setIsLoadingAI(false);
                        }
                    } else {
                        toast.error("Could not find headers in CSV. Please ensure your file has a header row.");
                    }
                }
            });
        }
    };

    const updateMapping = (csvColumn: string, updates: Partial<FieldMapping>) => {
        setMappings(prev => prev.map(m =>
            m.csvColumn === csvColumn ? { ...m, ...updates } : m
        ));
    };

    const handleImport = async () => {
        setStep("importing");
        setLoading(true);
        const supabase = createClient();

        try {
            const vendorsToInsert = csvData.map(row => {
                const vendor: any = { location_id: locationId, is_active: true, metadata: {} };

                mappings.forEach(m => {
                    if (m.targetField === "skip") return;
                    if (m.targetField === "custom" && m.customFieldName) {
                        vendor.metadata[m.customFieldName] = row[m.csvColumn];
                    } else {
                        vendor[m.targetField] = row[m.csvColumn];
                    }
                });

                // Placeholder for missing name to avoid DB constraint violation
                if (!vendor.name || vendor.name.trim() === "") {
                    vendor.name = `Unnamed Vendor ${new Date().toLocaleDateString()}_${Math.floor(Math.random() * 1000)}`;
                }

                return vendor;
            });

            const { error } = await (supabase.from("vendors") as any).upsert(vendorsToInsert, { onConflict: 'location_id, name' });
            if (error) throw error;

            toast.success(`Successfully imported ${vendorsToInsert.length} vendors`);
            onComplete();
            handleClose();
        } catch (err: any) {
            toast.error(err.message);
            setStep("mapping");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Import Vendors"
            className="max-w-4xl"
        >
            <div className="space-y-6 pt-4">
                {step === "upload" && (
                    <div className="border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center hover:border-orange-500/50 transition-colors cursor-pointer relative group">
                        <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect} />
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <Truck className="h-8 w-8 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold">Upload Vendor CSV</h3>
                        <p className="text-sm text-slate-500">Upload your vendor list from Sysco, US Foods, or QuickBooks</p>
                    </div>
                )}

                {step === "mapping" && (
                    <div className="space-y-4">
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {mappings.map((mapping) => {
                                const suggestion = aiSuggestions.find(s => s.csvColumn === mapping.csvColumn);
                                const sampleValue = csvData[0]?.[mapping.csvColumn] || "";

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
                                                        const value = e.target.value as VendorFieldKey | "custom" | "skip";
                                                        updateMapping(mapping.csvColumn, {
                                                            targetField: value,
                                                            customFieldName: value === "custom" ? mapping.csvColumn.toLowerCase().replace(/\s+/g, "_") : undefined,
                                                            customFieldLabel: value === "custom" ? mapping.csvColumn : undefined
                                                        });
                                                    }}
                                                >
                                                    <option value="skip">-- Skip Column --</option>
                                                    <optgroup label="Standard Fields">
                                                        {Object.entries(STANDARD_VENDOR_FIELDS).map(([key, field]) => (
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
                                                        placeholder="e.g., website"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500">Display Label</label>
                                                    <input
                                                        type="text"
                                                        className="input py-1.5 text-sm"
                                                        value={mapping.customFieldLabel || ""}
                                                        onChange={(e) => updateMapping(mapping.csvColumn, { customFieldLabel: e.target.value })}
                                                        placeholder="e.g., Website"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-between gap-3 pt-4 border-t border-slate-800">
                            <button onClick={() => setStep("upload")} className="btn btn-secondary flex-1">Back</button>
                            <button onClick={handleImport} className="btn btn-primary flex-1">
                                Import {csvData.length} Vendors
                            </button>
                        </div>
                    </div>
                )}

                {step === "importing" && (
                    <div className="py-20 text-center space-y-6">
                        <Loader2 className="h-16 w-16 text-orange-500 animate-spin mx-auto" />
                        <div>
                            <h2 className="text-2xl font-bold">Importing Vendors...</h2>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
