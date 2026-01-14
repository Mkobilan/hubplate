"use client";

import { useState } from "react";
import {
    X,
    Download,
    Loader2,
    Calendar,
    FileSpreadsheet,
    Activity,
    ClipboardList
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ExportLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    currentLogs: any[];
}

type ExportRange = 'current' | 'range';

export default function ExportLogsModal({ isOpen, onClose, locationId, currentLogs }: ExportLogsModalProps) {
    const [exportRange, setExportRange] = useState<ExportRange>('current');
    const [startDate, setStartDate] = useState<string>(format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [loading, setLoading] = useState(false);

    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            let csvContent = "";
            let filename = `inventory_logs_export_${format(new Date(), 'yyyyMMdd')}.csv`;

            let logsToExport = [];

            if (exportRange === 'current') {
                logsToExport = currentLogs;
                filename = `inventory_logs_current_view_${format(new Date(), 'yyyyMMdd')}.csv`;
            } else {
                const { data, error } = await (supabase.from("pours") as any)
                    .select(`
                        id,
                        created_at,
                        quantity,
                        unit,
                        usage_type,
                        order_id,
                        inventory_items (name),
                        recipes (name),
                        employees (first_name, last_name)
                    `)
                    .eq("location_id", locationId)
                    .gte("created_at", `${startDate}T00:00:00`)
                    .lte("created_at", `${endDate}T23:59:59`)
                    .order("created_at", { ascending: false });

                if (error) throw error;
                logsToExport = data || [];
                filename = `inventory_logs_${startDate}_to_${endDate}.csv`;
            }

            const headers = ["Date", "Item Name", "Recipe/Context", "Quantity", "Unit", "Type", "Employee", "Order #"];
            const rows = logsToExport.map((l: any) => [
                format(new Date(l.created_at), 'yyyy-MM-dd HH:mm'),
                `"${l.inventory_items?.name || 'Unknown'}"`,
                `"${l.recipes?.name || 'Direct Link'}"`,
                l.quantity,
                `"${l.unit || ''}"`,
                `"${l.usage_type || ''}"`,
                `"${l.employees ? `${l.employees.first_name} ${l.employees.last_name}` : '-'}"`,
                `"${l.order_id || ''}"`
            ]);

            csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

            downloadCSV(csvContent, filename);
            toast.success("Export completed!");
            onClose();
        } catch (err: any) {
            console.error("Export error:", err);
            toast.error("Export failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/10 rounded-xl">
                            <Activity className="h-5 w-5 text-pink-500" />
                        </div>
                        <h2 className="text-xl font-bold">Export Inventory Logs</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Range Selection */}
                    <div className="grid grid-cols-1 gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Export Range</label>
                        <button
                            onClick={() => setExportRange('current')}
                            className={cn(
                                "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                                exportRange === 'current'
                                    ? "bg-pink-500/10 border-pink-500 text-pink-500"
                                    : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800"
                            )}
                        >
                            <ClipboardList size={18} />
                            <div>
                                <p className="font-bold text-sm">Current View</p>
                                <p className="text-[10px] opacity-70">Export only the items currently visible in the table ({currentLogs.length} items)</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setExportRange('range')}
                            className={cn(
                                "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                                exportRange === 'range'
                                    ? "bg-pink-500/10 border-pink-500 text-pink-500"
                                    : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800"
                            )}
                        >
                            <Calendar size={18} />
                            <div>
                                <p className="font-bold text-sm">Custom Date Range</p>
                                <p className="text-[10px] opacity-70">Fetch and export ALL logs for a specific time period</p>
                            </div>
                        </button>
                    </div>

                    {/* Date Filters */}
                    {exportRange === 'range' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        type="date"
                                        className="input !pl-10 !bg-slate-800/50 box-border w-full text-xs"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">End Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        type="date"
                                        className="input !pl-10 !bg-slate-800/50 box-border w-full text-xs"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-3">
                    <button
                        onClick={handleExport}
                        disabled={loading}
                        className="btn btn-primary bg-pink-600 hover:bg-pink-700 w-full py-4 text-sm font-bold shadow-lg shadow-pink-500/20"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing Export...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                Generate CSV Export
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-center text-slate-500">
                        CSV files can be opened in Excel, Google Sheets, or other spreadsheet software.
                    </p>
                </div>
            </div>
        </div>
    );
}
