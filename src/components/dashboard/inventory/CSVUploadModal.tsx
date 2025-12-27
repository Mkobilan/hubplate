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
    Search
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

interface CSVUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    onComplete: () => void;
}

type Step = "upload" | "mapping" | "preview" | "importing";

const DB_COLUMNS = [
    { key: "name", label: "Item Name", required: true },
    { key: "stock_quantity", label: "Current Stock", required: true },
    { key: "unit", label: "Unit (lb, oz, each)", required: true },
    { key: "par_level", label: "Par Level", required: false },
    { key: "cost_per_unit", label: "Unit Cost", required: false },
    { key: "supplier", label: "Supplier", required: false },
    { key: "category", label: "Category", required: false },
];

export default function CSVUploadModal({ isOpen, onClose, locationId, onComplete }: CSVUploadModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [customFieldNames, setCustomFieldNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

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
            complete: (results) => {
                if (results.meta.fields) {
                    setCsvHeaders(results.meta.fields);
                    setCsvData(results.data);
                    setFile(selectedFile);
                    autoMap(results.meta.fields);
                    setStep("mapping");
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

    const autoMap = (headers: string[]) => {
        const newMappings: Record<string, string> = {};
        headers.forEach(header => {
            const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');

            // Item Name
            if (h === 'name' || h === 'item' || h === 'product' || h === 'description') {
                newMappings[header] = 'name';
            }
            // Quantity (be careful not to map IDs)
            else if ((h.includes('qty') || h.includes('stock') || h.includes('quantity') || h === 'onhand') &&
                !h.includes('id') && !h.includes('sku') && !h.includes('no') && !h.includes('code')) {
                newMappings[header] = 'stock_quantity';
            }
            else if (h.includes('unit') || h === 'uom') newMappings[header] = 'unit';
            else if (h.includes('par') || h.includes('min')) newMappings[header] = 'par_level';
            else if (h.includes('cost') || h.includes('price')) newMappings[header] = 'cost_per_unit';
            else if (h.includes('supplier') || h.includes('vendor')) newMappings[header] = 'supplier';
            else if (h.includes('category') || h.includes('dept')) newMappings[header] = 'category';
        });
        setMappings(newMappings);
    };


    const handleImport = async () => {
        setStep("importing");
        setLoading(true);
        const supabase = createClient();

        try {
            // Prepare data
            const itemsToUpsert = csvData.map(row => {
                const item: any = { location_id: locationId };
                const metadata: Record<string, any> = {};
                Object.entries(mappings).forEach(([csvHeader, dbKey]) => {
                    if (dbKey) {
                        let value = row[csvHeader];
                        if (dbKey === 'custom') {
                            const customName = customFieldNames[csvHeader] || csvHeader;
                            metadata[customName] = value;
                        } else {
                            // Basic sanitization
                            if (dbKey === 'stock_quantity' || dbKey === 'par_level' || dbKey === 'cost_per_unit') {
                                value = parseFloat(value?.toString().replace(/[^0-9.]/g, '')) || 0;
                            }
                            item[dbKey] = value;
                        }
                    }
                });
                item.metadata = metadata;
                return item;
            });


            // Filter out items without a name
            const validItems = itemsToUpsert.filter(i => i.name && i.name.trim() !== "");

            if (validItems.length === 0) {
                throw new Error("No valid items found to import (Missing names)");
            }

            // Perform upsert (match on location_id and name)
            // Note: In real life we'd want a unique constraint on (location_id, name)
            const { error } = await (supabase
                .from('inventory_items' as any) as any)
                .upsert(validItems, { onConflict: 'location_id, name' });




            if (error) throw error;

            toast.success(`Successfully imported ${validItems.length} items`);
            onComplete();
            onClose();
        } catch (err: any) {
            console.error("Import error:", err);
            toast.error("Failed to import: " + err.message);
            setStep("mapping");
        } finally {
            setLoading(false);
        }
    };

    const isMappingComplete = DB_COLUMNS.filter(c => c.required).every(c =>
        Object.values(mappings).includes(c.key)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="card w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl relative flex flex-col max-h-[90vh]">
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
                        onClick={onClose}
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
                            <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase tracking-wider text-slate-500 px-2">
                                <span>CSV Header</span>
                                <span>Maps To</span>
                            </div>
                            <div className="space-y-3">
                                {csvHeaders.map(header => (
                                    <div key={header} className="grid grid-cols-2 gap-4 items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-slate-700 rounded-lg">
                                                <FileText className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <span className="font-medium text-sm truncate">{header}</span>
                                        </div>
                                        <select
                                            value={mappings[header] || ""}
                                            onChange={(e) => setMappings(prev => ({ ...prev, [header]: e.target.value }))}
                                            className="input !py-1 text-sm bg-slate-900 border-slate-700"
                                        >
                                            <option value="">Skip this column</option>
                                            {DB_COLUMNS.map(col => (
                                                <option key={col.key} value={col.key}>
                                                    {col.label} {col.required ? "*" : ""}
                                                </option>
                                            ))}
                                            <option value="custom">+ Create Field...</option>
                                        </select>

                                        {mappings[header] === 'custom' && (
                                            <div className="col-span-2 mt-2 pl-12 flex gap-2 animate-in slide-in-from-top-1">
                                                <ArrowRight className="h-4 w-4 text-slate-500 self-center" />
                                                <input
                                                    type="text"
                                                    placeholder="Field Name (e.g. Storage Location)"
                                                    value={customFieldNames[header] || ""}
                                                    onChange={(e) => setCustomFieldNames(prev => ({ ...prev, [header]: e.target.value }))}
                                                    className="input !py-1 text-xs bg-slate-800 border-orange-500/30 focus:border-orange-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}

                            </div>

                            {!isMappingComplete && (
                                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                                    <p className="text-sm text-orange-200/80">
                                        Please map the required fields: {DB_COLUMNS.filter(c => c.required && !Object.values(mappings).includes(c.key)).map(c => c.label).join(", ")}.
                                    </p>
                                </div>
                            )}

                            <div className="card border-blue-500/30 bg-blue-500/5 p-4 flex items-center gap-3">
                                <Sparkles className="h-5 w-5 text-blue-400" />
                                <p className="text-xs text-blue-200/60">
                                    We've automatically suggested mappings based on your CSV headers. Please verify them before importing.
                                </p>
                            </div>
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
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
