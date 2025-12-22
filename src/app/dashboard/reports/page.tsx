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
                    value={formatCurrency(0)}
                    trend="0%"
                    trendDesc="vs last week"
                />
                <ReportCard
                    label="Labor Cost %"
                    value="0%"
                    trend="0%"
                    trendDesc="Optimal < 20%"
                />
                <ReportCard
                    label="COGS %"
                    value="0%"
                    trend="0%"
                    trendDesc="Target 25-30%"
                />
                <ReportCard
                    label="Net Profit"
                    value={formatCurrency(0)}
                    trend="0%"
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
                        <p className="text-slate-500 text-sm font-medium">Connect Supabase to visualize sales data</p>
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
                            <EfficiencyRow label="Peak Hours" value="0%" color="bg-green-500" />
                            <EfficiencyRow label="Slow Hours" value="0%" color="bg-red-500" />
                            <EfficiencyRow label="Overall" value="0%" color="bg-blue-500" />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-6 leading-relaxed">
                            AI suggestions will appear here once shift data is populated.
                        </p>
                    </div>

                    <div className="card">
                        <h3 className="font-bold mb-4">Top Categories</h3>
                        <div className="text-center py-4">
                            <p className="text-sm text-slate-500">No data available</p>
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
