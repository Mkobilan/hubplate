"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    ShoppingBag,
    Clock,
    Calendar,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Mock real-time data
const realtimeStats = {
    todaySales: 4285.50,
    todaySalesChange: 12.5,
    ordersToday: 86,
    ordersChange: 8.2,
    avgOrderValue: 49.83,
    avgOrderChange: 3.8,
    tablesTurnover: 4.2,
    turnoverChange: -2.1,
    activeOrders: 12,
    kitchenAvgTime: "14 min"
};

const hourlyData = [
    { hour: "11am", sales: 420, orders: 8 },
    { hour: "12pm", sales: 890, orders: 18 },
    { hour: "1pm", sales: 1120, orders: 24 },
    { hour: "2pm", sales: 580, orders: 12 },
    { hour: "3pm", sales: 320, orders: 6 },
    { hour: "4pm", sales: 280, orders: 5 },
    { hour: "5pm", sales: 450, orders: 9 },
    { hour: "6pm", sales: 780, orders: 16 },
];

const topItems = [
    { name: "Classic Burger", sold: 42, revenue: 713.58 },
    { name: "Buffalo Wings", sold: 38, revenue: 569.62 },
    { name: "Grilled Salmon", sold: 24, revenue: 695.76 },
    { name: "Caesar Salad", sold: 31, revenue: 402.69 },
    { name: "IPA Draft", sold: 56, revenue: 448.00 },
];

const laborEfficiency = {
    laborCost: 1245.00,
    laborPercent: 29.1,
    targetPercent: 28,
    staffOnDuty: 8,
    coversPer: 10.75
};

export default function AnalyticsPage() {
    const { t } = useTranslation();
    const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today");
    const [isLive, setIsLive] = useState(true);

    const maxSales = Math.max(...hourlyData.map(d => d.sales));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-orange-500" />
                        Real-Time Analytics
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Live performance metrics and business intelligence
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                        isLive ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-400"
                    )}>
                        <span className={cn("w-2 h-2 rounded-full", isLive ? "bg-green-400 animate-pulse" : "bg-slate-500")} />
                        {isLive ? "Live" : "Paused"}
                    </div>
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        {(["today", "week", "month"] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={cn(
                                    "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                                    timeRange === range ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                                )}
                            >
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={<DollarSign className="h-5 w-5 text-green-400" />}
                    label="Today's Sales"
                    value={formatCurrency(realtimeStats.todaySales)}
                    change={realtimeStats.todaySalesChange}
                />
                <MetricCard
                    icon={<ShoppingBag className="h-5 w-5 text-blue-400" />}
                    label="Orders"
                    value={realtimeStats.ordersToday.toString()}
                    change={realtimeStats.ordersChange}
                />
                <MetricCard
                    icon={<TrendingUp className="h-5 w-5 text-purple-400" />}
                    label="Avg Order"
                    value={formatCurrency(realtimeStats.avgOrderValue)}
                    change={realtimeStats.avgOrderChange}
                />
                <MetricCard
                    icon={<RefreshCw className="h-5 w-5 text-orange-400" />}
                    label="Table Turnover"
                    value={`${realtimeStats.tablesTurnover}x`}
                    change={realtimeStats.turnoverChange}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hourly Sales Chart */}
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold">Hourly Sales</h3>
                        <span className="text-sm text-slate-500">Updated just now</span>
                    </div>
                    <div className="flex items-end gap-2 h-48">
                        {hourlyData.map((data) => (
                            <div key={data.hour} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full relative group">
                                    <div
                                        className="w-full bg-orange-500/20 rounded-t-lg transition-all group-hover:bg-orange-500/30"
                                        style={{ height: `${(data.sales / maxSales) * 160}px` }}
                                    >
                                        <div
                                            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                                        >
                                            {formatCurrency(data.sales)} • {data.orders} orders
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-slate-500">{data.hour}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live Activity */}
                <div className="card">
                    <h3 className="font-bold mb-4">Live Activity</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                    <ShoppingBag className="h-5 w-5 text-orange-400" />
                                </div>
                                <div>
                                    <p className="font-medium">Active Orders</p>
                                    <p className="text-xs text-slate-500">In kitchen now</p>
                                </div>
                            </div>
                            <span className="text-2xl font-bold">{realtimeStats.activeOrders}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="font-medium">Avg Kitchen Time</p>
                                    <p className="text-xs text-slate-500">Ticket to ready</p>
                                </div>
                            </div>
                            <span className="text-2xl font-bold">{realtimeStats.kitchenAvgTime}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                    <Users className="h-5 w-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="font-medium">Staff On Duty</p>
                                    <p className="text-xs text-slate-500">{laborEfficiency.coversPer} covers/staff</p>
                                </div>
                            </div>
                            <span className="text-2xl font-bold">{laborEfficiency.staffOnDuty}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Selling Items */}
                <div className="card">
                    <h3 className="font-bold mb-4">Top Selling Items</h3>
                    <div className="space-y-3">
                        {topItems.map((item, i) => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                        i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                                            i === 1 ? "bg-slate-400/20 text-slate-300" :
                                                i === 2 ? "bg-amber-700/20 text-amber-500" :
                                                    "bg-slate-800 text-slate-500"
                                    )}>
                                        {i + 1}
                                    </span>
                                    <span className="font-medium">{item.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">{formatCurrency(item.revenue)}</p>
                                    <p className="text-xs text-slate-500">{item.sold} sold</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Labor Efficiency */}
                <div className="card">
                    <h3 className="font-bold mb-4">Labor Efficiency</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Labor Cost Today</span>
                            <span className="text-xl font-bold">{formatCurrency(laborEfficiency.laborCost)}</span>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>Labor %</span>
                                <span className={cn(
                                    "font-bold",
                                    laborEfficiency.laborPercent <= laborEfficiency.targetPercent ? "text-green-400" : "text-amber-400"
                                )}>
                                    {laborEfficiency.laborPercent}%
                                </span>
                            </div>
                            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all",
                                        laborEfficiency.laborPercent <= laborEfficiency.targetPercent ? "bg-green-500" : "bg-amber-500"
                                    )}
                                    style={{ width: `${Math.min(laborEfficiency.laborPercent / 40 * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Target: {laborEfficiency.targetPercent}%</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    icon,
    label,
    value,
    change
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    change: number;
}) {
    const isPositive = change >= 0;
    return (
        <div className="card">
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <span className="text-sm text-slate-400">{label}</span>
            </div>
            <p className="text-2xl font-bold mb-1">{value}</p>
            <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                isPositive ? "text-green-400" : "text-red-400"
            )}>
                {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {Math.abs(change)}% vs yesterday
            </div>
        </div>
    );
}
