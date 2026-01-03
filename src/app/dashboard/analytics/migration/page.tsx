"use client";

import { useState } from "react";
import { useAppStore } from "@/stores";
import {
    History,
    Upload,
    FileText,
    Check,
    AlertCircle,
    Loader2,
    TrendingUp,
    Calendar,
    ArrowRight
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Papa from "papaparse";
import { toast } from "react-hot-toast";

const SALES_COLUMNS = [
    { key: "sale_date", label: "Date", required: true },
    { key: "gross_sales", label: "Gross Sales", required: true },
    { key: "net_sales", label: "Net Sales", required: false },
    { key: "tax_collected", label: "Tax", required: false },
    { key: "tips_collected", label: "Tips", required: false },
    { key: "comp_amount", label: "Comps/Discounts", required: false },
    { key: "order_count", label: "Order Count", required: false },
];

export default function SalesMigrationPage() {
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [step, setStep] = useState<"upload" | "mapping" | "importing" | "result">("upload");
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.meta.fields) {
                        setCsvHeaders(results.meta.fields);
                        setCsvData(results.data);
                        autoMap(results.meta.fields);
                        setStep("mapping");
                    }
                }
            });
        }
    };

    const autoMap = (headers: string[]) => {
        const newMappings: Record<string, string> = {};
        headers.forEach(h => {
            const norm = h.toLowerCase().trim();
            if (norm.includes("date")) newMappings[h] = "sale_date";
            if (norm.includes("gross") || (norm.includes("sales") && !norm.includes("net"))) newMappings[h] = "gross_sales";
            if (norm.includes("net")) newMappings[h] = "net_sales";
            if (norm.includes("tax")) newMappings[h] = "tax_collected";
            if (norm.includes("tip") || norm.includes("gratuity")) newMappings[h] = "tips_collected";
            if (norm.includes("comp") || norm.includes("discount")) newMappings[h] = "comp_amount";
            if (norm.includes("count") || norm.includes("orders") || norm.includes("checks")) newMappings[h] = "order_count";
        });
        setMappings(newMappings);
    };

    const handleImport = async () => {
        if (!currentLocation) return;
        setStep("importing");
        setLoading(true);

        try {
            const response = await fetch("/api/analytics/import-historical", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    locationId: currentLocation.id,
                    data: csvData,
                    mappings
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setResult(data);
            setStep("result");
            toast.success("Sales history imported successfully");
        } catch (err: any) {
            toast.error(err.message);
            setStep("mapping");
        } finally {
            setLoading(false);
        }
    };

    if (!currentLocation) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500">
                    <History className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Historical Sales Migration</h1>
                    <p className="text-slate-400">Import historical sales data from Toast, Aloha, or Square</p>
                </div>
            </div>

            {step === "upload" && (
                <div className="card p-12 text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto">
                        <Upload className="h-10 w-10 text-slate-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Upload Sales CSV</h2>
                        <p className="text-slate-400 mt-2 max-w-md mx-auto">
                            Export a "Sales Summary" or "Daily Sales" report from your previous POS and upload it here.
                        </p>
                    </div>
                    <label className="btn btn-primary cursor-pointer inline-flex">
                        <span>Select CSV File</span>
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
                    </label>
                </div>
            )}

            {step === "mapping" && (
                <div className="space-y-6">
                    <div className="card">
                        <div className="grid grid-cols-2 gap-4 font-bold text-xs uppercase text-slate-500 px-4 mb-4">
                            <span>CSV Column</span>
                            <span>Hubplate Field</span>
                        </div>
                        <div className="space-y-2">
                            {csvHeaders.map(header => (
                                <div key={header} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                                    <span className="font-medium text-sm">{header}</span>
                                    <div className="flex items-center gap-3">
                                        <ArrowRight className="h-4 w-4 text-slate-600" />
                                        <select
                                            value={mappings[header] || ""}
                                            onChange={(e) => setMappings(prev => ({ ...prev, [header]: e.target.value }))}
                                            className="input !py-1 text-sm w-48"
                                        >
                                            <option value="">Skip</option>
                                            {SALES_COLUMNS.map(col => (
                                                <option key={col.key} value={col.key}>{col.label} {col.required ? "*" : ""}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button onClick={() => setStep("upload")} className="btn btn-secondary">Back</button>
                        <button
                            onClick={handleImport}
                            disabled={!mappings[Object.keys(mappings).find(k => mappings[k] === "sale_date") || ""] || !mappings[Object.keys(mappings).find(k => mappings[k] === "gross_sales") || ""]}
                            className="btn btn-primary"
                        >
                            Import {csvData.length} Days of History
                        </button>
                    </div>
                </div>
            )}

            {step === "importing" && (
                <div className="card p-20 text-center space-y-4">
                    <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto" />
                    <h2 className="text-xl font-bold">Processing History...</h2>
                    <p className="text-slate-500">Updating your analytics dashboards</p>
                </div>
            )}

            {step === "result" && result && (
                <div className="card p-12 text-center space-y-6">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                        <Check className="h-10 w-10 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold font-heading">Import Successful!</h2>
                        <p className="text-slate-400 mt-2">
                            Imported {result.successful} records. Your analytics will now reflect this historical data.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 py-6">
                        <div className="p-4 bg-slate-900 rounded-2xl">
                            <Calendar className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                            <p className="text-lg font-bold">{result.successful}</p>
                            <p className="text-xs text-slate-500">Days Processed</p>
                        </div>
                        <div className="p-4 bg-slate-900 rounded-2xl">
                            <TrendingUp className="h-5 w-5 text-green-400 mx-auto mb-2" />
                            <p className="text-lg font-bold">{formatCurrency(result.totalGross)}</p>
                            <p className="text-xs text-slate-500">Total Gross</p>
                        </div>
                        <div className="p-4 bg-slate-900 rounded-2xl">
                            <AlertCircle className="h-5 w-5 text-red-400 mx-auto mb-2" />
                            <p className="text-lg font-bold">{result.failed}</p>
                            <p className="text-xs text-slate-500">Errors</p>
                        </div>
                    </div>
                    <button onClick={() => window.location.href = "/dashboard/analytics"} className="btn btn-primary w-full">
                        View Analytics Dashboard
                    </button>
                </div>
            )}
        </div>
    );
}
