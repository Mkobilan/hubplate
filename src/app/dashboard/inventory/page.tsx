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
    ChevronRight
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useState } from "react";

// Mock data
const mockInventory = [
    { id: "1", name: "Ground Beef 80/20", unit: "lb", stock: 45, par: 100, status: "critical" },
    { id: "2", name: "Brioche Buns", unit: "pack", stock: 12, par: 20, status: "low" },
    { id: "3", name: "Chicken Wings", unit: "lb", stock: 85, par: 50, status: "good" },
    { id: "4", name: "Iceberg Lettuce", unit: "head", stock: 8, par: 15, status: "low" },
    { id: "5", name: "IPA Beer Keg", unit: "keg", stock: 3, par: 2, status: "good" },
];

export default function InventoryPage() {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = mockInventory.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

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

            {/* AI Alert Banner */}
            <div className="card border-orange-500/30 bg-orange-500/5 p-4 lg:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-2xl h-fit">
                        <TrendingDown className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-orange-100">Low Stock Prediction</h3>
                        <p className="text-sm text-orange-200/60 max-w-lg mt-1">
                            Based on sales patterns, you will run out of **Ground Beef** by Wednesday.
                            Suggest ordering **55 lbs** today to maintain stock through peak weekend hours.
                        </p>
                    </div>
                </div>
                <button className="btn-primary whitespace-nowrap bg-orange-500 hover:bg-orange-600 border-none shadow-lg shadow-orange-500/20">
                    Create Purchase Order
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>

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
                                    {filtered.map((item) => (
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
                                    ))}
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
                                <span className="font-bold text-lg">{formatCurrency(4125.40)}</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 w-[65%]" />
                            </div>
                            <p className="text-[10px] text-slate-500">
                                You currently have **$1,200** tied up in overstock items (Drinks category).
                            </p>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="font-bold mb-4">Quick Links</h3>
                        <div className="space-y-2">
                            <button className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm">
                                <span>Ingredient Linker</span>
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                            </button>
                            <button className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm">
                                <span>Waste Logs</span>
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                            </button>
                            <button className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm text-blue-400 font-medium">
                                <span>Setup AI Vendors</span>
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
