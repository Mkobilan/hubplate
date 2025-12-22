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

// Mock data
const mockWasteLogs = [
    { id: "1", item: "Ground Beef", quantity: 5, unit: "lb", reason: "Expired", cost: 22.50, date: "2025-12-21" },
    { id: "2", item: "Tomatoes", quantity: 8, unit: "lb", reason: "Spoilage", cost: 12.00, date: "2025-12-20" },
    { id: "3", item: "Chicken Wings", quantity: 3, unit: "lb", reason: "Prep Error", cost: 9.75, date: "2025-12-19" },
    { id: "4", item: "Brioche Buns", quantity: 6, unit: "pack", reason: "Expired", cost: 18.00, date: "2025-12-18" },
];

const wasteByCategory = [
    { category: "Proteins", percentage: 45, cost: 156.25 },
    { category: "Produce", percentage: 30, cost: 89.50 },
    { category: "Bakery", percentage: 15, cost: 54.00 },
    { category: "Other", percentage: 10, cost: 28.75 },
];

export default function WastePage() {
    const { t } = useTranslation();
    const [showLogModal, setShowLogModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const totalWaste = mockWasteLogs.reduce((sum, log) => sum + log.cost, 0);
    const filtered = mockWasteLogs.filter(log =>
        log.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.reason.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Waste Tracking</h1>
                    <p className="text-slate-400 mt-1">
                        Log waste, analyze patterns, and reduce food costs
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
                        <h3 className="text-lg font-bold text-amber-100">AI Waste Reduction Insight</h3>
                        <p className="text-sm text-amber-200/60 max-w-2xl mt-1">
                            Your **protein waste** spiked 23% this week, primarily from **Ground Beef** expiration.
                            Consider reducing your par level from 100 lbs to 75 lbs to better match actual consumption patterns.
                            This could save approximately **$90/month**.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="card text-center">
                    <DollarSign className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-red-400">{formatCurrency(totalWaste)}</p>
                    <p className="text-sm text-slate-500 mt-1">This Week&apos;s Waste</p>
                </div>
                <div className="card text-center">
                    <TrendingDown className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-green-400">-12%</p>
                    <p className="text-sm text-slate-500 mt-1">vs. Last Week</p>
                </div>
                <div className="card text-center">
                    <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">Proteins</p>
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
                                        <th className="px-4 py-3">Cost</th>
                                        <th className="px-4 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filtered.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                                            <td className="px-4 py-3 font-medium text-sm">{log.item}</td>
                                            <td className="px-4 py-3 text-sm font-mono">
                                                {log.quantity} <span className="text-slate-500">{log.unit}</span>
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
                                                -{formatCurrency(log.cost)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{log.date}</td>
                                        </tr>
                                    ))}
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
                        {wasteByCategory.map((cat) => (
                            <div key={cat.category} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>{cat.category}</span>
                                    <span className="font-mono text-red-400">-{formatCurrency(cat.cost)}</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-red-500 rounded-full"
                                        style={{ width: `${cat.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
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
