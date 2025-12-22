"use client";

import { useTranslation } from "react-i18next";
import {
    Package,
    AlertCircle,
    Plus,
    Search,
    ArrowRight,
    RefreshCw,
    TrendingDown,
    ChevronRight,
    Sparkles,
    Trash2,
    ShoppingCart,
    Link2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";

// Types for Supabase integration
interface InventoryItem {
    id: string;
    name: string;
    unit: string;
    stock: number;
    par: number;
    status: "good" | "low" | "critical";
    reorderQty?: number;
}

// TODO: Replace with Supabase query
const inventory: InventoryItem[] = [];

export default function InventoryPage() {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = inventory.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Inventory Tracking</h1>
                    <p className="text-slate-400 mt-1">
                        Manage stock levels and receive AI-powered reorder suggestions
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary">
                        <RefreshCw className="h-4 w-4" />
                        Recount
                    </button>
                    <button className="btn-primary">
                        <Plus className="h-4 w-4" />
                        Add Item
                    </button>
                </div>
            </div>

            {/* AI Alert Banner - Only show if there is an alert */}
            {inventory.some(i => i.status !== 'good') && (
                <div className="card border-orange-500/30 bg-orange-500/5 p-4 lg:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex gap-4">
                        <div className="p-3 bg-orange-500/20 rounded-2xl h-fit">
                            <TrendingDown className="h-6 w-6 text-orange-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-orange-100">Low Stock Alert</h3>
                            <p className="text-sm text-orange-200/60 max-w-lg mt-1">
                                Some essential items are reaching critical levels. Reorder now to avoid disruptions.
                            </p>
                        </div>
                    </div>
                    <button className="btn-primary whitespace-nowrap bg-orange-500 hover:bg-orange-600 border-none shadow-lg shadow-orange-500/20">
                        Manage Orders
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inventory List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search inventory..."
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
                                        <th className="px-4 py-3">In Stock</th>
                                        <th className="px-4 py-3">Par Level</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filtered.length > 0 ? (
                                        filtered.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-900/40 transition-colors cursor-pointer group">
                                                <td className="px-4 py-3 font-medium text-sm group-hover:text-orange-400 transition-colors">
                                                    {item.name}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono">
                                                    {item.stock} <span className="text-slate-500">{item.unit}</span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono text-slate-500">
                                                    {item.par} {item.unit}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn(
                                                        "badge text-[10px]",
                                                        item.status === "critical" && "badge-danger",
                                                        item.status === "low" && "badge-warning",
                                                        item.status === "good" && "badge-success"
                                                    )}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                                                No inventory items found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Categories & Actions */}
                <div className="space-y-4">
                    <div className="card">
                        <h3 className="font-bold mb-4">Stock Value</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Total Asset Value</span>
                                <span className="font-bold text-lg">{formatCurrency(0)}</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 w-[0%]" />
                            </div>
                            <p className="text-[10px] text-slate-500">
                                Stock value is calculated based on current inventory levels and unit costs.
                            </p>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="font-bold mb-4">Quick Links</h3>
                        <div className="space-y-2">
                            <Link
                                href="/dashboard/inventory/linker"
                                className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <Link2 className="h-4 w-4 text-blue-400" />
                                    <span>Ingredient Linker</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                            </Link>
                            <Link
                                href="/dashboard/inventory/waste"
                                className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                    <span>Waste Logs</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                            </Link>
                            <Link
                                href="/dashboard/menu/suggestions"
                                className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm text-orange-400 font-medium"
                            >
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    <span>AI Menu Suggestions</span>
                                </div>
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
