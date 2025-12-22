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
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Types for Supabase integration
interface MenuItemType {
    id: string;
    name: string;
    category: string;
    price: number;
    is_86d: boolean;
}

interface UpsellType {
    name: string;
    price: number;
    reason: string;
}

// TODO: Fetch from Supabase
const categories: string[] = [];
const menuItems: MenuItemType[] = [];
const upsells: Record<string, UpsellType[]> = {};

interface OrderItem {
    id: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    isUpsell?: boolean;
}

export default function OrdersPage() {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState("");
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [tableNumber, setTableNumber] = useState("5");
    const [upsellSuggestions, setUpsellSuggestions] = useState<UpsellType[]>([]);
    const [showUpsells, setShowUpsells] = useState(false);

    const availableItems = menuItems.filter(
        (item) => item.category === selectedCategory && !item.is_86d
    );

    const addToOrder = (item: MenuItemType) => {
        const existing = orderItems.find((o) => o.menuItemId === item.id);

        if (existing) {
            setOrderItems(
                orderItems.map((o) =>
                    o.menuItemId === item.id ? { ...o, quantity: o.quantity + 1 } : o
                )
            );
        } else {
            setOrderItems([
                ...orderItems,
                {
                    id: crypto.randomUUID(),
                    menuItemId: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                },
            ]);
        }

        // Show upsell suggestions
        const suggestionsList = upsells[item.name];
        if (suggestionsList) {
            setUpsellSuggestions(suggestionsList);
            setShowUpsells(true);
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
                    item.id === id ? { ...item, quantity: item.quantity + delta } : item
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

    const sendToKitchen = () => {
        // TODO: Send to Supabase and trigger realtime update
        alert("Order sent to kitchen! (Demo)");
        setOrderItems([]);
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4">
                        {availableItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => addToOrder(item)}
                                className="card-interactive flex flex-col items-center justify-center p-4 text-center min-h-[100px] active:scale-95 transition-transform"
                            >
                                <span className="font-medium">{item.name}</span>
                                <span className="text-orange-400 font-bold mt-2">
                                    {formatCurrency(item.price)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Order Section */}
            <div className="lg:w-96 flex flex-col bg-slate-900/50 rounded-xl border border-slate-800">
                {/* Order Header */}
                <div className="p-4 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">{t("pos.table")}</span>
                            <input
                                type="text"
                                value={tableNumber}
                                onChange={(e) => setTableNumber(e.target.value)}
                                className="w-16 bg-slate-800 rounded px-2 py-1 text-center font-bold"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock className="h-4 w-4" />
                            <span>12:34 PM</span>
                        </div>
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
                                </div>
                                <div className="flex items-center gap-2">
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
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={sendToKitchen}
                        disabled={orderItems.length === 0}
                        className="btn-primary w-full py-3 text-lg"
                    >
                        <Send className="h-5 w-5" />
                        {t("pos.sendToKitchen")}
                    </button>
                </div>
            </div>

            {/* Upsell Modal */}
            {showUpsells && upsellSuggestions.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowUpsells(false)}
                    />
                    <div className="relative card w-full max-w-sm animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-orange-400">
                                <Sparkles className="h-5 w-5" />
                                <h3 className="font-semibold">{t("pos.suggestedUpsells")}</h3>
                            </div>
                            <button
                                onClick={() => setShowUpsells(false)}
                                className="p-1 text-slate-400 hover:text-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {upsellSuggestions.map((upsell, i) => (
                                <button
                                    key={i}
                                    onClick={() => addUpsell(upsell)}
                                    className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    <div>
                                        <p className="font-medium">{upsell.name}</p>
                                        <p className="text-sm text-slate-400">{upsell.reason}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-green-400 font-bold">
                                            +{formatCurrency(upsell.price)}
                                        </span>
                                        <Plus className="h-4 w-4 text-slate-400" />
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowUpsells(false)}
                            className="btn-ghost w-full mt-4"
                        >
                            No thanks
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
