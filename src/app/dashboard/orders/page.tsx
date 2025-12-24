"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { useEffect } from "react";
import { toast } from "react-hot-toast";
import MyTicketsModal from "./components/MyTicketsModal";
import CloseTicketModal from "./components/CloseTicketModal";

// Types for Supabase integration
interface MenuItemType {
    id: string;
    name: string;
    description?: string | null;
    category_id: string;
    price: number;
    is_86d: boolean;
    category?: { name: string };
}

interface OrderItem {
    id: string;
    dbId?: string; // Database ID if existing
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    isUpsell?: boolean;
    isEdited?: boolean;
}

export default function OrdersPage() {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState("");
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [tableNumber, setTableNumber] = useState("5");
    const [orderType, setOrderType] = useState<"dine_in" | "takeout" | "delivery">("dine_in");
    const [upsellSuggestions, setUpsellSuggestions] = useState<any[]>([]);
    const [showUpsells, setShowUpsells] = useState(false);
    const [customizingItem, setCustomizingItem] = useState<MenuItemType | null>(null);
    const [editingTicketItem, setEditingTicketItem] = useState<OrderItem | null>(null);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [showMyTickets, setShowMyTickets] = useState(false);
    const [showCloseTicket, setShowCloseTicket] = useState(false);

    const [categories, setCategories] = useState<string[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
    const [loading, setLoading] = useState(true);

    const currentLocation = useAppStore((state) => state.currentLocation);
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
                    .select("*, category:menu_categories(name)")
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
            } catch (error) {
                console.error("Error fetching menu data:", error);
                toast.error("Failed to load menu");
            } finally {
                setLoading(false);
            }
        };

        fetchMenuData();
    }, [currentLocation?.id]);

    const availableItems = menuItems.filter(
        (item) => (item.category?.name || "Uncategorized") === selectedCategory && !item.is_86d
    );

    const handleAddToOrder = (item: MenuItemType, modifiers: string[]) => {
        const notes = modifiers.length > 0 ? modifiers.join(", ") : undefined;

        if (editingTicketItem) {
            // Updating an existing item in the ticket
            setOrderItems(orderItems.map(oi =>
                oi.id === editingTicketItem.id
                    ? { ...oi, notes, isEdited: oi.dbId ? true : false }
                    : oi
            ));
            setEditingTicketItem(null);
        } else {
            const existingIndex = orderItems.findIndex(
                (o) => o.menuItemId === item.id && o.notes === notes && !o.dbId // Only group with unsent items
            );

            if (existingIndex !== -1) {
                const newItems = [...orderItems];
                newItems[existingIndex] = {
                    ...newItems[existingIndex],
                    quantity: newItems[existingIndex].quantity + 1,
                    isEdited: newItems[existingIndex].dbId ? true : false
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
                        notes: notes
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

    const addUpsell = (upsell: { name: string; price: number }) => {
        const menuItem = menuItems.find((i) => i.name === upsell.name);
        if (menuItem) {
            const existing = orderItems.find((o) => o.menuItemId === menuItem.id);
            if (existing) {
                setOrderItems(
                    orderItems.map((o) =>
                        o.menuItemId === menuItem.id ? { ...o, quantity: o.quantity + 1 } : o
                    )
                );
            } else {
                setOrderItems([
                    ...orderItems,
                    {
                        id: crypto.randomUUID(),
                        menuItemId: menuItem.id,
                        name: menuItem.name,
                        price: menuItem.price,
                        quantity: 1,
                        isUpsell: true,
                    },
                ]);
            }
        }
        setShowUpsells(false);
    };

    const updateQuantity = (id: string, delta: number) => {
        setOrderItems(
            orderItems
                .map((item) =>
                    item.id === id ? { ...item, quantity: item.quantity + delta, isEdited: item.dbId ? true : item.isEdited } : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const removeItem = (id: string) => {
        setOrderItems(orderItems.filter((item) => item.id !== id));
    };

    const subtotal = orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
    const tax = subtotal * 0.0875;
    const total = subtotal + tax;

    const sendToKitchen = async () => {
        if (!currentLocation?.id || orderItems.length === 0) return;

        setLoading(true);
        try {
            let orderId = activeOrderId;
            const isEditing = !!orderId;

            if (!isEditing) {
                // 1. Create a new order
                const { data: order, error: orderError } = await (supabase
                    .from("orders") as any)
                    .insert({
                        location_id: currentLocation.id,
                        server_id: currentEmployee?.id || null,
                        table_number: orderType === "dine_in" ? tableNumber : null,
                        status: "pending",
                        order_type: orderType,
                        subtotal: subtotal,
                        tax: tax,
                        total: total
                    })
                    .select("id")
                    .single();

                if (orderError) throw orderError;
                orderId = order.id;
            } else {
                // Update existing order
                const { error: orderUpdateError } = await (supabase
                    .from("orders") as any)
                    .update({
                        status: "pending", // Reset status so it reappears in kitchen
                        subtotal,
                        tax,
                        total,
                        is_edited: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", orderId);

                if (orderUpdateError) throw orderUpdateError;
            }

            // 2. Handle order items
            const newItems = orderItems.filter(i => !i.dbId);
            const existingItems = orderItems.filter(i => i.dbId);

            // Insert new items
            if (newItems.length > 0) {
                const itemsToInsert = newItems.map(item => ({
                    order_id: orderId,
                    menu_item_id: item.menuItemId,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    notes: item.notes || null,
                    status: "pending"
                }));

                const { error: insertError } = await (supabase
                    .from("order_items") as any)
                    .insert(itemsToInsert);
                if (insertError) throw insertError;
            }

            // Update existing items that were change
            for (const item of existingItems) {
                if (item.isEdited) {
                    const { error: updateError } = await (supabase
                        .from("order_items") as any)
                        .update({
                            quantity: item.quantity,
                            notes: item.notes || null,
                            is_edited: true
                        })
                        .eq("id", item.dbId);
                    if (updateError) throw updateError;
                }
            }

            // Handle deletions? (Items in DB but not in current state)
            // For now, removing from state only. Proper deletion might need confirmation.

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

        // Fetch items for this order
        const { data: items } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

        if (items) {
            setOrderItems(items.map((i: any) => ({
                id: crypto.randomUUID(),
                dbId: i.id,
                menuItemId: i.menu_item_id,
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                notes: i.notes || undefined,
                isEdited: false
            })));
        }
        setShowMyTickets(false);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6rem)]">
            {/* Menu Section */}
            <div className="flex-1 flex flex-col">
                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "btn whitespace-nowrap",
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
                                    onClick={() => setCustomizingItem(item)}
                                    className="card-interactive flex flex-col items-center justify-center p-4 text-center min-h-[100px] active:scale-95 transition-transform"
                                >
                                    <span className="font-medium text-sm md:text-base leading-tight">{item.name}</span>
                                    <span className="text-orange-400 font-bold mt-2">
                                        {formatCurrency(item.price)}
                                    </span>
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
                                        className="btn-secondary text-xs py-1"
                                        title="Exit current ticket and start new"
                                    >
                                        New Order
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowMyTickets(true)}
                                    className="btn-secondary text-xs py-1"
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
                        orderItems.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    "flex items-center gap-3 py-2 border-b border-slate-800 last:border-0",
                                    item.isUpsell && "bg-green-500/5 -mx-4 px-4 rounded"
                                )}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{item.name}</span>
                                        {item.isUpsell && (
                                            <span className="badge badge-success text-xs">Upsell</span>
                                        )}
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {formatCurrency(item.price)} each
                                    </span>
                                    {item.notes && (
                                        <div className="mt-1 text-xs text-orange-400 font-medium">
                                            {item.notes}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEditTicketItem(item)}
                                        className="p-1 text-slate-400 hover:text-white"
                                        title="Edit item"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => updateQuantity(item.id, -1)}
                                        className="p-1 bg-slate-800 rounded hover:bg-slate-700"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        className="p-1 bg-slate-800 rounded hover:bg-slate-700"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="p-1 text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Totals */}
                <div className="p-4 border-t border-slate-800 space-y-2">
                    <div className="flex justify-between text-slate-400">
                        <span>{t("pos.subtotal")}</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>{t("pos.tax")} (8.75%)</span>
                        <span>{formatCurrency(tax)}</span>
                    </div>
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
                        className="btn-primary w-full py-3 text-lg"
                    >
                        <Send className="h-5 w-5" />
                        {t("pos.sendToKitchen")}
                    </button>
                    <button
                        onClick={() => setShowCloseTicket(true)}
                        disabled={!activeOrderId}
                        className="btn-secondary w-full py-3 text-lg"
                    >
                        <Receipt className="h-5 w-5" />
                        Close Ticket
                    </button>
                </div>
            </div>

            {/* Item Customization Modal */}
            {customizingItem && (
                <ItemCustomizationModal
                    item={customizingItem}
                    initialNotes={editingTicketItem?.notes}
                    onClose={() => {
                        setCustomizingItem(null);
                        setEditingTicketItem(null);
                    }}
                    onConfirm={(modifiers) => handleAddToOrder(customizingItem, modifiers)}
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
        </div>
    );
}

function ItemCustomizationModal({
    item,
    initialNotes,
    onClose,
    onConfirm
}: {
    item: MenuItemType;
    initialNotes?: string;
    onClose: () => void;
    onConfirm: (modifiers: string[]) => void;
}) {
    const { t } = useTranslation();
    const [modifiers, setModifiers] = useState<string[]>([]);
    const [customText, setCustomText] = useState("");

    const addModifier = () => {
        if (customText.trim()) {
            setModifiers([...modifiers, customText.trim()]);
            setCustomText("");
        }
    };

    useEffect(() => {
        if (initialNotes) {
            setModifiers(initialNotes.split(", ").filter((n: string) => n.length > 0));
        }
    }, [initialNotes]);

    const removeModifier = (index: number) => {
        setModifiers(modifiers.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative card w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">{item.name}</h2>
                        <p className="text-orange-400 font-bold">{formatCurrency(item.price)}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {item.description && (
                    <div className="mb-6 text-sm text-slate-400 italic">
                        &quot;{item.description}&quot;
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="label text-xs uppercase tracking-wider text-slate-500 font-bold">Customizations</label>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="text"
                                placeholder="e.g. No Onions, Extra Sauce"
                                className="input flex-1"
                                value={customText}
                                onChange={(e) => setCustomText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addModifier()}
                                autoFocus
                            />
                            <button
                                onClick={addModifier}
                                className="btn-primary"
                                disabled={!customText.trim()}
                            >
                                <Plus className="h-5 w-5" />
                                Add
                            </button>
                        </div>
                    </div>

                    <div className="min-h-[100px] max-h-[200px] overflow-y-auto space-y-2">
                        {modifiers.length === 0 ? (
                            <div className="h-[100px] flex items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-600 text-sm">
                                No customizations added
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {modifiers.map((mod, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full pl-3 pr-1 py-1 text-sm text-slate-200"
                                    >
                                        <span>{mod}</span>
                                        <button
                                            onClick={() => removeModifier(i)}
                                            className="p-1 hover:text-red-400 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(modifiers)}
                            className="btn-primary flex-[2] text-lg font-bold"
                        >
                            Add to Order
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
