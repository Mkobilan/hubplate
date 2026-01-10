"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    Activity,
    Search,
    Filter,
    Calendar,
    ArrowLeft,
    Download,
    RefreshCw,
    Loader2,
    TrendingDown,
    Receipt,
    ArrowUpDown,
    Info,
    Utensils,
    Wine,
    Box
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Lock } from "lucide-react";

type InventoryLog = {
    id: string;
    created_at: string;
    quantity: number;
    unit: string;
    pour_type: string;
    usage_type: "pour" | "food" | "ingredient";
    notes: string | null;
    order_id: string | null;
    order_item_ref: string | null;
    inventory_items: {
        name: string;
        cost_per_unit: number;
    } | null;
    recipes: {
        name: string;
    } | null;
    employees: {
        first_name: string;
        last_name: string;
    } | null;
};

export default function InventoryLogsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const isTerminalMode = useAppStore((state) => state.isTerminalMode);
    const currentLocation = useAppStore((state) => state.currentLocation);

    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [loading, setLoading] = useState(true);

    const MANAGEMENT_ROLES = ["owner", "manager", "gm", "agm"];
    const isManager = isTerminalMode
        ? (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role))
        : (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role)) || isOrgOwner;

    // Redirect if not authorized
    useEffect(() => {
        if (!loading && !isManager) {
            router.push("/dashboard");
        }
    }, [isManager, loading, router]);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryLog | 'inventory_items.name' | 'recipes.name' | 'employees.first_name', direction: 'asc' | 'desc' } | null>(null);

    // Filter States
    const [filterUsage, setFilterUsage] = useState<string>("all");

    // Pagination / Limiting
    const [limit, setLimit] = useState(50);

    const fetchLogs = useCallback(async () => {
        if (!currentLocation) return;
        setLoading(true);
        const supabase = createClient();

        try {
            const { data, error } = await supabase
                .from("pours") // Table remains 'pours' for DB backward compatibility
                .select(`
                    *,
                    inventory_items (
                        name,
                        cost_per_unit
                    ),
                    recipes (
                        name
                    ),
                    employees (
                        first_name,
                        last_name
                    )
                `)
                .eq("location_id", currentLocation.id)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) throw error;
            setLogs(data as any || []);
        } catch (err: any) {
            console.error("Error fetching inventory logs:", err);
            toast.error("Failed to load inventory logs");
        } finally {
            setLoading(false);
        }
    }, [currentLocation, limit]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    if (!isManager) return null;

    const filteredLogs = logs.filter(p => {
        const matchesSearch =
            p.inventory_items?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.recipes?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.order_id && p.order_id.includes(searchQuery));

        const matchesUsage = filterUsage === "all" || p.usage_type === filterUsage;

        return matchesSearch && matchesUsage;
    });

    const sortedLogs = [...filteredLogs].sort((a, b) => {
        if (!sortConfig) return 0;

        let aValue: any = a[sortConfig.key as keyof InventoryLog];
        let bValue: any = b[sortConfig.key as keyof InventoryLog];

        // Handle nested properties
        if (sortConfig.key === 'inventory_items.name') {
            aValue = a.inventory_items?.name || '';
            bValue = b.inventory_items?.name || '';
        } else if (sortConfig.key === 'recipes.name') {
            aValue = a.recipes?.name || '';
            bValue = b.recipes?.name || '';
        } else if (sortConfig.key === 'employees.first_name') {
            aValue = a.employees?.first_name || '';
            bValue = b.employees?.first_name || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: any) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const estimatedCost = filteredLogs.reduce((sum, p) => sum + (p.quantity * (p.inventory_items?.cost_per_unit || 0)), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/dashboard/inventory" className="text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Activity className="h-8 w-8 text-pink-500" />
                            Inventory Logs
                        </h1>
                    </div>
                    <p className="text-slate-400">
                        Track real-time inventory depletion and ingredient usage
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchLogs}
                        className="btn btn-secondary"
                        disabled={loading}
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Refresh
                    </button>
                    <button className="btn btn-secondary">
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-xl">
                        <Activity className="h-6 w-6 text-pink-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Total Logs</p>
                        <p className="text-2xl font-bold">{filteredLogs.length}</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-xl">
                        <Wine className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Pours</p>
                        <p className="text-2xl font-bold">{filteredLogs.filter(l => l.usage_type === 'pour').length}</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-xl">
                        <Utensils className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Food Usage</p>
                        <p className="text-2xl font-bold">{filteredLogs.filter(l => l.usage_type === 'food').length}</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-xl">
                        <Receipt className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Est. Cost</p>
                        <p className="text-2xl font-bold">{formatCurrency(estimatedCost)}</p>
                    </div>
                </div>
            </div>

            <div className="card bg-blue-500/10 border-blue-500/20 p-4 flex gap-4 items-start">
                <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sm font-bold text-blue-100">Estimated Cost Calculation</h3>
                    <p className="text-xs text-blue-200/70 mt-1">
                        Cost is calculated by multiplying the <strong>Quantity Used</strong> by the <strong>Cost Per Unit</strong> of the inventory item.
                        This provides a real-time estimate of the cost of goods sold (COGS) for these items.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by ingredient, recipe, or order #..."
                            className="input !pl-10 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            className="input !py-1.5"
                            value={filterUsage}
                            onChange={(e) => setFilterUsage(e.target.value)}
                        >
                            <option value="all">All Usage</option>
                            <option value="pour">Pours / Alcohol</option>
                            <option value="food">Food Recipes</option>
                            <option value="ingredient">Direct Links</option>
                        </select>
                        <select
                            className="input !py-1.5"
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                        >
                            <option value={50}>Last 50</option>
                            <option value={100}>Last 100</option>
                            <option value={500}>Last 500</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                            <tr>
                                <th
                                    className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => handleSort('created_at')}
                                >
                                    <div className="flex items-center gap-1">
                                        Time
                                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => handleSort('inventory_items.name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Ingredient
                                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => handleSort('recipes.name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Recipe / Context
                                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => handleSort('quantity')}
                                >
                                    <div className="flex items-center gap-1">
                                        Quantity
                                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => handleSort('usage_type')}
                                >
                                    <div className="flex items-center gap-1">
                                        Type
                                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => handleSort('employees.first_name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Employee
                                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-right">Order</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-pink-500 mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                        No logs found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                sortedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                                        <td className="px-4 py-3 align-top whitespace-nowrap text-slate-400">
                                            {new Date(log.created_at).toLocaleString([], {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <span className="font-medium text-slate-200">
                                                {log.inventory_items?.name || "Unknown Item"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            {log.recipes ? (
                                                <span className="text-white font-medium">
                                                    {log.recipes.name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 italic">Direct Link</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top font-mono font-bold">
                                            {log.quantity.toFixed(2)} {log.unit}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <span className={cn(
                                                "badge text-[10px] uppercase flex items-center gap-1 w-fit",
                                                log.usage_type === 'pour' ? "badge-warning" :
                                                    log.usage_type === 'food' ? "badge-info" :
                                                        "badge-neutral"
                                            )}>
                                                {log.usage_type === 'pour' ? <Wine className="h-3 w-3" /> :
                                                    log.usage_type === 'food' ? <Utensils className="h-3 w-3" /> :
                                                        <Box className="h-3 w-3" />}
                                                {log.usage_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-top text-slate-400">
                                            {log.employees ? `${log.employees.first_name} ${log.employees.last_name?.charAt(0)}.` : "-"}
                                        </td>
                                        <td className="px-4 py-3 align-top text-right">
                                            {log.order_id && (
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="font-mono text-xs text-blue-400">#{log.order_id.slice(0, 4)}</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
