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

import { useEffect } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { startOfDay, endOfDay, format } from "date-fns";

export default function AnalyticsPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today");
    const [isLive, setIsLive] = useState(true);
    const [stats, setStats] = useState<any>({
        todaySales: 0,
        ordersToday: 0,
        avgOrderValue: 0,
        activeOrders: 0,
        hourlySales: []
    });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();
            const today = new Date();
            const start = startOfDay(today).toISOString();
            const end = endOfDay(today).toISOString();

            // 1. Fetch Orders for Today
            const { data: orders, error: ordersError } = await supabase
                .from("orders")
                .select("total, status, created_at")
                .eq("location_id", currentLocation.id)
                .gte("created_at", start)
                .lte("created_at", end);

            if (ordersError) throw ordersError;

            // 2. Fetch Active Orders
            const { count: activeCount, error: activeError } = await supabase
                .from("orders")
                .select("*", { count: 'exact', head: true })
                .eq("location_id", currentLocation.id)
                .not("status", "in", '("completed","cancelled")');

            if (activeError) throw activeError;

            // Process Stats
            const totalSales = (orders as any[])
                ?.filter(o => o.status === "completed" || o.status === "served")
                .reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;

            const totalOrders = orders?.length || 0;

            // Hourly groups
            const hourlyGroups = (orders || []).reduce((acc: any, o: any) => {
                const hour = format(new Date(o.created_at), "HH:00");
                if (!acc[hour]) acc[hour] = { hour, sales: 0, orders: 0 };
                acc[hour].sales += Number(o.total || 0);
                acc[hour].orders += 1;
                return acc;
            }, {});

            const hourlyDataArray = Object.values(hourlyGroups)
                .sort((a: any, b: any) => a.hour.localeCompare(b.hour));

            setStats({
                todaySales: totalSales,
                ordersToday: totalOrders,
                avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
                activeOrders: activeCount || 0,
                hourlySales: hourlyDataArray
            });

        } catch (err) {
            console.error("Error fetching analytics:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        if (!currentLocation) return;
        const supabase = createClient();
        const sub = supabase.channel('analytics')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [currentLocation?.id, timeRange]);

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <BarChart3 className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view analytics.</p>
                <button onClick={() => window.location.href = "/dashboard/locations"} className="btn-primary">
                    Go to Locations
                </button>
            </div>
        );
    }

    const maxSales = Math.max(...stats.hourlySales.map((d: any) => d.sales), 1);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-orange-500" />
                        Real-Time Analytics
                    </h1>
                    <p className="text-slate-400 mt-1">
                        {currentLocation.name} - Live business intelligence
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
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={<DollarSign className="h-5 w-5 text-green-400" />}
                    label="Today's Sales"
                    value={formatCurrency(stats.todaySales)}
                    change={0}
                />
                <MetricCard
                    icon={<ShoppingBag className="h-5 w-5 text-blue-400" />}
                    label="Orders"
                    value={stats.ordersToday.toString()}
                    change={0}
                />
                <MetricCard
                    icon={<TrendingUp className="h-5 w-5 text-purple-400" />}
                    label="Avg Order"
                    value={formatCurrency(stats.avgOrderValue)}
                    change={0}
                />
                <MetricCard
                    icon={<Users className="h-5 w-5 text-orange-400" />}
                    label="Active Orders"
                    value={stats.activeOrders.toString()}
                    change={0}
                />
            </div>

            {/* Hourly Sales Chart */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold">Hourly Sales</h3>
                    <button onClick={fetchData} className="text-sm text-slate-400 hover:text-white flex items-center gap-2">
                        <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                        Refresh
                    </button>
                </div>
                <div className="flex items-end gap-2 h-48">
                    {stats.hourlySales.length > 0 ? (
                        stats.hourlySales.map((data: any) => (
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
                        ))
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                            No sales data for today yet
                        </div>
                    )}
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
