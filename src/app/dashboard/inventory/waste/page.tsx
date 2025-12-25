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
    Lightbulb,
    Loader2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

import { useEffect } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

export default function WastePage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [wasteLogs, setWasteLogs] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        inventory_item_id: "",
        item_name: "",
        quantity: "",
        unit: "",
        reason: "expired",
        cost: "",
        notes: ""
    });

    const fetchWasteLogs = async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error } = await (supabase.from("waste_logs") as any)
                .select(`
                    *,
                    inventory_items(name)
                `)
                .eq("location_id", currentLocation.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setWasteLogs(data || []);
        } catch (err) {
            console.error("Error fetching waste logs:", err);
            toast.error("Failed to fetch waste logs");
        } finally {
            setLoading(false);
        }
    };

    const fetchInventoryItems = async () => {
        if (!currentLocation) return;

        try {
            const supabase = createClient();
            const { data, error } = await (supabase.from("inventory_items") as any)
                .select("id, name, unit, cost_per_unit")
                .eq("location_id", currentLocation.id)
                .order("name", { ascending: true });

            if (error) throw error;
            setInventoryItems(data || []);
        } catch (err) {
            console.error("Error fetching inventory items:", err);
        }
    };

    useEffect(() => {
        fetchWasteLogs();
        fetchInventoryItems();
    }, [currentLocation?.id]);

    const handleInventoryChange = (itemId: string) => {
        const item = inventoryItems.find(i => i.id === itemId);
        if (item) {
            setFormData(prev => ({
                ...prev,
                inventory_item_id: itemId,
                item_name: item.name,
                unit: item.unit || "",
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                inventory_item_id: "",
                item_name: "",
                unit: "",
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation) return;
        if (!formData.item_name || !formData.quantity) {
            toast.error("Please fill in the required fields");
            return;
        }

        try {
            setSubmitting(true);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error("You must be logged in to log waste");
                return;
            }

            const { error } = await (supabase.from("waste_logs") as any).insert({
                location_id: currentLocation.id,
                inventory_item_id: formData.inventory_item_id || null,
                item_name: formData.item_name,
                quantity: parseFloat(formData.quantity),
                unit: formData.unit,
                reason: formData.reason,
                cost: formData.cost ? parseFloat(formData.cost) : 0,
                notes: formData.notes,
                recorded_by: user.id
            });

            if (error) throw error;

            toast.success("Waste logged successfully");
            setShowLogModal(false);
            setFormData({
                inventory_item_id: "",
                item_name: "",
                quantity: "",
                unit: "",
                reason: "expired",
                cost: "",
                notes: ""
            });
            fetchWasteLogs();
        } catch (err: any) {
            console.error("Error logging waste:", err);
            toast.error(err.message || "Failed to log waste");
        } finally {
            setSubmitting(false);
        }
    };

    const totalWaste = wasteLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0);
    const filtered = wasteLogs.filter(log =>
        (log.item_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.reason || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const wasteByCategory = Array.from(
        wasteLogs.reduce((acc: Map<string, number>, log: any) => {
            const reason = log.reason || "other";
            acc.set(reason, (acc.get(reason) || 0) + Number(log.cost || 0));
            return acc;
        }, new Map<string, number>())
    ).map(([category, cost]: [string, number]) => ({
        category: category.replace("_", " "),
        cost,
        percentage: totalWaste > 0 ? (cost / totalWaste) * 100 : 0
    })).sort((a, b) => b.cost - a.cost);

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Trash2 className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view waste logs.</p>
                <button onClick={() => window.location.href = "/dashboard/locations"} className="btn btn-primary">
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
                <button onClick={() => setShowLogModal(true)} className="btn btn-primary">
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
                                : `Top waste reason is "${wasteByCategory[0]?.category}". Focus on reducing this to save significantly this month.`}
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
                    <p className="text-2xl font-bold truncate capitalize">
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
                            className="input !pl-10"
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
                                                <td className="px-4 py-3 font-medium text-sm">
                                                    {log.item_name}
                                                    {log.inventory_items && (
                                                        <span className="block text-[10px] text-slate-500">Inventory Linked</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono">
                                                    {log.quantity} <span className="text-slate-500 text-[10px]">{log.unit || ""}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn(
                                                        "badge text-[10px] capitalize",
                                                        log.reason === "expired" && "badge-danger",
                                                        log.reason === "spoiled" && "badge-warning",
                                                        log.reason === "over_prepped" && "badge-info",
                                                        log.reason === "customer_return" && "badge-purple",
                                                        log.reason === "damaged" && "badge-orange"
                                                    )}>
                                                        {log.reason.replace("_", " ")}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono text-red-400">
                                                    -{formatCurrency(log.cost)}
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
                                        <span className="capitalize">{cat.category}</span>
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
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setShowLogModal(false)} />
                    <div className="relative card w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Log Waste</h2>
                            <button onClick={() => setShowLogModal(false)} disabled={submitting} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Link to Inventory (Optional)</label>
                                <select
                                    className="input"
                                    value={formData.inventory_item_id}
                                    onChange={(e) => handleInventoryChange(e.target.value)}
                                    disabled={submitting}
                                >
                                    <option value="">-- No Link (Custom Item) --</option>
                                    {inventoryItems.map(item => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Item Name*</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Ground Beef"
                                    value={formData.item_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                                    required
                                    disabled={submitting}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Quantity*</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="0.00"
                                        step="0.01"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                        required
                                        disabled={submitting}
                                    />
                                </div>
                                <div>
                                    <label className="label">Unit</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="lb, oz, each..."
                                        value={formData.unit}
                                        onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                                        disabled={submitting}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">Reason</label>
                                <select
                                    className="input"
                                    value={formData.reason}
                                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                    disabled={submitting}
                                >
                                    <option value="expired">Expired</option>
                                    <option value="spoiled">Spoiled</option>
                                    <option value="over_prepped">Over Prepped</option>
                                    <option value="damaged">Damaged</option>
                                    <option value="customer_return">Customer Return</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Estimated Cost ($)</label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="0.00"
                                    step="0.01"
                                    value={formData.cost}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                                    disabled={submitting}
                                />
                            </div>
                            <div>
                                <label className="label">Notes</label>
                                <textarea
                                    className="input min-h-[80px] py-2"
                                    placeholder="Any additional details..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    disabled={submitting}
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowLogModal(false)} disabled={submitting} className="btn btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : "Log Waste"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
