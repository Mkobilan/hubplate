"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock, CheckCircle, ChefHat, Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";

interface KitchenOrderItem {
    name: string;
    quantity: number;
    notes?: string;
    status: string;
    isEdited?: boolean;
}

interface KitchenOrder {
    id: string;
    table: string;
    serverName: string;
    orderType: string;
    items: KitchenOrderItem[];
    createdAt: Date;
    status: string;
    isEdited?: boolean;
}

export default function KitchenPage() {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());

    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const fetchOrders = async () => {
        if (!currentLocation?.id) return;

        try {
            // Fetch active orders (not served)
            const { data: ordersData, error: ordersError } = await supabase
                .from("orders")
                .select(`
                    id,
                    table_number,
                    status,
                    order_type,
                    created_at,
                    is_edited,
                    server:employees(first_name, last_name),
                    order_items (
                        id,
                        name,
                        quantity,
                        notes,
                        is_edited
                    )
                `)
                .eq("location_id", currentLocation.id)
                .in("status", ["pending", "in_progress", "ready"])
                .order("created_at", { ascending: true });

            if (ordersError) throw ordersError;

            const formattedOrders: KitchenOrder[] = (ordersData || []).map((o: any) => {
                let title = `Table ${o.table_number}`;
                if (o.order_type === 'takeout') title = 'Takeout';
                if (o.order_type === 'delivery') title = 'Delivery';

                return {
                    id: o.id,
                    table: title,
                    orderType: o.order_type,
                    serverName: o.server ? `${o.server.first_name} ${o.server.last_name.charAt(0)}.` : "System",
                    status: o.status,
                    createdAt: new Date(o.created_at),
                    isEdited: o.is_edited,
                    items: o.order_items.map((oi: any) => ({
                        name: oi.name || "Unknown Item",
                        quantity: oi.quantity,
                        notes: oi.notes,
                        status: o.status,
                        isEdited: oi.is_edited
                    }))
                };
            });

            setOrders(formattedOrders);
        } catch (error) {
            console.error("Error fetching kitchen orders:", error);
            toast.error("Failed to load kitchen orders");
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and subscription
    useEffect(() => {
        if (!currentLocation?.id) return;

        fetchOrders();

        const channel = supabase
            .channel("kitchen-orders")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders",
                    filter: `location_id=eq.${currentLocation.id}`
                },
                () => {
                    fetchOrders();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentLocation?.id]);

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

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const updateData: any = { status: newStatus };

            // Set completed_at when the kitchen marks the order as ready
            if (newStatus === 'ready') {
                updateData.completed_at = new Date().toISOString();
            }

            const { error } = await (supabase
                .from("orders") as any)
                .update(updateData)
                .eq("id", orderId);

            if (error) throw error;
            toast.success(`Order ${newStatus}`);
            fetchOrders();
        } catch (error) {
            console.error("Error updating order:", error);
            toast.error("Failed to update status");
        }
    };

    const markServed = (orderId: string) => {
        updateOrderStatus(orderId, "served");
    };

    const pendingOrders = orders.filter((o) => o.status === "pending");
    const preparingOrders = orders.filter((o) => o.status === "in_progress");
    const readyOrders = orders.filter((o) => o.status === "ready");

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
                <p className="text-slate-400">Loading order queue...</p>
            </div>
        );
    }

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
                                order.status === "pending" && "border-blue-500/50 bg-blue-500/5",
                                order.status === "in_progress" && "border-amber-500/50 bg-amber-500/5",
                                order.status === "ready" && "border-green-500/50 bg-green-500/5 animate-pulse"
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg">{order.table}</h3>
                                        {order.serverName && (
                                            <span className="text-xs text-slate-400 font-medium">
                                                • {order.serverName}
                                            </span>
                                        )}
                                        {order.isEdited && (
                                            <span className="text-red-500 font-black text-xs animate-pulse ring-1 ring-red-500 px-1 rounded">
                                                [EDITED]
                                            </span>
                                        )}
                                    </div>
                                    <span
                                        className={cn(
                                            "badge",
                                            order.status === "pending" && "badge-info",
                                            order.status === "in_progress" && "badge-warning",
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
                                                <p className="text-sm text-amber-400 font-medium">⚠ {item.notes}</p>
                                            )}
                                            {item.isEdited && (
                                                <span className="text-[10px] font-bold text-red-500 uppercase tracking-tight bg-red-500/10 px-1 rounded border border-red-500/20 w-fit">
                                                    Modified
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                {order.status === "pending" && (
                                    <button
                                        onClick={() => updateOrderStatus(order.id, "in_progress")}
                                        className="btn-secondary flex-1"
                                    >
                                        Start
                                    </button>
                                )}
                                {order.status === "in_progress" && (
                                    <button
                                        onClick={() => updateOrderStatus(order.id, "ready")}
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
