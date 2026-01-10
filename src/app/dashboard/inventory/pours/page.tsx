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
    Info
} from "lucide-react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { toast } from "react-hot-toast";

type Pour = {
    id: string;
    created_at: string;
    quantity: number;
    unit: string;
    pour_type: string;
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

export default function PoursPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [pours, setPours] = useState<Pour[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof Pour | 'inventory_items.name' | 'recipes.name' | 'employees.first_name', direction: 'asc' | 'desc' } | null>(null);

    // Filter States
    const [filterType, setFilterType] = useState<string>("all");

    // Pagination / Limiting
    const [limit, setLimit] = useState(50);

    const fetchPours = useCallback(async () => {
        if (!currentLocation) return;
        setLoading(true);
        const supabase = createClient();

        try {
            const { data, error } = await supabase
                .from("pours")
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
            setPours(data as any || []);
        } catch (err: any) {
            console.error("Error fetching pours:", err);
            toast.error("Failed to load pour logs");
        } finally {
            setLoading(false);
        }
    }, [currentLocation, limit]);

    useEffect(() => {
        fetchPours();
    }, [fetchPours]);

    const filteredPours = pours.filter(p => {
        const matchesSearch =
            p.inventory_items?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.recipes?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.order_id && p.order_id.includes(searchQuery));

        const matchesType = filterType === "all" || p.pour_type === filterType;

        return matchesSearch && matchesType;
    });

    const sortedPours = [...filteredPours].sort((a, b) => {
        if (!sortConfig) return 0;

        let aValue: any = a[sortConfig.key as keyof Pour];
        let bValue: any = b[sortConfig.key as keyof Pour];

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

    const totalVolume = filteredPours.reduce((sum, p) => sum + p.quantity, 0);
    const estimatedCost = filteredPours.reduce((sum, p) => sum + (p.quantity * (p.inventory_items?.cost_per_unit || 0)), 0);

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
                            Pour Logs
                        </h1>
                    </div>
                    <p className="text-slate-400">
                        Track real-time inventory depletion and recipe usage
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchPours}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-xl">
                        <Activity className="h-6 w-6 text-pink-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Total Pours</p>
                        <p className="text-2xl font-bold">{filteredPours.length}</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-xl">
                        <TrendingDown className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Volume Depleted</p>
                        <p className="text-2xl font-bold">{totalVolume.toFixed(2)} oz</p>
                        {/* Assuming oz for now, simplistic view */}
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
                        Cost is calculated by multiplying the <strong>Quantity Poured</strong> by the <strong>Cost Per Unit</strong> of the inventory item.
                        This provides a real-time estimate of the cost of goods sold (COGS) for these pours.
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
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="standard">Standard</option>
                            <option value="shot">Shot</option>
                            <option value="double">Double</option>
                            <option value="manual">Manual</option>
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
                                    onClick={() => handleSort('pour_type')}
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
                                <th className="px-4 py-3">Link</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-pink-500 mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredPours.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                        No pours found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                sortedPours.map((pour) => (
                                    <tr key={pour.id} className="hover:bg-slate-900/30 transition-colors">
                                        <td className="px-4 py-3 align-top whitespace-nowrap text-slate-400">
                                            {new Date(pour.created_at).toLocaleString([], {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <span className="font-medium text-slate-200">
                                                {pour.inventory_items?.name || "Unknown Item"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            {pour.recipes ? (
                                                <span className="text-orange-400 font-medium">
                                                    {pour.recipes.name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 italic">Manual Pour</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top font-mono font-bold">
                                            {pour.quantity} {pour.unit}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <span className={cn(
                                                "badge text-[10px] uppercase",
                                                pour.pour_type === 'standard' ? "badge-neutral" :
                                                    pour.pour_type === 'shot' ? "badge-warning" :
                                                        "badge-info"
                                            )}>
                                                {pour.pour_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-top text-slate-400">
                                            {pour.employees ? `${pour.employees.first_name} ${pour.employees.last_name?.charAt(0)}.` : "-"}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            {pour.order_id && (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] text-slate-500 uppercase">Order</span>
                                                    <span className="font-mono text-xs text-blue-400">#{pour.order_id.slice(0, 4)}</span>
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
