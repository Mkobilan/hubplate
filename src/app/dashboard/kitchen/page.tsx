"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Clock, CheckCircle, ChefHat, Bell, Loader2, Plus, ChevronLeft, ChevronRight, Settings, Trash2, X, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";

interface KitchenOrderItem {
    id: string;  // order_item id for updating
    name: string;
    quantity: number;
    notes?: string;
    status: string;  // 'pending' | 'preparing' | 'ready' | 'served'
    isEdited?: boolean;
    menuItemId?: string;
    seatNumber?: number;
}

interface KitchenOrder {
    id: string;
    table: string;
    serverName: string;
    orderType: string;
    items: KitchenOrderItem[];
    createdAt: Date;
    status: string;  // Derived from items
    isEdited?: boolean;
}

interface KdsScreen {
    id: string;
    name: string;
    display_order: number;
    is_default: boolean;
}

// Management roles that can add/edit KDS screens
const MANAGEMENT_ROLES = ["manager", "owner"];

export default function KitchenPage() {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());

    // KDS Screen state
    const [kdsScreens, setKdsScreens] = useState<KdsScreen[]>([]);
    const [activeKdsScreenId, setActiveKdsScreenId] = useState<string | null>(null);
    const [showAddKdsModal, setShowAddKdsModal] = useState(false);
    const [showManageKdsModal, setShowManageKdsModal] = useState(false);
    const [menuItemKdsMap, setMenuItemKdsMap] = useState<Map<string, string[]>>(new Map());
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    const currentLocation = useAppStore((state) => state.currentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const isTerminalMode = useAppStore((state) => state.isTerminalMode);
    const supabase = createClient();

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Check if current user can manage KDS screens
    const canManageKds = isTerminalMode
        ? (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role))
        : isOrgOwner || (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role));

    // Fetch KDS screens
    const fetchKdsScreens = async () => {
        if (!currentLocation?.id) return;

        try {
            const { data, error } = await (supabase
                .from("kds_screens") as any)
                .select("*")
                .eq("location_id", currentLocation.id)
                .eq("is_active", true)
                .order("display_order", { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                setKdsScreens(data);
                const defaultScreen = data.find((s: KdsScreen) => s.is_default);
                if (!activeKdsScreenId) {
                    setActiveKdsScreenId(defaultScreen?.id || data[0].id);
                }
            } else {
                setKdsScreens([]);
                setActiveKdsScreenId(null);
            }
        } catch (error) {
            console.error("Error fetching KDS screens:", error);
        }
    };

    // Fetch menu item to KDS screen mappings
    const fetchMenuItemKdsMappings = async () => {
        if (!currentLocation?.id) return;

        try {
            const { data, error } = await (supabase
                .from("menu_item_kds_assignments") as any)
                .select(`
                    menu_item_id,
                    kds_screen_id,
                    menu_items!inner(location_id)
                `)
                .eq("menu_items.location_id", currentLocation.id);

            if (error) throw error;

            const map = new Map<string, string[]>();
            (data || []).forEach((item: any) => {
                const existing = map.get(item.menu_item_id) || [];
                existing.push(item.kds_screen_id);
                map.set(item.menu_item_id, existing);
            });
            setMenuItemKdsMap(map);
        } catch (error) {
            console.error("Error fetching KDS mappings:", error);
        }
    };

    // Derive order status from item statuses
    const deriveOrderStatus = (items: KitchenOrderItem[]): string => {
        if (items.length === 0) return 'pending';

        const allServed = items.every(item => item.status === 'served');
        if (allServed) return 'served';

        const allReady = items.every(item => item.status === 'ready' || item.status === 'served');
        if (allReady) return 'ready';

        const anyPreparing = items.some(item => item.status === 'preparing');
        const anyReady = items.some(item => item.status === 'ready');
        if (anyPreparing || anyReady) return 'in_progress';

        return 'pending';
    };

    const fetchOrders = async () => {
        if (!currentLocation?.id) return;

        try {
            // Fetch active orders with consolidated item details
            const { data: ordersData, error: ordersError } = await supabase
                .from("orders")
                .select(`
                    id,
                    table_number,
                    status,
                    order_type,
                    created_at,
                    is_edited,
                    items,
                    server:employees(first_name, last_name)
                `)
                .eq("location_id", currentLocation.id)
                .in("status", ["pending", "in_progress", "ready"])
                .order("created_at", { ascending: true });

            if (ordersError) throw ordersError;

            const formattedOrders: KitchenOrder[] = (ordersData || []).map((o: any) => {
                let title = `Table ${o.table_number}`;
                if (o.order_type === 'takeout') title = 'Takeout';
                if (o.order_type === 'delivery') title = 'Delivery';

                const items: KitchenOrderItem[] = (o.items || []).map((oi: any) => ({
                    id: oi.id,
                    name: oi.name || "Unknown Item",
                    quantity: oi.quantity,
                    notes: oi.notes,
                    status: oi.status || 'pending',
                    isEdited: oi.is_edited,
                    menuItemId: oi.menu_item_id,
                    seatNumber: oi.seat_number
                }));

                return {
                    id: o.id,
                    table: title,
                    orderType: o.order_type,
                    serverName: o.server ? `${o.server.first_name} ${o.server.last_name.charAt(0)}.` : "System",
                    status: deriveOrderStatus(items),
                    createdAt: new Date(o.created_at),
                    isEdited: o.is_edited,
                    items
                };
            });

            // Filter out orders where all items are served
            const activeOrders = formattedOrders.filter(o => o.status !== 'served');
            setOrders(activeOrders);
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

        fetchKdsScreens();
        fetchMenuItemKdsMappings();
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
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "kds_screens",
                    filter: `location_id=eq.${currentLocation.id}`
                },
                () => {
                    fetchKdsScreens();
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

    // Update status for specific items within the orders.items JSONB column
    const updateItemsStatus = async (orderId: string, itemIds: string[], newStatus: string) => {
        try {
            // 1. Fetch current order to get items array
            const { data: order, error: fetchError } = await (supabase
                .from("orders") as any)
                .select("items, server_id, table_number")
                .eq("id", orderId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Update status in the JSONB array
            const updatedItems = (order.items || []).map((item: any) => {
                if (itemIds.includes(item.id)) {
                    const updatedItem = { ...item, status: newStatus };

                    // Add timestamps based on new status
                    if (newStatus === 'preparing' && !item.started_at) {
                        updatedItem.started_at = new Date().toISOString();
                    } else if (newStatus === 'ready' && !item.ready_at) {
                        updatedItem.ready_at = new Date().toISOString();
                    } else if (newStatus === 'served' && !item.served_at) {
                        updatedItem.served_at = new Date().toISOString();
                    }

                    return updatedItem;
                }
                return item;
            });

            // 3. Derive order-level status
            const derivedStatus = deriveOrderStatus(updatedItems);
            let orderStatus = derivedStatus;
            if (derivedStatus === 'preparing') orderStatus = 'in_progress';

            const updateData: any = {
                items: updatedItems,
                status: orderStatus
            };

            if (orderStatus === 'ready') {
                updateData.completed_at = new Date().toISOString();
            }

            // 4. Update the order
            const { error: updateError } = await (supabase
                .from("orders") as any)
                .update(updateData)
                .eq("id", orderId);

            if (updateError) throw updateError;

            // Notify server if ready
            if (newStatus === 'ready' && order.server_id && currentLocation?.id) {
                await (supabase.from("notifications") as any).insert({
                    recipient_id: order.server_id,
                    location_id: currentLocation.id,
                    type: 'order_ready',
                    title: 'Order Ready',
                    message: `Order for ${order.table_number ? 'Table ' + order.table_number : 'Takeout/Delivery'} is ready!`,
                    link: '/dashboard/orders',
                    is_read: false
                });
            }

            toast.success(`Items marked as ${newStatus}`);
            fetchOrders();
        } catch (error) {
            console.error("Error updating item status:", error);
            toast.error("Failed to update status");
        }
    };


    // Handle Start button - mark visible items as 'preparing'
    const handleStartItems = (orderId: string, visibleItems: KitchenOrderItem[]) => {
        const pendingItems = visibleItems.filter(item => item.status === 'pending');
        if (pendingItems.length === 0) return;

        const itemIds = pendingItems.map(item => item.id);
        updateItemsStatus(orderId, itemIds, 'preparing');
    };

    // Handle Ready button - mark visible items as 'ready'
    const handleReadyItems = (orderId: string, visibleItems: KitchenOrderItem[]) => {
        const preparingItems = visibleItems.filter(item => item.status === 'preparing');
        if (preparingItems.length === 0) return;

        const itemIds = preparingItems.map(item => item.id);
        updateItemsStatus(orderId, itemIds, 'ready');
    };

    // Handle Served button - mark visible items as 'served'
    const handleServedItems = (orderId: string, visibleItems: KitchenOrderItem[]) => {
        const readyItems = visibleItems.filter(item => item.status === 'ready');
        if (readyItems.length === 0) return;

        const itemIds = readyItems.map(item => item.id);
        updateItemsStatus(orderId, itemIds, 'served');
    };

    // Filter orders based on active KDS screen
    const getFilteredOrders = () => {
        if (!activeKdsScreenId || kdsScreens.length === 0) {
            return orders;
        }

        const activeScreen = kdsScreens.find(s => s.id === activeKdsScreenId);

        return orders.map(order => {
            const filteredItems = order.items.filter(item => {
                // Skip items already served on this screen, EXCEPT for the Main Kitchen KDS
                if (item.status === 'served' && !activeScreen?.is_default) return false;

                if (!item.menuItemId) {
                    return activeScreen?.is_default === true;
                }

                const assignedScreens = menuItemKdsMap.get(item.menuItemId);

                if (!assignedScreens || assignedScreens.length === 0) {
                    return activeScreen?.is_default === true;
                }

                return assignedScreens.includes(activeKdsScreenId);
            });

            // Derive status from only the filtered (visible) items for this screen
            const screenStatus = deriveOrderStatus(filteredItems);

            return {
                ...order,
                items: filteredItems,
                status: screenStatus  // Status for THIS screen's items
            };
        }).filter(order => order.items.length > 0);
    };

    const filteredOrders = getFilteredOrders();
    const pendingOrders = filteredOrders.filter((o) => o.status === "pending");
    const preparingOrders = filteredOrders.filter((o) => o.status === "in_progress" || o.status === "preparing");
    const readyOrders = filteredOrders.filter((o) => o.status === "ready");

    // Horizontal scroll handlers
    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    // Get item status badge
    const getItemStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold uppercase tracking-wider">Pending</span>;
            case 'preparing':
                return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold uppercase tracking-wider animate-pulse">Cooking</span>;
            case 'ready':
                return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-semibold uppercase tracking-wider">Ready</span>;
            case 'served':
                return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 font-semibold uppercase tracking-wider">Served</span>;
            default:
                return null;
        }
    };

    // Determine which button to show based on item statuses
    const getActionButton = (order: KitchenOrder) => {
        const pendingCount = order.items.filter(i => i.status === 'pending').length;
        const preparingCount = order.items.filter(i => i.status === 'preparing').length;
        const readyCount = order.items.filter(i => i.status === 'ready').length;

        if (pendingCount > 0) {
            return (
                <button
                    onClick={() => handleStartItems(order.id, order.items)}
                    className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                    <PlayCircle className="h-4 w-4" />
                    Start ({pendingCount})
                </button>
            );
        }

        if (preparingCount > 0) {
            return (
                <button
                    onClick={() => handleReadyItems(order.id, order.items)}
                    className="btn btn-success flex-1 flex items-center justify-center gap-2"
                >
                    <CheckCircle className="h-4 w-4" />
                    Ready ({preparingCount})
                </button>
            );
        }

        if (readyCount > 0) {
            return (
                <button
                    onClick={() => handleServedItems(order.id, order.items)}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                    <Bell className="h-4 w-4" />
                    Served ({readyCount})
                </button>
            );
        }

        return null;
    };

    // Get card border color based on items' statuses
    const getCardStyle = (order: KitchenOrder) => {
        const hasPending = order.items.some(i => i.status === 'pending');
        const hasPreparing = order.items.some(i => i.status === 'preparing');
        const allReady = order.items.every(i => i.status === 'ready');

        if (allReady) return "border-green-500/50 bg-green-500/5 animate-pulse";
        if (hasPreparing) return "border-amber-500/50 bg-amber-500/5";
        if (hasPending) return "border-blue-500/50 bg-blue-500/5";
        return "border-slate-700";
    };

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
                        {activeKdsScreenId && kdsScreens.length > 0 && (
                            <span className="text-lg font-normal text-slate-400">
                                — {kdsScreens.find(s => s.id === activeKdsScreenId)?.name}
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Real-time order management • Item-level tracking
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {canManageKds && (
                        <>
                            <button
                                onClick={() => setShowAddKdsModal(true)}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add KDS
                            </button>
                            {kdsScreens.length > 0 && (
                                <button
                                    onClick={() => setShowManageKdsModal(true)}
                                    className="btn btn-secondary flex items-center gap-2"
                                >
                                    <Settings className="h-4 w-4" />
                                    Manage
                                </button>
                            )}
                        </>
                    )}
                    <span className="text-lg text-slate-400">{now.toLocaleTimeString()}</span>
                </div>
            </div>

            {/* KDS Screen Tabs */}
            {kdsScreens.length > 0 && (
                <div className="flex items-center gap-2 border-b border-slate-700 pb-2 overflow-x-auto">
                    {kdsScreens.map((screen) => (
                        <button
                            key={screen.id}
                            onClick={() => setActiveKdsScreenId(screen.id)}
                            className={cn(
                                "px-4 py-2 rounded-t-lg font-medium transition-all whitespace-nowrap",
                                activeKdsScreenId === screen.id
                                    ? "bg-orange-500 text-white"
                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            )}
                        >
                            {screen.name}
                            {screen.is_default && <span className="ml-1 text-xs opacity-70">(Main)</span>}
                        </button>
                    ))}
                </div>
            )}

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

            {/* Orders Grid with Horizontal Scroll */}
            <div className="relative">
                <button
                    onClick={scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 p-2 rounded-full shadow-lg"
                >
                    <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                    onClick={scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 p-2 rounded-full shadow-lg"
                >
                    <ChevronRight className="h-6 w-6" />
                </button>

                <div
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto pb-4 px-8 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {filteredOrders.map((order) => {
                        const ticketTime = getTicketTime(order.createdAt);
                        const timeColor = getTimeColor(ticketTime);

                        return (
                            <div
                                key={order.id}
                                className={cn(
                                    "card border-2 transition-all min-w-[320px] max-w-[380px] flex-shrink-0 flex flex-col shadow-xl",
                                    getCardStyle(order)
                                )}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-700/50">
                                    <div>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-xl tracking-tight text-white">{order.table}</h3>
                                                {order.isEdited && (
                                                    <span className="text-red-500 font-black text-[10px] ring-1 ring-red-500 px-1.5 rounded bg-red-500/10 animate-pulse">
                                                        [EDITED]
                                                    </span>
                                                )}
                                            </div>
                                            {order.serverName && (
                                                <span className="text-sm text-slate-400 font-medium">
                                                    Served by {order.serverName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={cn("flex items-center gap-1.5 font-mono font-bold text-lg px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50", timeColor)}>
                                        <Clock className="h-4 w-4" />
                                        <span>{ticketTime}m</span>
                                    </div>
                                </div>

                                {/* Items with individual status badges */}
                                <div className="flex-1 space-y-3 mb-6">
                                    {order.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "flex flex-col gap-2 p-2 rounded-xl transition-all cursor-pointer border-2",
                                                selectedItemId === item.id
                                                    ? "bg-orange-500/10 border-orange-500/40 shadow-inner"
                                                    : "border-transparent hover:bg-slate-700/30"
                                            )}
                                            onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                                        >
                                            <div className="flex items-start gap-3 group">
                                                <div className={cn(
                                                    "flex items-center justify-center min-w-[2.5rem] h-[2.5rem] rounded-xl font-bold text-lg border transition-colors",
                                                    selectedItemId === item.id
                                                        ? "bg-orange-500 text-white border-orange-400"
                                                        : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                                )}>
                                                    {item.quantity}
                                                </div>
                                                <div className="flex-1 pt-1">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <p className="font-bold text-slate-100 text-lg leading-tight">{item.name}</p>
                                                        {item.seatNumber && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold">
                                                                S{item.seatNumber}
                                                            </span>
                                                        )}
                                                        {getItemStatusBadge(item.status)}
                                                    </div>
                                                    {item.notes && (
                                                        <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                                            <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 italic">
                                                                <Bell className="h-3 w-3" /> {item.notes}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {item.isEdited && (
                                                        <span className="mt-1.5 inline-block text-[10px] font-bold text-red-500 uppercase tracking-tighter bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                                            Modified
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Item-Level Actions */}
                                            {selectedItemId === item.id && (
                                                <div className="flex gap-2 p-1 animate-in slide-in-from-top-2 duration-200">
                                                    {item.status === 'pending' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateItemsStatus(order.id, [item.id], 'preparing');
                                                                setSelectedItemId(null);
                                                            }}
                                                            className="btn btn-secondary btn-sm flex-1 py-2 font-bold"
                                                        >
                                                            <PlayCircle className="h-4 w-4 mr-2" /> Start Item
                                                        </button>
                                                    )}
                                                    {(item.status === 'preparing' || item.status === 'pending') && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateItemsStatus(order.id, [item.id], 'ready');
                                                                setSelectedItemId(null);
                                                            }}
                                                            className="btn btn-success btn-sm flex-1 py-2 font-bold"
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-2" /> Mark Ready
                                                        </button>
                                                    )}
                                                    {item.status === 'ready' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateItemsStatus(order.id, [item.id], 'served');
                                                                setSelectedItemId(null);
                                                            }}
                                                            className="btn btn-primary btn-sm flex-1 py-2 font-bold"
                                                        >
                                                            <Bell className="h-4 w-4 mr-2" /> Serve Item
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Dynamic Action Button */}
                                <div className="flex gap-2">
                                    {getActionButton(order)}
                                </div>
                            </div>
                        );
                    })}

                    {filteredOrders.length === 0 && (
                        <div className="w-full text-center py-12 text-slate-500">
                            <ChefHat className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No orders in queue</p>
                            <p className="text-sm">New orders will appear here automatically</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add KDS Modal */}
            {showAddKdsModal && (
                <AddKdsModal
                    onClose={() => setShowAddKdsModal(false)}
                    onSuccess={() => {
                        fetchKdsScreens();
                        setShowAddKdsModal(false);
                    }}
                    isFirstScreen={kdsScreens.length === 0}
                />
            )}

            {/* Manage KDS Modal */}
            {showManageKdsModal && (
                <ManageKdsModal
                    screens={kdsScreens}
                    onClose={() => setShowManageKdsModal(false)}
                    onSuccess={() => {
                        fetchKdsScreens();
                    }}
                    activeScreenId={activeKdsScreenId}
                    setActiveScreenId={setActiveKdsScreenId}
                />
            )}
        </div>
    );
}

// Add KDS Modal Component
function AddKdsModal({
    onClose,
    onSuccess,
    isFirstScreen
}: {
    onClose: () => void;
    onSuccess: () => void;
    isFirstScreen: boolean;
}) {
    const [name, setName] = useState("");
    const [isDefault, setIsDefault] = useState(isFirstScreen);
    const [loading, setLoading] = useState(false);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !currentLocation?.id) return;

        setLoading(true);
        try {
            const { error } = await (supabase
                .from("kds_screens") as any)
                .insert({
                    location_id: currentLocation.id,
                    name: name.trim(),
                    is_default: isDefault,
                    display_order: 0
                });

            if (error) throw error;

            toast.success(`KDS screen "${name}" created!`);
            onSuccess();
        } catch (error) {
            console.error("Error creating KDS screen:", error);
            toast.error("Failed to create KDS screen");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative card w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Add KDS Screen</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Screen Name</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g., Bar, Fryer, Salad"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isDefault"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <label htmlFor="isDefault" className="text-sm text-slate-300">
                            Set as Main Kitchen (items without assignments appear here)
                        </label>
                    </div>
                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary flex-1">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Manage KDS Modal Component
function ManageKdsModal({
    screens,
    onClose,
    onSuccess,
    activeScreenId,
    setActiveScreenId
}: {
    screens: KdsScreen[];
    onClose: () => void;
    onSuccess: () => void;
    activeScreenId: string | null;
    setActiveScreenId: (id: string | null) => void;
}) {
    const [loading, setLoading] = useState<string | null>(null);
    const supabase = createClient();

    const handleDelete = async (screenId: string, screenName: string) => {
        if (!confirm(`Are you sure you want to delete "${screenName}"? This will remove KDS assignments from menu items.`)) {
            return;
        }

        setLoading(screenId);
        try {
            const { error } = await (supabase
                .from("kds_screens") as any)
                .delete()
                .eq("id", screenId);

            if (error) throw error;

            toast.success(`KDS screen "${screenName}" deleted`);

            if (activeScreenId === screenId) {
                const remaining = screens.filter(s => s.id !== screenId);
                setActiveScreenId(remaining.length > 0 ? remaining[0].id : null);
            }

            onSuccess();
        } catch (error) {
            console.error("Error deleting KDS screen:", error);
            toast.error("Failed to delete KDS screen");
        } finally {
            setLoading(null);
        }
    };

    const handleSetDefault = async (screenId: string) => {
        setLoading(screenId);
        try {
            const locationId = screens[0] ? (screens[0] as any).location_id : null;

            if (locationId) {
                await (supabase
                    .from("kds_screens") as any)
                    .update({ is_default: false })
                    .eq("location_id", locationId);
            }

            const { error } = await (supabase
                .from("kds_screens") as any)
                .update({ is_default: true })
                .eq("id", screenId);

            if (error) throw error;

            toast.success("Default KDS screen updated");
            onSuccess();
        } catch (error) {
            console.error("Error setting default KDS screen:", error);
            toast.error("Failed to update default");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative card w-full max-w-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Manage KDS Screens</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {screens.map((screen) => (
                        <div
                            key={screen.id}
                            className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-medium">{screen.name}</span>
                                {screen.is_default && (
                                    <span className="badge badge-success text-xs">Main</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {!screen.is_default && (
                                    <button
                                        onClick={() => handleSetDefault(screen.id)}
                                        disabled={loading === screen.id}
                                        className="text-sm text-slate-400 hover:text-orange-400"
                                    >
                                        Set as Main
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(screen.id, screen.name)}
                                    disabled={loading === screen.id}
                                    className="text-red-400 hover:text-red-300 p-1"
                                >
                                    {loading === screen.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-4 mt-4 border-t border-slate-700">
                    <button onClick={onClose} className="btn btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
