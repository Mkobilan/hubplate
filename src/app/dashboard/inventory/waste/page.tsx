"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Trash2,
    Plus,
    Calendar,
    DollarSign,
    TrendingDown,
    AlertTriangle,
    BarChart3,
    Search,
    X,
    Lightbulb
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

import { useEffect } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";

export default function WastePage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [wasteLogs, setWasteLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogModal, setShowLogModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchWasteLogs = async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error } = await supabase
                .from("waste_logs")
                .select(`
                    *,
                    inventory_items!inner(name)
                `)
                .eq("location_id", currentLocation.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setWasteLogs(data || []);
        } catch (err) {
            console.error("Error fetching waste logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWasteLogs();
    }, [currentLocation?.id]);

    const totalWaste = wasteLogs.reduce((sum, log) => sum + Number(log.cost_impact || 0), 0);
    const filtered = wasteLogs.filter(log =>
        (log.inventory_items?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.reason || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const wasteByCategory = Array.from(
        wasteLogs.reduce((acc: Map<string, number>, log: any) => {
            const reason = log.reason || "Other";
            acc.set(reason, (acc.get(reason) || 0) + Number(log.cost_impact || 0));
            return acc;
        }, new Map<string, number>())
    ).map(([category, cost]: [string, number]) => ({
        category,
        cost,
        percentage: totalWaste > 0 ? (cost / totalWaste) * 100 : 0
    })).sort((a, b) => b.cost - a.cost);

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Trash2 className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view waste logs.</p>
                <button onClick={() => window.location.href = "/dashboard/locations"} className="btn-primary">
                    Go to Locations
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Waste Tracking</h1>
                    <p className="text-slate-400 mt-1">
                        {currentLocation.name} - Log waste, analyze patterns, and reduce food costs
                    </p>
                </div>
                <button onClick={() => setShowLogModal(true)} className="btn-primary">
                    <Plus className="h-4 w-4" />
                    Log Waste
                </button>
            </div>

            {/* AI Insight Banner */}
            <div className="card border-amber-500/30 bg-amber-500/5 p-4 lg:p-6">
                <div className="flex gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-2xl h-fit">
                        <Lightbulb className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-amber-100">Waste Reduction Insights</h3>
                        <p className="text-sm text-amber-200/60 max-w-2xl mt-1">
                            {wasteLogs.length < 5
                                ? "HubPlate is waiting for more data to generate insights. Keep logging waste to see patterns."
                                : "Analyzing your waste patterns... Focus on 'Prep Error' reduction to save significantly this month."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="card text-center">
                    <DollarSign className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-red-400">{formatCurrency(totalWaste)}</p>
                    <p className="text-sm text-slate-500 mt-1">Total Recorded Waste</p>
                </div>
                <div className="card text-center">
                    <TrendingDown className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-green-400">{wasteLogs.length}</p>
                    <p className="text-sm text-slate-500 mt-1">Total Incidents</p>
                </div>
                <div className="card text-center">
                    <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold truncate">
                        {wasteByCategory[0]?.category || "N/A"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Top Waste Category</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Waste Log Table */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search waste logs..."
                            className="input pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3">Quantity</th>
                                        <th className="px-4 py-3">Reason</th>
                                        <th className="px-4 py-3">Cost Impact</th>
                                        <th className="px-4 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                                            </td>
                                        </tr>
                                    ) : filtered.length > 0 ? (
                                        filtered.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                                                <td className="px-4 py-3 font-medium text-sm">{log.inventory_items?.name || "Unknown"}</td>
                                                <td className="px-4 py-3 text-sm font-mono">
                                                    {log.quantity_lost} <span className="text-slate-500">{log.unit || "unit"}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn(
                                                        "badge text-[10px]",
                                                        log.reason === "Expired" && "badge-danger",
                                                        log.reason === "Spoilage" && "badge-warning",
                                                        log.reason === "Prep Error" && "badge-info"
                                                    )}>
                                                        {log.reason}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono text-red-400">
                                                    -{formatCurrency(log.cost_impact)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-500">
                                                    {new Date(log.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                                                No waste logs found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Waste Breakdown */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="h-5 w-5 text-orange-400" />
                        <h3 className="font-bold">Waste by Category</h3>
                    </div>
                    <div className="space-y-4">
                        {wasteByCategory.length > 0 ? (
                            wasteByCategory.map((cat) => (
                                <div key={cat.category} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{cat.category}</span>
                                        <span className="font-mono text-red-400">-{formatCurrency(cat.cost)}</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 rounded-full transition-all duration-500"
                                            style={{ width: `${cat.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-6">No data yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Log Waste Modal */}
            {showLogModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowLogModal(false)} />
                    <div className="relative card w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Log Waste</h2>
                            <button onClick={() => setShowLogModal(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form className="space-y-4">
                            <div>
                                <label className="label">Item Name</label>
                                <input type="text" className="input" placeholder="e.g. Ground Beef" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Quantity</label>
                                    <input type="number" className="input" placeholder="5" />
                                </div>
                                <div>
                                    <label className="label">Unit</label>
                                    <select className="input">
                                        <option>lb</option>
                                        <option>pack</option>
                                        <option>unit</option>
                                        <option>oz</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label">Reason</label>
                                <select className="input">
                                    <option>Expired</option>
                                    <option>Spoilage</option>
                                    <option>Prep Error</option>
                                    <option>Customer Return</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Estimated Cost ($)</label>
                                <input type="number" className="input" placeholder="22.50" step="0.01" />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowLogModal(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    Log Waste
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
