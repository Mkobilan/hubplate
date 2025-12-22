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

export default function DashboardPage() {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">{t("nav.dashboard")}</h1>
                <p className="text-slate-400 mt-1">
                    Welcome back! Here&apos;s what&apos;s happening today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<ClipboardList className="h-5 w-5" />}
                    label="Today's Orders"
                    value="0"
                    trend="0%"
                    trendUp
                />
                <StatCard
                    icon={<DollarSign className="h-5 w-5" />}
                    label="Today's Revenue"
                    value={formatCurrency(0)}
                    trend="0%"
                    trendUp
                />
                <StatCard
                    icon={<Users className="h-5 w-5" />}
                    label="Active Tables"
                    value="0/0"
                    subtext="0% capacity"
                />
                <StatCard
                    icon={<Clock className="h-5 w-5" />}
                    label="Avg. Ticket Time"
                    value="0 min"
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
                        <span className="badge badge-info text-[10px]">0 open</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        <ClipboardList className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">No active orders</p>
                    </div>
                    <button className="btn-ghost w-full mt-4 text-sm">
                        View All Orders →
                    </button>
                </div>

                {/* Alerts & Quick Actions */}
                <div className="space-y-4">
                    {/* 86'd Items Alert */}
                    <div className="card border-slate-800 bg-slate-900/20">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-300">86&apos;d Items</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    All items are currently available
                                </p>
                                <button className="text-sm text-orange-500 hover:underline mt-2">
                                    Manage Menu →
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="card">
                        <h3 className="font-semibold mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button className="btn-primary text-sm py-2">New Order</button>
                            <button className="btn-secondary text-sm py-2">Takeout</button>
                            <button className="btn-secondary text-sm py-2">View Kitchen</button>
                            <button className="btn-secondary text-sm py-2">Clock In</button>
                        </div>
                    </div>

                    {/* Top Servers */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Top Servers Today</h3>
                            <Users className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="text-center py-6 text-slate-500 text-sm">
                            <p>No activity yet</p>
                        </div>
                    </div>
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
