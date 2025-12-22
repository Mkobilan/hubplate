"use client";

import { useTranslation } from "react-i18next";
import {
    BarChart3,
    TrendingUp,
    Users,
    DollarSign,
    Calendar,
    AlertCircle,
    ArrowUpRight,
    Target
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Analytics & Reports</h1>
                    <p className="text-slate-400 mt-1">
                        Real-time insights into your restaurant&apos;s performance
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary">Export CSV</button>
                    <button className="btn-primary">Download PDF</button>
                </div>
            </div>

            {/* High-Level Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportCard
                    label="Gross Sales"
                    value={formatCurrency(12847.50)}
                    trend="+14%"
                    trendDesc="vs last week"
                />
                <ReportCard
                    label="Labor Cost %"
                    value="18.2%"
                    trend="-2%"
                    trendDesc="Optimal < 20%"
                    variant="success"
                />
                <ReportCard
                    label="COGS %"
                    value="24.5%"
                    trend="+1%"
                    trendDesc="Target 25-30%"
                    variant="success"
                />
                <ReportCard
                    label="Net Profit"
                    value={formatCurrency(4892.20)}
                    trend="+8%"
                    trendDesc="After labor & tax"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Chart Placeholder */}
                <div className="lg:col-span-2 card h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold">Sales Overview</h3>
                        <select className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>Year to Date</option>
                        </select>
                    </div>
                    <div className="flex-1 bg-slate-950/50 rounded-xl border border-dashed border-slate-800 flex items-center justify-center relative overflow-hidden group">
                        {/* Mock chart lines */}
                        <div className="absolute inset-0 flex items-end gap-2 px-8 pb-8 opacity-20 group-hover:opacity-40 transition-opacity">
                            {[40, 60, 45, 90, 80, 55, 100].map((h, i) => (
                                <div key={i} className="flex-1 bg-orange-500 rounded-t-lg transition-all" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Sales Chart Visualization</p>
                    </div>
                </div>

                {/* Labor Insights */}
                <div className="space-y-6">
                    <div className="card border-blue-500/20 bg-blue-500/5">
                        <div className="flex gap-3 mb-4">
                            <Target className="h-5 w-5 text-blue-400" />
                            <h3 className="font-bold text-blue-400">Labor Efficiency</h3>
                        </div>
                        <div className="space-y-4">
                            <EfficiencyRow label="Peak Hours" value="94%" color="bg-green-500" />
                            <EfficiencyRow label="Slow Hours" value="45%" color="bg-red-500" />
                            <EfficiencyRow label="Overall" value="82%" color="bg-blue-500" />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-6 leading-relaxed">
                            AI Suggestion: You are overstaffed on Tuesdays between 2-4 PM. Reducing 1 host could save **$450/month**.
                        </p>
                    </div>

                    <div className="card">
                        <h3 className="font-bold mb-4">Top 3 Categories</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Main Entrees</span>
                                <span className="font-bold text-orange-400">{formatCurrency(6840)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Craft Beverages</span>
                                <span className="font-bold text-orange-400">{formatCurrency(3120)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Appetizers</span>
                                <span className="font-bold text-orange-400">{formatCurrency(2887)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ReportCard({ label, value, trend, trendDesc, variant = "default" }: { label: string, value: string, trend: string, trendDesc: string, variant?: "default" | "success" }) {
    return (
        <div className="card group hover:border-orange-500/30 transition-colors">
            <p className="text-sm text-slate-500 font-medium group-hover:text-slate-400 transition-colors">{label}</p>
            <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{value}</h3>
            </div>
            <div className="mt-4 flex items-center gap-1.5">
                <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    trend.startsWith('+') ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                )}>
                    {trend}
                </span>
                <span className="text-[10px] text-slate-600">{trendDesc}</span>
            </div>
        </div>
    );
}

function EfficiencyRow({ label, value, color }: { label: string, value: string, color: string }) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium">
                <span className="text-slate-400">{label}</span>
                <span>{value}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", color)} style={{ width: value }} />
            </div>
        </div>
    );
}
