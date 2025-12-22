"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock, CheckCircle, ChefHat, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock orders for Kitchen Display System
const mockKitchenOrders = [
    {
        id: "1",
        table: "Table 5",
        items: [
            { name: "Classic Burger", quantity: 2, notes: "No onions", status: "preparing" },
            { name: "French Fries", quantity: 2, status: "preparing" },
        ],
        createdAt: new Date(Date.now() - 8 * 60 * 1000),
        status: "preparing",
    },
    {
        id: "2",
        table: "Table 12",
        items: [
            { name: "Grilled Salmon", quantity: 1, status: "pending" },
            { name: "Caesar Salad", quantity: 1, notes: "Dressing on side", status: "pending" },
        ],
        createdAt: new Date(Date.now() - 3 * 60 * 1000),
        status: "sent",
    },
    {
        id: "3",
        table: "Takeout #47",
        items: [
            { name: "Buffalo Wings", quantity: 2, status: "ready" },
            { name: "Loaded Nachos", quantity: 1, status: "ready" },
        ],
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
        status: "ready",
    },
    {
        id: "4",
        table: "Table 8",
        items: [
            { name: "Chocolate Cake", quantity: 2, status: "pending" },
        ],
        createdAt: new Date(Date.now() - 1 * 60 * 1000),
        status: "sent",
    },
];

export default function KitchenPage() {
    const { t } = useTranslation();
    const [orders, setOrders] = useState(mockKitchenOrders);
    const [now, setNow] = useState(new Date());

    // Update time every minute
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const getTicketTime = (createdAt: Date) => {
        const diff = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
        return diff;
    };

    const getTimeColor = (minutes: number) => {
        if (minutes <= 5) return "text-green-400";
        if (minutes <= 10) return "text-amber-400";
        return "text-red-400";
    };

    const markReady = (orderId: string) => {
        setOrders(
            orders.map((o) =>
                o.id === orderId
                    ? { ...o, status: "ready", items: o.items.map((i) => ({ ...i, status: "ready" })) }
                    : o
            )
        );
    };

    const markServed = (orderId: string) => {
        setOrders(orders.filter((o) => o.id !== orderId));
    };

    const pendingOrders = orders.filter((o) => o.status === "sent");
    const preparingOrders = orders.filter((o) => o.status === "preparing");
    const readyOrders = orders.filter((o) => o.status === "ready");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <ChefHat className="h-8 w-8 text-orange-500" />
                        {t("nav.kitchen")}
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Real-time order management
                    </p>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                    <span className="text-lg">{now.toLocaleTimeString()}</span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card text-center">
                    <span className="text-3xl font-bold text-blue-400">{pendingOrders.length}</span>
                    <p className="text-sm text-slate-400 mt-1">{t("kitchen.newOrders")}</p>
                </div>
                <div className="card text-center">
                    <span className="text-3xl font-bold text-amber-400">{preparingOrders.length}</span>
                    <p className="text-sm text-slate-400 mt-1">{t("kitchen.preparing")}</p>
                </div>
                <div className="card text-center">
                    <span className="text-3xl font-bold text-green-400">{readyOrders.length}</span>
                    <p className="text-sm text-slate-400 mt-1">{t("kitchen.ready")}</p>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {orders.map((order) => {
                    const ticketTime = getTicketTime(order.createdAt);
                    const timeColor = getTimeColor(ticketTime);

                    return (
                        <div
                            key={order.id}
                            className={cn(
                                "card border-2 transition-all",
                                order.status === "sent" && "border-blue-500/50 bg-blue-500/5",
                                order.status === "preparing" && "border-amber-500/50 bg-amber-500/5",
                                order.status === "ready" && "border-green-500/50 bg-green-500/5 animate-pulse"
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700">
                                <div>
                                    <h3 className="font-bold text-lg">{order.table}</h3>
                                    <span
                                        className={cn(
                                            "badge",
                                            order.status === "sent" && "badge-info",
                                            order.status === "preparing" && "badge-warning",
                                            order.status === "ready" && "badge-success"
                                        )}
                                    >
                                        {order.status}
                                    </span>
                                </div>
                                <div className={cn("flex items-center gap-1 font-mono font-bold", timeColor)}>
                                    <Clock className="h-4 w-4" />
                                    <span>{ticketTime}m</span>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-2 mb-4">
                                {order.items.map((item, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <span className="font-bold text-orange-400">{item.quantity}x</span>
                                        <div className="flex-1">
                                            <p className="font-medium">{item.name}</p>
                                            {item.notes && (
                                                <p className="text-sm text-amber-400">⚠ {item.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                {order.status === "sent" && (
                                    <button
                                        onClick={() => {
                                            setOrders(
                                                orders.map((o) =>
                                                    o.id === order.id ? { ...o, status: "preparing" } : o
                                                )
                                            );
                                        }}
                                        className="btn-secondary flex-1"
                                    >
                                        Start
                                    </button>
                                )}
                                {order.status === "preparing" && (
                                    <button
                                        onClick={() => markReady(order.id)}
                                        className="btn-success flex-1"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        {t("kitchen.markReady")}
                                    </button>
                                )}
                                {order.status === "ready" && (
                                    <button
                                        onClick={() => markServed(order.id)}
                                        className="btn-primary flex-1"
                                    >
                                        <Bell className="h-4 w-4" />
                                        {t("kitchen.markServed")}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {orders.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500">
                        <ChefHat className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No orders in queue</p>
                        <p className="text-sm">New orders will appear here automatically</p>
                    </div>
                )}
            </div>
        </div>
    );
}
