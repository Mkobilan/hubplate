"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Clock, CheckCircle, ChefHat, Bell, Loader2, Plus, ChevronLeft, ChevronRight, Settings, Trash2, X } from "lucide-react";
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
    menuItemId?: string;
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

    const currentLocation = useAppStore((state) => state.currentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const supabase = createClient();

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Check if current user can manage KDS screens
    const canManageKds = isOrgOwner || (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role));

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

            // If no screens exist, we'll show the default "Kitchen" behavior
            if (data && data.length > 0) {
                setKdsScreens(data);
                // Set active to default screen if exists, otherwise first screen
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

            // Build a map: menuItemId -> [kdsScreenIds]
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
                        is_edited,
                        menu_item_id
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
                        isEdited: oi.is_edited,
                        menuItemId: oi.menu_item_id
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

    // Filter orders based on active KDS screen
    const getFilteredOrders = () => {
        if (!activeKdsScreenId || kdsScreens.length === 0) {
            // No KDS screens configured - show all orders
            return orders;
        }

        const activeScreen = kdsScreens.find(s => s.id === activeKdsScreenId);

        return orders.map(order => {
            // Filter items that belong to this KDS screen
            const filteredItems = order.items.filter(item => {
                if (!item.menuItemId) {
                    // Items without menu_item_id - show on default screen only
                    return activeScreen?.is_default === true;
                }

                const assignedScreens = menuItemKdsMap.get(item.menuItemId);

                if (!assignedScreens || assignedScreens.length === 0) {
                    // No KDS assignment - show on default (Main Kitchen) screen only
                    return activeScreen?.is_default === true;
                }

                // Show if this item is assigned to the active screen
                return assignedScreens.includes(activeKdsScreenId);
            });

            return {
                ...order,
                items: filteredItems
            };
        }).filter(order => order.items.length > 0); // Only show orders that have items for this screen
    };

    const filteredOrders = getFilteredOrders();
    const pendingOrders = filteredOrders.filter((o) => o.status === "pending");
    const preparingOrders = filteredOrders.filter((o) => o.status === "in_progress");
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
                {/* Scroll Left Button */}
                <button
                    onClick={scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 p-2 rounded-full shadow-lg"
                >
                    <ChevronLeft className="h-6 w-6" />
                </button>

                {/* Scroll Right Button */}
                <button
                    onClick={scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 p-2 rounded-full shadow-lg"
                >
                    <ChevronRight className="h-6 w-6" />
                </button>

                {/* Scrollable Container */}
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
                                    "card border-2 transition-all min-w-[300px] max-w-[350px] flex-shrink-0",
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

            // If we deleted the active screen, switch to another
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
            // First, unset all defaults for this location
            const locationId = screens[0] ? (screens[0] as any).location_id : null;

            if (locationId) {
                await (supabase
                    .from("kds_screens") as any)
                    .update({ is_default: false })
                    .eq("location_id", locationId);
            }

            // Set the new default
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
