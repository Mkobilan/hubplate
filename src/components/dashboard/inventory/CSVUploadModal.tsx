"use client";

import { useState, useRef } from "react";

import {
    X,
    Upload,
    FileText,
    ArrowRight,
    Check,
    AlertCircle,
    Loader2,
    Sparkles,
    ChevronRight,
    Search,
    ChevronLeft
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import {
    STANDARD_INVENTORY_FIELDS,
    type FieldMapping,
    type AIFieldMappingSuggestion,
    type InventoryFieldKey
} from "@/lib/csv/csvUtils";

interface CSVUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    onComplete: () => void;
}

type Step = "upload" | "mapping" | "preview" | "importing";

export default function CSVUploadModal({ isOpen, onClose, locationId, onComplete }: CSVUploadModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [mappings, setMappings] = useState<FieldMapping[]>([]);
    const [aiSuggestions, setAiSuggestions] = useState<AIFieldMappingSuggestion[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setStep("upload");
        setFile(null);
        setCsvHeaders([]);
        setCsvData([]);
        setMappings([]);
        setAiSuggestions([]);
        setIsLoadingAI(false);
        setLoading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    const processFile = (selectedFile: File) => {
        setLoading(true);
        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                if (results.meta.fields && results.meta.fields.length > 0) {
                    const headers = results.meta.fields;
                    setCsvHeaders(headers);
                    setCsvData(results.data);
                    setFile(selectedFile);
                    setStep("mapping");

                    // Initialize with skip/basic auto-map
                    const initialMappings: FieldMapping[] = headers.map(header => {
                        const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
                        let target: any = "skip";

                        if (h === 'name' || h === 'item' || h === 'product' || h === 'description') target = 'name';
                        else if ((h.includes('qty') || h.includes('stock') || h.includes('quantity') || h === 'onhand') &&
                            !h.includes('id') && !h.includes('sku') && !h.includes('no') && !h.includes('code')) target = 'stock_quantity';
                        else if (h.includes('unit') || h === 'uom') target = 'unit';
                        else if (h.includes('par') || h.includes('min')) target = 'par_level';
                        else if (h.includes('cost') || h.includes('price')) target = 'cost_per_unit';
                        else if (h.includes('supplier') || h.includes('vendor')) target = 'supplier';
                        else if (h.includes('category') || h.includes('dept')) target = 'category';

                        return {
                            csvColumn: header,
                            targetField: target
                        };
                    });
                    setMappings(initialMappings);

                    // Then try AI mapping
                    setIsLoadingAI(true);
                    try {
                        const response = await fetch("/api/ai/csv-mapping", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                headers,
                                sampleData: results.data.slice(0, 5),
                                type: "inventory"
                            })
                        });

                        if (response.ok) {
                            const { suggestions } = await response.json();
                            setAiSuggestions(suggestions);

                            setMappings(prev => prev.map(m => {
                                const s = suggestions.find((suggest: any) => suggest.csvColumn === m.csvColumn);
                                if (s && s.confidence > 0.7 && s.suggestedField !== "skip") {
                                    return {
                                        ...m,
                                        targetField: s.suggestedField as any,
                                        customFieldName: s.customFieldName,
                                        customFieldLabel: s.customFieldLabel
                                    };
                                }
                                return m;
                            }));
                        }
                    } catch (err) {
                        console.error("AI Mapping failed", err);
                    } finally {
                        setIsLoadingAI(false);
                    }
                } else {
                    toast.error("Could not find headers in CSV");
                }
                setLoading(false);
            },
            error: (err) => {
                toast.error("Error parsing CSV: " + err.message);
                setLoading(false);
            }
        });
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
            const itemsToUpsert = csvData.map(row => {
                const item: any = { location_id: locationId };
                const metadata: Record<string, any> = {};

                mappings.forEach(m => {
                    const csvValue = row[m.csvColumn];
                    if (m.targetField === 'skip') return;

                    if (m.targetField === 'custom') {
                        const customName = m.customFieldName || m.csvColumn.toLowerCase().replace(/\s+/g, '_');
                        metadata[customName] = csvValue;
                    } else {
                        let value = csvValue;
                        // Robust number parsing: Take the last numeric group if multiple exist (e.g. "12/27/2025 20" -> 20)
                        if (m.targetField === 'stock_quantity' || m.targetField === 'par_level' || m.targetField === 'cost_per_unit') {
                            if (value && typeof value === 'string') {
                                // Find all groups of numbers (including decimals)
                                const matches = value.match(/[\d.]+/g);
                                if (matches && matches.length > 0) {
                                    // Take the last match as the actual value (often the quantity)
                                    value = parseFloat(matches[matches.length - 1]) || 0;
                                } else {
                                    value = 0;
                                }
                            } else {
                                value = parseFloat(value?.toString() || '0') || 0;
                            }
                        }
                        item[m.targetField] = value;
                    }
                });

                // Placeholder for missing name to avoid DB constraint violation
                if (!item.name || item.name.trim() === "") {
                    item.name = `Unnamed Item ${new Date().toLocaleDateString()}_${Math.floor(Math.random() * 1000)}`;
                }

                // Default unit to 'unit' if not provided to satisfy DB NOT NULL constraint
                if (!item.unit || item.unit.trim() === "") {
                    item.unit = "unit";
                }

                item.metadata = metadata;
                return item;
            });

            const validItems = itemsToUpsert; // All items are now considered "valid" with placeholders
            if (validItems.length === 0) {
                throw new Error("No valid items found to import (Missing names)");
            }

            // De-duplicate items by name to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time"
            // If duplicates exist, we take the one with the highest stock (or could sum them)
            const uniqueItemsMap = new Map<string, any>();
            validItems.forEach(item => {
                const key = `${item.location_id}-${item.name.toLowerCase().trim()}`;
                if (uniqueItemsMap.has(key)) {
                    const existing = uniqueItemsMap.get(key);
                    // Merge: sum stock, but keep other fields from latest
                    item.stock_quantity = (item.stock_quantity || 0) + (existing.stock_quantity || 0);
                }
                uniqueItemsMap.set(key, item);
            });

            const finalItems = Array.from(uniqueItemsMap.values());

            const { error } = await (supabase
                .from('inventory_items' as any) as any)
                .upsert(finalItems, { onConflict: 'location_id, name' });

            if (error) throw error;

            toast.success(`Successfully imported ${validItems.length} items`);
            onComplete();
            handleClose();
        } catch (err: any) {
            console.error("Import error:", err);
            toast.error("Failed to import: " + err.message);
            setStep("mapping");
        } finally {
            setLoading(false);
        }
    };

    const isMappingComplete = true; // All mapping is now optional

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="card w-full max-w-3xl bg-slate-900 border-slate-800 shadow-2xl relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {step === 'upload' && <Upload className="h-5 w-5 text-orange-500" />}
                            {step === 'mapping' && <FileText className="h-5 w-5 text-blue-500" />}
                            {step === 'importing' && <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />}
                            {step === 'upload' ? "Upload Inventory CSV" : "Map Columns"}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {step === 'upload' ? "Select a CSV file from your supplier" : "Match your CSV headers to our database fields"}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-700 hover:border-orange-500/50 hover:bg-orange-500/5 rounded-2xl p-12 text-center transition-all cursor-pointer group"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".csv"
                                className="hidden"
                            />
                            <div className="mx-auto w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Upload className="h-8 w-8 text-slate-500 group-hover:text-orange-500" />
                            </div>
                            <h3 className="text-lg font-bold mb-1">Click to browse</h3>
                            <p className="text-sm text-slate-500">Support .csv files only</p>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-6">
                            {(isLoadingAI) && (
                                <div className="flex items-center gap-2 text-orange-400 bg-orange-500/10 px-4 py-2 rounded-lg">
                                    <Sparkles className="w-4 h-4 animate-pulse" />
                                    <span className="text-sm">AI is analyzing your columns...</span>
                                </div>
                            )}

                            <div className="space-y-3">
                                {mappings.map((mapping: FieldMapping) => {
                                    const suggestion = aiSuggestions.find((s: AIFieldMappingSuggestion) => s.csvColumn === mapping.csvColumn);
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
                                                        className="input py-1.5 text-sm w-full bg-slate-900 border-slate-700"
                                                        value={mapping.targetField}
                                                        onChange={(e) => {
                                                            const value = e.target.value as InventoryFieldKey | "custom" | "skip";
                                                            updateMapping(mapping.csvColumn, {
                                                                targetField: value,
                                                                customFieldName: value === "custom" ? mapping.csvColumn.toLowerCase().replace(/\s+/g, "_") : undefined,
                                                                customFieldLabel: value === "custom" ? mapping.csvColumn : undefined
                                                            });
                                                        }}
                                                    >
                                                        <option value="skip">-- Skip Column --</option>
                                                        <optgroup label="Standard Fields">
                                                            {Object.entries(STANDARD_INVENTORY_FIELDS).map(([key, field]) => (
                                                                <option key={key} value={key}>{field.label} {field.required ? "*" : ""}</option>
                                                            ))}
                                                        </optgroup>
                                                        <option value="custom">→ Create Custom Field</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {mapping.targetField === 'custom' && (
                                                <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs text-slate-500">Field Name (internal)</label>
                                                        <input
                                                            type="text"
                                                            className="input py-1.5 text-sm"
                                                            value={mapping.customFieldName || ""}
                                                            onChange={(e) => updateMapping(mapping.csvColumn, { customFieldName: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                                                            placeholder="e.g., bin_location"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-500">Display Label</label>
                                                        <input
                                                            type="text"
                                                            className="input py-1.5 text-sm"
                                                            value={mapping.customFieldLabel || ""}
                                                            onChange={(e) => updateMapping(mapping.csvColumn, { customFieldLabel: e.target.value })}
                                                            placeholder="e.g., Bin Location"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {!isMappingComplete && (
                                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                                    <div className="text-sm text-orange-200/80">
                                        <p className="font-bold">Required Fields Missing:</p>
                                        <ul className="list-disc list-inside">
                                            {Object.entries(STANDARD_INVENTORY_FIELDS)
                                                .filter(([_, f]) => f.required)
                                                .filter(([key]) => !mappings.some((m: FieldMapping) => m.targetField === key))
                                                .map(([_, f]) => <li key={f.label}>{f.label}</li>)
                                            }
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="py-20 text-center space-y-4">
                            <div className="relative inline-block">
                                <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
                                <Check className="h-6 w-6 text-green-500 absolute -right-2 -bottom-2 bg-slate-900 rounded-full p-1 border border-slate-800" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Importing Data...</h3>
                                <p className="text-slate-500">Processing {csvData.length} items from your file.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'mapping' && (
                    <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
                        <button
                            onClick={() => setStep('upload')}
                            className="btn btn-secondary"
                            disabled={loading}
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back
                        </button>
                        <button
                            onClick={handleImport}
                            className="btn btn-primary bg-orange-500 hover:bg-orange-600 border-none shadow-lg shadow-orange-500/20"
                            disabled={loading || !isMappingComplete}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    Import {csvData.length} Items
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
