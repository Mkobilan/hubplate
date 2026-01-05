"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
    Plus,
    Minus,
    Send,
    Trash2,
    Sparkles,
    Clock,
    DollarSign,
    X,
    Pencil,
    LayoutList,
    Receipt,
    Split,
    Loader2,
    Zap,
    TrendingUp,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { MenuItemType, OrderItem } from "@/types/pos";

import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { Suspense } from "react";
import MyTicketsModal from "./components/MyTicketsModal";
import CloseTicketModal from "./components/CloseTicketModal";
import SplitCheckModal from "./components/SplitCheckModal";


function OrdersPageContent() {
    const searchParams = useSearchParams();
    const tableFromUrl = searchParams.get("table");

    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState("");
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [tableNumber, setTableNumber] = useState(tableFromUrl || "");
    const [orderType, setOrderType] = useState<"dine_in" | "takeout" | "delivery">("dine_in");
    const [upsellSuggestions, setUpsellSuggestions] = useState<any[]>([]);
    const [showUpsells, setShowUpsells] = useState(false);
    const [customizingItem, setCustomizingItem] = useState<MenuItemType | null>(null);
    const [editingTicketItem, setEditingTicketItem] = useState<OrderItem | null>(null);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [showMyTickets, setShowMyTickets] = useState(false);
    const [showCloseTicket, setShowCloseTicket] = useState(false);
    const [showSplitCheck, setShowSplitCheck] = useState(false);
    const [selectedSeat, setSelectedSeat] = useState(1);
    const [tableCapacity, setTableCapacity] = useState(4); // Default to 4
    const [deliveryFee, setDeliveryFee] = useState(0);

    const [categories, setCategories] = useState<string[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
    const [pricingRules, setPricingRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const currentLocation = useAppStore((state) => state.currentLocation);
    const setCurrentLocation = useAppStore((state) => state.setCurrentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const supabase = createClient();

    useEffect(() => {
        const fetchMenuData = async () => {
            if (!currentLocation?.id) return;

            setLoading(true);
            setSelectedCategory(""); // Reset category on location change
            setOrderItems([]);       // Clear active ticket
            setActiveOrderId(null);

            try {
                // Fetch categories
                const { data: cats } = await supabase
                    .from("menu_categories")
                    .select("name")
                    .eq("location_id", currentLocation.id)
                    .eq("is_active", true) as any;

                const catNames = (cats as any[])?.map(c => c.name) || [];

                // Fetch menu items
                const { data: items } = await supabase
                    .from("menu_items")
                    .select("id, name, price, description, category_id, is_86d, location_id, category:menu_categories(name)")
                    .eq("location_id", currentLocation.id)
                    .order("name") as any;

                const menuItemsData = (items || []) as MenuItemType[];
                setMenuItems(menuItemsData);

                // Add "Uncategorized" if there are items without a category
                const hasUncategorized = menuItemsData.some(item => !item.category?.name);
                const finalCategories = hasUncategorized && !catNames.includes("Uncategorized")
                    ? ["Uncategorized", ...catNames]
                    : catNames;

                setCategories(finalCategories);

                if (finalCategories.length > 0) {
                    setSelectedCategory(finalCategories[0]);
                }

                // Fetch active pricing rules
                const { data: rules } = await supabase.rpc('get_active_pricing_rules', {
                    p_location_id: currentLocation.id
                });
                setPricingRules(rules || []);
            } catch (error) {
                console.error("Error fetching menu data:", error);
                toast.error("Failed to load menu");
            } finally {
                setLoading(false);
            }
        };

        fetchMenuData();
    }, [currentLocation?.id]);

    // Refresh location data to ensure we have the latest tax rate and other settings
    useEffect(() => {
        const refreshLocation = async () => {
            if (!currentLocation?.id) return;
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from("locations")
                    .select("*")
                    .eq("id", currentLocation.id)
                    .single();

                if (data && !error) {
                    setCurrentLocation(data);
                }
            } catch (err) {
                console.error("Error refreshing location:", err);
            }
        };

        // Only refresh if we haven't refreshed in this session or if tax_rate is missing
        if (currentLocation?.id && (currentLocation.tax_rate === undefined || currentLocation.tax_rate === null)) {
            refreshLocation();
        }
    }, [currentLocation?.id, currentLocation?.tax_rate]);

    const availableItems = menuItems.filter(
        (item) => (item.category?.name || "Uncategorized") === selectedCategory
    );

    // Dynamic Pricing Logic
    const getAdjustedPrice = (item: MenuItemType) => {
        let adjustedPrice = item.price;
        let appliedRule: any = null;

        for (const rule of pricingRules) {
            const appliesToCategory = (rule.category_ids || []).length === 0 || rule.category_ids.includes(item.category_id);
            if (appliesToCategory) {
                appliedRule = rule;
                if (rule.rule_type === 'surge') {
                    if (rule.discount_type === 'percentage') {
                        adjustedPrice += (item.price * rule.value) / 100;
                    } else {
                        adjustedPrice += rule.value;
                    }
                } else {
                    if (rule.discount_type === 'percentage') {
                        adjustedPrice -= (item.price * rule.value) / 100;
                    } else {
                        adjustedPrice -= rule.value;
                    }
                }
                break;
            }
        }

        return {
            price: Math.max(0, adjustedPrice),
            isAdjusted: appliedRule !== null,
            ruleType: appliedRule?.rule_type
        };
    };

    const handleAddToOrder = (item: MenuItemType, notesList: string[], selectedModifiers: { name: string; price: number; type: 'add-on' | 'upsell' | 'side' }[]) => {
        const notes = notesList.length > 0 ? notesList.join(", ") : undefined;

        if (editingTicketItem) {
            // Updating an existing item in the ticket
            setOrderItems(orderItems.map(oi =>
                oi.id === editingTicketItem.id
                    ? { ...oi, notes, modifiers: selectedModifiers, isEdited: true }
                    : oi
            ));
            setEditingTicketItem(null);
        } else {
            const existingIndex = orderItems.findIndex(
                (o) => o.menuItemId === item.id &&
                    o.seatNumber === selectedSeat &&
                    o.notes === notes &&
                    o.status === 'pending' &&
                    JSON.stringify(o.modifiers) === JSON.stringify(selectedModifiers)
            );

            if (existingIndex !== -1) {
                const newItems = [...orderItems];
                newItems[existingIndex] = {
                    ...newItems[existingIndex],
                    quantity: newItems[existingIndex].quantity + 1,
                    isEdited: true
                };
                setOrderItems(newItems);
            } else {
                setOrderItems([
                    ...orderItems,
                    {
                        id: crypto.randomUUID(),
                        menuItemId: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: 1,
                        notes: notes,
                        modifiers: selectedModifiers,
                        seatNumber: selectedSeat,
                        status: 'sent',
                        category_name: item.category?.name
                    },
                ]);
            }
        }
        setCustomizingItem(null);
    };

    const handleEditTicketItem = (item: OrderItem) => {
        const menuItem = menuItems.find(m => m.id === item.menuItemId);
        if (menuItem) {
            setEditingTicketItem(item);
            setCustomizingItem(menuItem);
        }
    };

    // Auto-fetch table capacity when table number changes
    useEffect(() => {
        const fetchTableCapacity = async () => {
            if (orderType !== "dine_in" || !tableNumber.trim() || !currentLocation?.id) return;

            try {
                const { data, error } = await supabase
                    .from("seating_tables")
                    .select("capacity")
                    .eq("label", tableNumber.trim())
                    .eq("is_active", true)
                    .maybeSingle() as { data: { capacity: number } | null, error: any };

                if (data && !error) {
                    setTableCapacity(data.capacity || 4);
                }
            } catch (err) {
                console.error("Error fetching table capacity:", err);
            }
        };

        const timer = setTimeout(fetchTableCapacity, 500); // Debounce
        return () => clearTimeout(timer);
    }, [tableNumber, orderType, currentLocation?.id]);

    // Auto-load existing active order for table
    useEffect(() => {
        const fetchExistingOrder = async () => {
            if (orderType !== "dine_in" || !tableNumber.trim() || !currentLocation?.id || activeOrderId) return;

            try {
                const { data, error } = await supabase
                    .from("orders")
                    .select("*")
                    .eq("location_id", currentLocation.id)
                    .eq("table_number", tableNumber.trim())
                    .neq("payment_status", "paid")
                    .in("status", ["sent", "preparing", "ready", "served", "pending"])
                    .maybeSingle();

                if (data && !error) {
                    // Load the order if we found one and aren't already editing one
                    loadOrder(data);
                }
            } catch (err) {
                console.error("Error fetching existing order for table:", err);
            }
        };

        const timer = setTimeout(fetchExistingOrder, 300); // Small debounce
        return () => clearTimeout(timer);
    }, [tableNumber, orderType, currentLocation?.id]);

    const updateQuantity = (id: string, delta: number) => {
        setOrderItems(
            orderItems
                .map((item) =>
                    item.id === id ? { ...item, quantity: item.quantity + delta, isEdited: true } : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const removeItem = (id: string) => {
        setOrderItems(orderItems.filter((item) => item.id !== id));
    };

    const subtotal = orderItems.reduce(
        (sum, item) => {
            const modifiersTotal = (item.modifiers || []).reduce((s, a) => s + a.price, 0);
            return sum + (item.price + modifiersTotal) * item.quantity;
        },
        0
    );
    const taxRate = currentLocation?.tax_rate ?? 8.75;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax + deliveryFee;

    const sendToKitchen = async () => {
        if (!currentLocation?.id || orderItems.length === 0) return;

        setLoading(true);
        try {
            let orderId = activeOrderId;
            const isEditing = !!orderId;

            // Prepare items for storage
            const itemsToSave = orderItems.map(item => ({
                id: item.id,
                menu_item_id: item.menuItemId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                notes: item.notes || null,
                status: item.status || "sent",
                seat_number: item.seatNumber,
                is_upsell: item.isUpsell || false,
                category_name: item.category_name,
                modifiers: item.modifiers || [],
                sent_at: item.sent_at || new Date().toISOString(),
                started_at: item.started_at,
                ready_at: item.ready_at,
                served_at: item.served_at
            }));

            if (!isEditing) {
                // 1. Create a new order
                const { data: order, error: orderError } = await (supabase
                    .from("orders") as any)
                    .insert({
                        location_id: currentLocation.id,
                        server_id: currentEmployee?.id || useAppStore.getState().currentEmployee?.id || null,
                        table_number: orderType === "dine_in" ? tableNumber : null,
                        seat_number: orderType === "dine_in" ? selectedSeat : null,
                        status: "sent",
                        order_type: orderType,
                        subtotal: subtotal,
                        tax: tax,
                        delivery_fee: deliveryFee,
                        total: total,
                        items: itemsToSave
                    })
                    .select("id")
                    .single();

                if (orderError) throw orderError;
                orderId = order.id;

                // Clear the waitlist entry now that an order has been created
                if (orderType === "dine_in" && tableNumber) {
                    // Find the table ID by matching the label
                    const { data: tables } = await (supabase.from("seating_tables") as any)
                        .select("id")
                        .eq("label", tableNumber)
                        .eq("is_active", true)
                        .limit(1);

                    if (tables && tables.length > 0) {
                        await (supabase.from("waitlist") as any)
                            .delete()
                            .eq("table_id", tables[0].id)
                            .eq("status", "seated");
                    }
                }
            } else {
                // Update existing order
                const { error: orderUpdateError } = await (supabase
                    .from("orders") as any)
                    .update({
                        status: "sent", // Reset status so it reappears in kitchen
                        table_number: orderType === "dine_in" ? tableNumber : null,
                        seat_number: orderType === "dine_in" ? selectedSeat : null,
                        subtotal,
                        tax,
                        delivery_fee: deliveryFee,
                        total,
                        items: itemsToSave,
                        is_edited: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", orderId);

                if (orderUpdateError) throw orderUpdateError;
            }

            toast.success(isEditing ? "Order updated!" : "Order sent to kitchen!");
            setOrderItems([]);
            setActiveOrderId(null);
            setTableNumber("5");
        } catch (error) {
            console.error("Error sending order:", error);
            toast.error("Failed to process order");
        } finally {
            setLoading(false);
        }
    };

    const loadOrder = async (order: any) => {
        setActiveOrderId(order.id);
        setOrderType(order.order_type);
        setTableNumber(order.table_number || "");
        if (order.seat_number) setSelectedSeat(order.seat_number);
        setDeliveryFee(order.delivery_fee || 0);

        if (order.items && Array.isArray(order.items)) {
            setOrderItems(order.items.map((i: any) => ({
                id: i.id || crypto.randomUUID(),
                menuItemId: i.menu_item_id,
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                notes: i.notes || undefined,
                isEdited: false,
                seatNumber: i.seat_number || 1,
                status: i.status || 'sent',
                isUpsell: i.is_upsell || false,
                category_name: i.category_name,
                modifiers: i.modifiers || i.add_ons || [],
                sent_at: i.sent_at,
                started_at: i.started_at,
                ready_at: i.ready_at,
                served_at: i.served_at
            })));
        }
        setShowMyTickets(false);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6rem)]">
            {/* Menu Section */}
            <div className="flex-1 flex flex-col">
                {/* Category Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pb-3">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "btn w-full h-auto min-h-[40px] whitespace-normal py-2 px-2 text-sm leading-tight break-words",
                                selectedCategory === cat ? "btn-primary" : "btn-secondary"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Menu Items Grid */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Clock className="h-8 w-8 animate-spin text-orange-500 mb-2" />
                            <p className="text-slate-400">Loading items...</p>
                        </div>
                    ) : availableItems.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4">
                            {availableItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => !item.is_86d && setCustomizingItem({
                                        ...item,
                                        price: getAdjustedPrice(item).price
                                    })}
                                    disabled={item.is_86d}
                                    className={cn(
                                        "card-interactive flex flex-col items-center justify-center p-4 text-center min-h-[100px] transition-all relative overflow-hidden",
                                        !item.is_86d && "active:scale-95",
                                        item.is_86d && "opacity-50 cursor-not-allowed grayscale",
                                        getAdjustedPrice(item).isAdjusted && (
                                            getAdjustedPrice(item).ruleType === 'surge'
                                                ? "border-orange-500/50 bg-orange-500/5"
                                                : "border-green-500/50 bg-green-500/5"
                                        )
                                    )}
                                >
                                    {getAdjustedPrice(item).isAdjusted && (
                                        <div className={cn(
                                            "absolute top-0 right-0 p-1 rounded-bl-lg",
                                            getAdjustedPrice(item).ruleType === 'surge' ? "bg-orange-500" : "bg-green-500"
                                        )}>
                                            {getAdjustedPrice(item).ruleType === 'surge' ? <TrendingUp className="h-3 w-3 text-white" /> : <Zap className="h-3 w-3 text-white" />}
                                        </div>
                                    )}
                                    <span className="font-medium text-sm md:text-base leading-tight">{item.name}</span>
                                    {item.is_86d ? (
                                        <span className="text-red-500 font-bold mt-2 uppercase text-xs tracking-wider">
                                            86&apos;d
                                        </span>
                                    ) : (
                                        <div className="mt-2 flex flex-col items-center">
                                            <span className={cn(
                                                "font-bold",
                                                getAdjustedPrice(item).isAdjusted
                                                    ? (getAdjustedPrice(item).ruleType === 'surge' ? "text-orange-400" : "text-green-400")
                                                    : "text-orange-400"
                                            )}>
                                                {formatCurrency(getAdjustedPrice(item).price)}
                                            </span>
                                            {getAdjustedPrice(item).isAdjusted && (
                                                <span className="text-[10px] text-slate-500 line-through">
                                                    {formatCurrency(item.price)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <p>No items in this category</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Section */}
            <div className="lg:w-96 flex flex-col bg-slate-900/50 rounded-xl border border-slate-800">
                {/* Order Header */}
                <div className="p-4 border-b border-slate-800">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold flex items-center gap-2">
                                <LayoutList className="h-5 w-5 text-orange-500" />
                                {activeOrderId ? `Order #${activeOrderId.slice(0, 4)}` : "New Order"}
                            </h2>
                            <div className="flex gap-2">
                                {activeOrderId && (
                                    <button
                                        onClick={() => {
                                            setActiveOrderId(null);
                                            setOrderItems([]);
                                            setTableNumber("5");
                                        }}
                                        className="btn btn-secondary text-xs py-1"
                                        title="Exit current ticket and start new"
                                    >
                                        New Order
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowMyTickets(true)}
                                    className="btn btn-secondary text-xs py-1"
                                >
                                    My Tickets
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <select
                                value={orderType}
                                onChange={(e) => setOrderType(e.target.value as any)}
                                className="bg-slate-800 text-slate-100 font-bold px-3 py-1 rounded-lg border border-slate-700 outline-none focus:ring-1 focus:ring-orange-500"
                            >
                                <option value="dine_in">Dine In</option>
                                <option value="takeout">Takeout</option>
                                <option value="delivery">Delivery</option>
                            </select>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Clock className="h-4 w-4" />
                                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>

                        {orderType === "dine_in" && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t("pos.table")}</span>
                                    <input
                                        type="text"
                                        value={tableNumber}
                                        onChange={(e) => setTableNumber(e.target.value)}
                                        className="w-16 bg-slate-900 rounded-md border border-slate-700 px-2 py-1 text-center font-bold text-orange-400 focus:border-orange-500 outline-none transition-all"
                                        placeholder="?"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold px-1">Active Seat</label>
                                    <div className="flex gap-1 overflow-x-auto pb-1">
                                        {[...Array(tableCapacity)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => setSelectedSeat(i + 1)}
                                                className={cn(
                                                    "min-w-[40px] h-10 rounded-lg border font-bold transition-all",
                                                    selectedSeat === i + 1
                                                        ? "bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20"
                                                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                                )}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Order Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {orderItems.length === 0 ? (
                        <div className="text-center text-slate-500 py-8">
                            <p>No items yet</p>
                            <p className="text-sm mt-1">Tap menu items to add</p>
                        </div>
                    ) : (
                        (() => {
                            const groupedBySeat = orderItems.reduce((acc, item) => {
                                const seat = item.seatNumber || 1;
                                if (!acc[seat]) acc[seat] = [];
                                acc[seat].push(item);
                                return acc;
                            }, {} as Record<number, OrderItem[]>);

                            return Object.keys(groupedBySeat).sort((a, b) => Number(a) - Number(b)).map((seatNum) => (
                                <div key={seatNum} className="space-y-1 mb-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="h-[1px] flex-1 bg-slate-800"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Seat {seatNum}</span>
                                        <div className="h-[1px] flex-1 bg-slate-800"></div>
                                    </div>
                                    {groupedBySeat[Number(seatNum)].map((item) => (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "flex items-center gap-3 py-2 border-b border-slate-800/50 last:border-0",
                                                item.isUpsell && "bg-green-500/5 -mx-4 px-4 rounded"
                                            )}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{item.name}</span>
                                                    {item.isUpsell && (
                                                        <span className="badge badge-success text-[10px] px-1 py-0 h-4">Upsell</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                    <span>{formatCurrency(item.price)} each</span>
                                                </div>
                                                {item.notes && (
                                                    <div className="mt-0.5 text-[10px] text-orange-400 font-medium italic">
                                                        {item.notes}
                                                    </div>
                                                )}
                                                {(item.modifiers || []).length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {item.modifiers?.map((mod, idx) => (
                                                            <span key={idx} className={cn(
                                                                "text-[10px] border px-1.5 py-0.5 rounded",
                                                                mod.type === 'upsell' ? "bg-green-500/10 border-green-500/30 text-green-400" :
                                                                    mod.type === 'side' ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                                                                        "bg-slate-800 border-slate-700 text-slate-300"
                                                            )}>
                                                                + {mod.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-300">
                                                <button
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                    className="p-1 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                    className="p-1 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                                <div className="flex border-l border-slate-800 ml-1 pl-1">
                                                    <button
                                                        onClick={() => handleEditTicketItem(item)}
                                                        className="p-1 text-slate-500 hover:text-white transition-colors"
                                                        title="Edit item"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ));
                        })()
                    )}
                </div>

                {/* Totals */}
                <div className="p-4 border-t border-slate-800 space-y-2">
                    <div className="flex justify-between text-slate-400">
                        <span>{t("pos.subtotal")}</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>{t("pos.tax")} ({taxRate}%)</span>
                        <span>{formatCurrency(tax)}</span>
                    </div>
                    {deliveryFee > 0 && (
                        <div className="flex justify-between text-slate-400">
                            <span>Delivery Fee</span>
                            <span>{formatCurrency(deliveryFee)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xl font-bold pt-2 border-t border-slate-700">
                        <span>{t("pos.total")}</span>
                        <span className="text-orange-400">{formatCurrency(total)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-slate-800 space-y-2">
                    <button
                        onClick={sendToKitchen}
                        disabled={orderItems.length === 0}
                        className="btn btn-primary w-full py-3 text-lg"
                    >
                        <Send className="h-5 w-5" />
                        {t("pos.sendToKitchen")}
                    </button>
                    <button
                        onClick={() => setShowCloseTicket(true)}
                        disabled={!activeOrderId}
                        className="btn btn-secondary w-full py-3 text-lg"
                    >
                        <Receipt className="h-5 w-5" />
                        Close Ticket
                    </button>
                    {activeOrderId && orderItems.length > 0 && (
                        <button
                            onClick={() => setShowSplitCheck(true)}
                            className="btn btn-secondary w-full py-3 text-lg border-2 border-dashed border-orange-500/30 hover:border-orange-500/60"
                        >
                            <Split className="h-5 w-5 text-orange-500" />
                            Split Check
                        </button>
                    )}
                </div>
            </div>

            {/* Item Customization Modal */}
            {customizingItem && (
                <ItemCustomizationModal
                    item={customizingItem}
                    initialNotes={editingTicketItem?.notes}
                    initialModifiers={editingTicketItem?.modifiers}
                    onClose={() => {
                        setCustomizingItem(null);
                        setEditingTicketItem(null);
                    }}
                    onConfirm={(notes, modifiers) => handleAddToOrder(customizingItem, notes, modifiers as any)}
                />
            )}

            {/* My Tickets Modal */}
            {showMyTickets && (
                <MyTicketsModal
                    onClose={() => setShowMyTickets(false)}
                    onSelectOrder={loadOrder}
                />
            )}

            {/* Close Ticket Modal */}
            {showCloseTicket && activeOrderId && (
                <CloseTicketModal
                    orderId={activeOrderId}
                    tableNumber={tableNumber}
                    orderType={orderType}
                    total={total}
                    onClose={() => setShowCloseTicket(false)}
                />
            )}

            {showSplitCheck && activeOrderId && (
                <SplitCheckModal
                    orderId={activeOrderId}
                    items={orderItems}
                    locationId={currentLocation?.id || ""}
                    taxRate={taxRate}
                    serverId={currentEmployee?.id}
                    tableNumber={tableNumber}
                    orderType={orderType}
                    onClose={() => setShowSplitCheck(false)}
                    onSuccess={() => {
                        setOrderItems([]);
                        setActiveOrderId(null);
                        setTableNumber("5");
                    }}
                />
            )}
        </div>
    );
}

export default function OrdersPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <p className="text-slate-400">Initializing POS...</p>
            </div>
        }>
            <OrdersPageContent />
        </Suspense>
    );
}

function ItemCustomizationModal({
    item,
    initialNotes,
    initialModifiers,
    onClose,
    onConfirm,
}: {
    item: MenuItemType;
    initialNotes?: string;
    initialModifiers?: { id?: string; name: string; price: number; type: 'add-on' | 'upsell' | 'side' | 'dressing' }[];
    onClose: () => void;
    onConfirm: (notes: string[], modifiers: { id?: string; name: string; price: number; type: 'add-on' | 'upsell' | 'side' | 'dressing' }[]) => void;
}) {
    const { t } = useTranslation();
    const [notes, setNotes] = useState<string[]>([]);
    const [selectedModifiers, setSelectedModifiers] = useState<{ id?: string; name: string; price: number; type: 'add-on' | 'upsell' | 'side' | 'dressing' }[]>(initialModifiers || []);
    const [customText, setCustomText] = useState("");

    const [availableOptions, setAvailableOptions] = useState<{ id?: string; name: string; price: number; type: 'add-on' | 'upsell' | 'side' | 'dressing' }[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();
    const currentLocation = useAppStore((state) => state.currentLocation);

    useEffect(() => {
        const fetchOptions = async () => {
            if (!currentLocation?.id) return;
            setLoading(true);
            try {
                // 1. Fetch relevant Add Ons for the category or item
                const { data: assignments } = await (supabase.from("add_on_assignments") as any)
                    .select("add_on_id")
                    .or(`menu_item_id.eq.${item.id},category_id.eq.${item.category_id}`);

                const addOnIds = (assignments || []).map((a: any) => a.add_on_id);
                let combinedOptions: { name: string; price: number; type: 'add-on' | 'upsell' | 'side' | 'dressing' }[] = [];
                if (addOnIds.length > 0) {
                    const { data: addOnsData } = await (supabase.from("add_ons") as any)
                        .select("id, name, price")
                        .eq("location_id", currentLocation.id)
                        .eq("is_active", true)
                        .in("id", addOnIds);
                    if (addOnsData) {
                        combinedOptions = [...combinedOptions, ...addOnsData.map((a: any) => ({ ...a, type: 'add-on' as const }))];
                    }
                }

                // 2. Fetch relevant Sides for the item or category (Dressings come later)
                const { data: sideAssignments } = await (supabase.from("side_assignments") as any)
                    .select("side_id")
                    .or(`menu_item_id.eq.${item.id},category_id.eq.${item.category_id}`);

                const sideIds = (sideAssignments || []).map((a: any) => a.side_id);
                if (sideIds.length > 0) {
                    const { data: sidesData } = await (supabase.from("sides") as any)
                        .select("id, name, price")
                        .eq("location_id", currentLocation.id)
                        .eq("is_active", true)
                        .in("id", sideIds);
                    if (sidesData) {
                        combinedOptions = [...combinedOptions, ...sidesData.map((s: any) => ({ ...s, type: 'side' as const }))];
                    }
                }

                // 3. Fetch relevant Dressings for the item or category
                const { data: dressingAssignments } = await (supabase.from("dressing_assignments") as any)
                    .select("dressing_id")
                    .or(`menu_item_id.eq.${item.id},category_id.eq.${item.category_id}`);

                const dressingIds = (dressingAssignments || []).map((a: any) => a.dressing_id);
                if (dressingIds.length > 0) {
                    const { data: dressingsData } = await (supabase.from("dressings") as any)
                        .select("id, name, price")
                        .eq("location_id", currentLocation.id)
                        .eq("is_active", true)
                        .in("id", dressingIds);
                    if (dressingsData) {
                        combinedOptions = [...combinedOptions, ...dressingsData.map((d: any) => ({ ...d, type: 'dressing' as const }))];
                    }
                }

                setAvailableOptions(combinedOptions);
            } catch (error) {
                console.error("Error fetching options:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOptions();
    }, [item.id, item.category_id, currentLocation?.id]);

    useEffect(() => {
        if (initialNotes) {
            setNotes(initialNotes.split(", ").filter((n: string) => n.length > 0));
        }
    }, [initialNotes]);

    const addNote = () => {
        if (customText.trim()) {
            setNotes([...notes, customText.trim()]);
            setCustomText("");
        }
    };

    const toggleModifier = (mod: any) => {
        const existing = selectedModifiers.find(m => m.name === mod.name && m.type === mod.type);
        if (existing) {
            setSelectedModifiers(selectedModifiers.filter(m => !(m.name === mod.name && m.type === mod.type)));
        } else {
            setSelectedModifiers([...selectedModifiers, {
                id: mod.id,
                name: mod.name,
                price: mod.price,
                type: mod.type
            }]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative card w-full max-w-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">{item.name}</h2>
                        <p className="text-orange-400 font-bold">{formatCurrency(item.price)}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Notes Section */}
                    <div>
                        <label className="label text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Special Instructions</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="e.g. No Onions..."
                                className="input flex-1"
                                value={customText}
                                onChange={(e) => setCustomText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addNote()}
                                autoFocus
                            />
                            <button onClick={addNote} className="btn btn-primary px-4" disabled={!customText.trim()}>
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {notes.map((note, i) => (
                                <span key={i} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full pl-3 pr-1.5 py-1 text-xs text-slate-300">
                                    {note}
                                    <button onClick={() => setNotes(notes.filter((_, idx) => idx !== i))} className="hover:text-red-400"><X className="h-3 w-3" /></button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Sides Section */}
                    <div>
                        <label className="label text-[10px] uppercase tracking-widest text-blue-500 font-bold mb-2">Choice of Side</label>
                        {!loading && availableOptions.filter(o => o.type === 'side').length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1">
                                {availableOptions.filter(o => o.type === 'side').map((mod, idx) => (
                                    <button
                                        key={`${mod.name}-${idx}`}
                                        onClick={() => toggleModifier(mod)}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all",
                                            selectedModifiers.some(a => a.name === mod.name && a.type === 'side')
                                                ? "bg-blue-600 border-blue-400 text-white"
                                                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                        )}
                                    >
                                        <div className="flex flex-col items-start text-left">
                                            <span>{mod.name}</span>
                                        </div>
                                        <span className="font-bold">+{formatCurrency(mod.price)}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            !loading && <p className="text-[10px] text-slate-600 italic py-1">No sides available</p>
                        )}
                    </div>

                    {/* Dressings Section */}
                    <div>
                        <label className="label text-[10px] uppercase tracking-widest text-cyan-500 font-bold mb-2">Choice of Dressing</label>
                        {!loading && availableOptions.filter(o => o.type === 'dressing').length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1">
                                {availableOptions.filter(o => o.type === 'dressing').map((mod, idx) => (
                                    <button
                                        key={`${mod.name}-${idx}`}
                                        onClick={() => toggleModifier(mod)}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all",
                                            selectedModifiers.some(a => a.name === mod.name && a.type === 'dressing')
                                                ? "bg-cyan-600 border-cyan-400 text-white"
                                                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                        )}
                                    >
                                        <div className="flex flex-col items-start text-left">
                                            <span>{mod.name}</span>
                                        </div>
                                        <span className="font-bold">+{formatCurrency(mod.price)}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            !loading && <p className="text-[10px] text-slate-600 italic py-1">No dressings available</p>
                        )}
                    </div>

                    {/* Add Ons Section */}
                    <div>
                        <label className="label text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Add Ons & Extras</label>
                        {loading ? (
                            <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
                                <Loader2 className="h-3 w-3 animate-spin" /> Fetching options...
                            </div>
                        ) : availableOptions.filter(o => o.type === 'add-on' || o.type === 'upsell').length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1">
                                {availableOptions.filter(o => o.type === 'add-on' || o.type === 'upsell').map((mod, idx) => (
                                    <button
                                        key={`${mod.name}-${idx}`}
                                        onClick={() => toggleModifier(mod)}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all",
                                            selectedModifiers.some(a => a.name === mod.name && (a.type === 'add-on' || a.type === 'upsell'))
                                                ? "bg-orange-600 border-orange-400 text-white"
                                                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                        )}
                                    >
                                        <div className="flex flex-col items-start text-left">
                                            <span>{mod.name}</span>
                                            <span className={cn(
                                                "text-[8px] uppercase font-black",
                                                selectedModifiers.some(a => a.name === mod.name) ? "text-orange-200" : "text-orange-400"
                                            )}>
                                                {mod.type === 'upsell' ? 'Add-on' : mod.type}
                                            </span>
                                        </div>
                                        <span className="font-bold">+{formatCurrency(mod.price)}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            !loading && <p className="text-[10px] text-slate-600 italic py-1">No add-ons available</p>
                        )}
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-slate-800">
                        <button onClick={onClose} className="btn btn-secondary flex-1">
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(notes, selectedModifiers)}
                            className="btn btn-primary flex-[2] text-lg font-bold"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function UpsellModal() {
    /* Potential future cleanup: move existing upsell modal logic here */
}
