"use client";

import { useTranslation } from "react-i18next";
import {
    ClipboardList,
    DollarSign,
    TrendingUp,
    Users,
    Clock,
    AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { startOfDay, endOfDay } from "date-fns";
import ServerSettlement from "./components/ServerSettlement";

export default function DashboardPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const isClockedIn = useAppStore((state) => state.isClockedIn);
    const activeEntry = useAppStore((state) => state.activeEntry);
    const isTerminalMode = useAppStore((state) => state.isTerminalMode);
    const [stats, setStats] = useState({
        todayOrders: 0,
        todayRevenue: 0,
        activeTables: 0,
        avgTicketTime: 0,
        revenueTrend: "0%",
        ordersTrend: "0%"
    });
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();
            const today = new Date();
            const start = startOfDay(today).toISOString();
            const end = endOfDay(today).toISOString();

            // 1. Fetch Today's Orders & Revenue
            const { data: todayOrders, error: ordersError } = await supabase
                .from("orders")
                .select("total, status, created_at, completed_at")
                .eq("location_id", currentLocation.id)
                .gte("created_at", start)
                .lte("created_at", end);

            if (ordersError) throw ordersError;

            // 2. Fetch Active Orders (not completed/cancelled)
            const { data: openOrders, error: openError } = await supabase
                .from("orders")
                .select("*")
                .eq("location_id", currentLocation.id)
                .not("status", "in", '("completed","cancelled")')
                .order("created_at", { ascending: false });

            if (openError) throw openError;
            setActiveOrders(openOrders || []);

            // Calculate stats
            if (todayOrders && Array.isArray(todayOrders)) {
                const totalRevenue = todayOrders
                    .filter((o: any) => ["ready", "served", "completed"].includes(o.status))
                    .reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

                const trackableOrders = todayOrders.filter((o: any) => o.completed_at && o.created_at);
                const avgTime = trackableOrders.length > 0
                    ? trackableOrders.reduce((sum: number, o: any) => {
                        const duration = (new Date(o.completed_at).getTime() - new Date(o.created_at).getTime()) / 60000;
                        return sum + duration;
                    }, 0) / trackableOrders.length
                    : 0;

                setStats(prev => ({
                    ...prev,
                    todayOrders: todayOrders.length,
                    todayRevenue: totalRevenue,
                    avgTicketTime: Math.round(avgTime)
                }));
            }

        } catch (err) {
            console.error("Error fetching dashboard data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        if (!currentLocation) return;

        const supabase = createClient();
        const subscription = supabase
            .channel("dashboard_updates")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders",
                    filter: `location_id=eq.${currentLocation.id}`
                },
                () => {
                    fetchData(); // Refresh all data on change
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [currentLocation?.id]);

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertTriangle className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view the dashboard.</p>
                {!isTerminalMode && (
                    <button
                        onClick={() => window.location.href = "/dashboard/locations"}
                        className="btn btn-primary"
                    >
                        Go to Locations
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">{t("nav.dashboard")}</h1>
                <p className="text-slate-400 mt-1">
                    {currentLocation.name} - Welcome back! Here&apos;s what&apos;s happening today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<ClipboardList className="h-5 w-5" />}
                    label="Today's Orders"
                    value={stats.todayOrders.toString()}
                    trend={stats.ordersTrend}
                    trendUp
                />
                <StatCard
                    icon={<DollarSign className="h-5 w-5" />}
                    label="Today's Revenue"
                    value={formatCurrency(stats.todayRevenue)}
                    trend={stats.revenueTrend}
                    trendUp
                />
                <StatCard
                    icon={<Users className="h-5 w-5" />}
                    label="Active Tables"
                    value={`${activeOrders.length}/10`} // Example capacity
                    subtext={`${Math.round((activeOrders.length / 10) * 100)}% capacity`}
                />
                <StatCard
                    icon={<Clock className="h-5 w-5" />}
                    label="Avg. Ticket Time"
                    value={`${stats.avgTicketTime} min`}
                    trend="0 min"
                    trendUp
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Orders */}
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Active Orders</h2>
                        <span className="badge badge-info text-[10px]">{activeOrders.length} open</span>
                    </div>

                    {activeOrders.length > 0 ? (
                        <div className="space-y-1">
                            {activeOrders.slice(0, 5).map(order => (
                                <OrderRow
                                    key={order.id}
                                    table={order.table_number || "TBD"}
                                    items={order.items?.length || 0}
                                    time={new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    status={order.status === 'pending' ? 'sent' : order.status}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                            <ClipboardList className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No active orders</p>
                        </div>
                    )}

                    <button
                        onClick={() => window.location.href = "/dashboard/orders/history"}
                        className="btn btn-ghost w-full mt-4 text-sm"
                    >
                        View All Orders →
                    </button>
                </div>

                {/* Alerts/Info Column */}
                <div className="space-y-4">
                    {/* Server Settlement - Today's Tickets */}
                    <ServerSettlement />

                    {isClockedIn && activeEntry && (
                        <div className="card border-orange-500/50 bg-orange-500/5">
                            <div className="flex items-center gap-2 text-orange-400 mb-2">
                                <Clock className="h-4 w-4" />
                                <h3 className="font-semibold">Shift Info</h3>
                            </div>
                            <p className="text-sm text-slate-300">
                                You are currently clocked in. Your shift started at {new Date(activeEntry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    trend,
    trendUp,
    subtext,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend?: string;
    trendUp?: boolean;
    subtext?: string;
}) {
    return (
        <div className="card">
            <div className="flex items-start justify-between">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                    {icon}
                </div>
                {trend && (
                    <span
                        className={`text-sm font-medium ${trendUp ? "text-green-400" : "text-red-400"
                            }`}
                    >
                        {trend}
                    </span>
                )}
            </div>
            <div className="mt-4">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-slate-400">{label}</p>
                {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
            </div>
        </div>
    );
}

function OrderRow({
    table,
    items,
    time,
    status,
}: {
    table: string;
    items: number;
    time: string;
    status: "sent" | "preparing" | "ready";
}) {
    const statusStyles = {
        sent: "badge-info",
        preparing: "badge-warning",
        ready: "badge-success",
    };

    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
            <div>
                <p className="font-medium">{table}</p>
                <p className="text-sm text-slate-400">{items} items</p>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">{time}</span>
                <span className={`badge ${statusStyles[status]}`}>{status}</span>
            </div>
        </div>
    );
}

function ServerRow({
    name,
    sales,
    orders,
}: {
    name: string;
    sales: string;
    orders: number;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {name.charAt(0)}
                </div>
                <div>
                    <p className="font-medium text-sm">{name}</p>
                    <p className="text-xs text-slate-400">{orders} orders</p>
                </div>
            </div>
            <span className="font-semibold text-green-400">{sales}</span>
        </div>
    );
}
