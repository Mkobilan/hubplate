"use client";

import { useState } from "react";
import {
    X,
    Download,
    Loader2,
    Calendar,
    Filter,
    FileSpreadsheet,
    Package,
    History,
    Trash2,
    Activity
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ExportInventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    storageAreas: any[];
}

type ExportType = 'current' | 'variance' | 'waste' | 'pours';

export default function ExportInventoryModal({ isOpen, onClose, locationId, storageAreas }: ExportInventoryModalProps) {
    const [exportType, setExportType] = useState<ExportType>('current');
    const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
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
            let filename = `inventory_export_${format(new Date(), 'yyyyMMdd')}.csv`;

            if (exportType === 'current') {
                let query = (supabase.from("inventory_items") as any)
                    .select("name, category, storage_area_name, unit, stock_quantity, units_per_stock, running_stock, par_level, cost_per_unit, supplier")
                    .eq("location_id", locationId);

                if (selectedAreaId !== 'all') {
                    if (selectedAreaId === 'none') query = query.is("storage_area_id", null);
                    else query = query.eq("storage_area_id", selectedAreaId);
                }

                const { data, error } = await query.order("name");
                if (error) throw error;

                const headers = ["Item Name", "Category", "Storage Area", "Unit", "Stock Qty", "Units/Stock", "Running Stock", "Par Level", "Unit Cost", "Supplier"];
                const rows = (data || []).map((i: any) => [
                    `"${i.name}"`,
                    `"${i.category || ''}"`,
                    `"${i.storage_area_name || ''}"`,
                    `"${i.unit || ''}"`,
                    i.stock_quantity,
                    i.units_per_stock,
                    i.running_stock,
                    i.par_level,
                    i.cost_per_unit,
                    `"${i.supplier || ''}"`
                ]);
                csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                filename = `current_inventory_${format(new Date(), 'yyyyMMdd')}.csv`;

            } else if (exportType === 'variance') {
                let query = (supabase.from("physical_inventory_counts") as any)
                    .select(`
                        created_at,
                        recorded_quantity,
                        theoretical_quantity,
                        variance_atomic,
                        conversion_at_recording,
                        session:physical_inventory_sessions!inner(storage_area:inventory_storage_areas(name)),
                        item:inventory_items!inner(name, unit, cost_per_unit, units_per_stock)
                    `)
                    .gte("created_at", `${startDate}T00:00:00`)
                    .lte("created_at", `${endDate}T23:59:59`)
                    .eq("session.location_id", locationId);

                if (selectedAreaId !== 'all') {
                    if (selectedAreaId === 'none') query = query.is("session.storage_area_id", null);
                    else query = query.eq("session.storage_area_id", selectedAreaId);
                }

                const { data, error } = await query.order("created_at", { ascending: false });
                if (error) throw error;

                const headers = ["Date", "Item Name", "Storage Area", "Recorded (Actual)", "Theoretical (System)", "Variance", "Unit", "Impact Value"];
                const rows = (data || []).map((d: any) => {
                    const conv = d.conversion_at_recording || 1;
                    const varDisplay = (d.variance_atomic || 0) / conv;
                    const impact = ((d.variance_atomic || 0) / ((d.item?.units_per_stock || 1) * conv)) * (d.item?.cost_per_unit || 0);

                    return [
                        format(new Date(d.created_at), 'yyyy-MM-dd HH:mm'),
                        `"${d.item?.name}"`,
                        `"${d.session?.storage_area?.name || 'Unassigned'}"`,
                        d.recorded_quantity,
                        (d.theoretical_quantity / conv).toFixed(2),
                        varDisplay.toFixed(2),
                        `"${d.item?.unit}"`,
                        impact.toFixed(2)
                    ];
                });
                csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                filename = `inventory_variance_${startDate}_to_${endDate}.csv`;

            } else if (exportType === 'waste') {
                const { data, error } = await (supabase.from("waste_logs") as any)
                    .select("*, item:inventory_items(name)")
                    .eq("location_id", locationId)
                    .gte("created_at", `${startDate}T00:00:00`)
                    .lte("created_at", `${endDate}T23:59:59`)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                const headers = ["Date", "Item Name", "Quantity", "Unit", "Reason", "Recorded By"];
                const rows = (data || []).map((d: any) => [
                    format(new Date(d.created_at), 'yyyy-MM-dd HH:mm'),
                    `"${d.item?.name || 'Unknown'}"`,
                    d.quantity,
                    `"${d.unit || ''}"`,
                    `"${d.reason || ''}"`,
                    `"${d.recorded_by || ''}"`
                ]);
                csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                filename = `waste_logs_${startDate}_to_${endDate}.csv`;

            } else if (exportType === 'pours') {
                const { data, error } = await (supabase.from("pours") as any)
                    .select("*, item:inventory_items(name)")
                    .eq("location_id", locationId)
                    .gte("created_at", `${startDate}T00:00:00`)
                    .lte("created_at", `${endDate}T23:59:59`)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                const headers = ["Date", "Item Name", "Quantity", "Unit", "Type", "Notes"];
                const rows = (data || []).map((d: any) => [
                    format(new Date(d.created_at), 'yyyy-MM-dd HH:mm'),
                    `"${d.item?.name || 'Unknown'}"`,
                    d.quantity,
                    `"${d.unit || ''}"`,
                    `"${d.pour_type || ''}"`,
                    `"${d.notes || ''}"`
                ]);
                csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                filename = `inventory_logs_${startDate}_to_${endDate}.csv`;
            }

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

    const types: { id: ExportType, label: string, icon: any }[] = [
        { id: 'current', label: 'Current Inventory', icon: Package },
        { id: 'variance', label: 'Physical Inventory (Variance)', icon: History },
        { id: 'waste', label: 'Waste Logs', icon: Trash2 },
        { id: 'pours', label: 'Inventory (Pour) Logs', icon: Activity },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-xl">
                            <FileSpreadsheet className="h-5 w-5 text-orange-500" />
                        </div>
                        <h2 className="text-xl font-bold">Export Inventory Data</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Export Type Selection */}
                    <div className="grid grid-cols-1 gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Data Source</label>
                        {types.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setExportType(type.id)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                                    exportType === type.id
                                        ? "bg-orange-500/10 border-orange-500 text-orange-500"
                                        : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800"
                                )}
                            >
                                <type.icon size={18} />
                                <span className="font-medium text-sm">{type.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="space-y-4 pt-2 border-t border-slate-800/50">
                        {/* Area Filter - only for inventory related */}
                        {(exportType === 'current' || exportType === 'variance') && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Filter by Storage Area</label>
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <select
                                        className="input !pl-10 !bg-slate-800/50 box-border w-full"
                                        value={selectedAreaId}
                                        onChange={(e) => setSelectedAreaId(e.target.value)}
                                    >
                                        <option value="all">All Storage Areas</option>
                                        <option value="none">No Area Assigned</option>
                                        {storageAreas.map(area => (
                                            <option key={area.id} value={area.id}>{area.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Date Range - only for logs/recordings */}
                        {exportType !== 'current' && (
                            <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-3">
                    <button
                        onClick={handleExport}
                        disabled={loading}
                        className="btn btn-primary w-full py-4 text-sm font-bold shadow-lg shadow-orange-500/20"
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
