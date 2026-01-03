"use client";

import { useState } from "react";
import {
    ChefHat,
    ShoppingCart,
    ChevronRight,
    Plus,
    Minus,
    Sparkles,
    Search,
    Loader2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";

export type PublicMenuItem = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category_id: string;
    image_url?: string | null;
};

export type PublicCategory = {
    id: string;
    name: string;
};

interface PublicMenuProps {
    items: PublicMenuItem[];
    categories: PublicCategory[];
    locationId: string;
    locationName: string;
    tableNumber?: string;
}

export default function PublicMenu({
    items,
    categories,
    locationId,
    locationName,
    tableNumber
}: PublicMenuProps) {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [cartOpen, setCartOpen] = useState(false);
    const [cart, setCart] = useState<{ id: string, name: string, price: number, quantity: number }[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [placingOrder, setPlacingOrder] = useState(false);

    // Filter items
    const filteredItems = items.filter(item => {
        // Find category name
        const cat = categories.find(c => c.id === item.category_id);
        const catName = cat?.name || "Other";

        const matchesCategory = selectedCategory === "All" || catName === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCategory && matchesSearch;
    });

    // Get unique category names for the filter tabs
    const categoryNames = ["All", ...categories.map(c => c.name)];

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const addToCart = (item: PublicMenuItem) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { id: item.id, name: item.name, price: item.price, quantity: 1 }]);
        }
        toast.success(`Added ${item.name} to order`);
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(cart.map(c => c.id === id ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0));
    };

    const handlePlaceOrder = async () => {
        if (!cart.length) return;

        setPlacingOrder(true);
        // TODO: Implement actual order creation in Phase 4
        try {
            // diverse error simulation
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success("Proceeding to checkout...");

            // For now, valid checkout will happen when we have the API
            const orderPayload = {
                locationId,
                items: cart.map(c => ({ itemId: c.id, quantity: c.quantity })),
                tableNumber: tableNumber || "Takeout",
                type: tableNumber ? "dine_in" : "pickup"
            };

            console.log("Order Payload:", orderPayload);
            toast("Checkout integration coming in Phase 4!", { icon: "🚧" });

        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setPlacingOrder(false);
        }
    };

    return (
        <div className="pb-24 animate-in fade-in duration-500">
            {/* Context Header */}
            <div className="flex items-center justify-between mb-6 px-4 pt-4">
                <div>
                    <h2 className="font-bold text-xl text-slate-100">Menu</h2>
                    <p className="text-sm text-slate-400">
                        {tableNumber ? `Ordering for Table ${tableNumber}` : "Pickup Order"}
                    </p>
                </div>
                <button
                    onClick={() => setCartOpen(true)}
                    className="relative p-3 bg-slate-900 rounded-xl border border-slate-800 active:scale-95 transition-transform"
                >
                    <ShoppingCart className="w-5 h-5 text-slate-200" />
                    {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-950">
                            {cartCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Search */}
            <div className="px-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search for food or drinks..."
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl py-3 pl-10 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-4 px-4 scrollbar-hide mb-2">
                {categoryNames.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                            "whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all",
                            selectedCategory === cat
                                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"
                        )}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Happy Hour Banner */}
            <div className="px-4 mb-8">
                <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-xl">
                            <Sparkles className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="font-bold text-orange-100 text-sm">Members get 10% off</p>
                            <p className="text-[10px] text-orange-200/60">Join loyalty at checkout</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-orange-500/50" />
                </div>
            </div>

            {/* Menu Items */}
            <div className="px-4 space-y-4">
                {filteredItems.map(item => (
                    <div
                        key={item.id}
                        className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 flex gap-4 active:scale-[0.99] transition-transform cursor-pointer"
                        onClick={() => addToCart(item)}
                    >
                        <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-slate-100">{item.name}</h3>
                                <span className="font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded text-sm">
                                    {formatCurrency(item.price)}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {item.description || "No description available."}
                            </p>
                        </div>
                        <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0 self-center border border-slate-700">
                            <Plus className="w-5 h-5 text-slate-400" />
                        </div>
                    </div>
                ))}

                {filteredItems.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <p>No items found.</p>
                    </div>
                )}
            </div>

            {/* Cart Drawer */}
            {cartOpen && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
                    <div className="relative bg-slate-900 rounded-t-3xl p-6 border-t border-slate-800 animate-slide-up shadow-2xl">
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6" />
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            Your Order
                            <span className="text-sm font-normal text-slate-500 px-2 py-0.5 bg-slate-800 rounded-full">{cartCount} items</span>
                        </h2>

                        <div className="space-y-4 max-h-[50vh] overflow-y-auto mb-6 pr-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center justify-between group">
                                    <div>
                                        <p className="font-bold text-sm text-slate-200">{item.name}</p>
                                        <p className="text-xs text-slate-500">{formatCurrency(item.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
                                        <button
                                            onClick={() => updateQuantity(item.id, -1)}
                                            className="hover:text-white text-slate-400 transition-colors"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-bold w-4 text-center text-slate-200">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, 1)}
                                            className="hover:text-white text-slate-400 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {cart.length === 0 && (
                                <div className="text-center py-12">
                                    <ShoppingCart className="w-12 h-12 text-slate-800 mx-auto mb-3" />
                                    <p className="text-slate-500">Your cart is empty</p>
                                    <button
                                        onClick={() => setCartOpen(false)}
                                        className="mt-4 text-orange-500 text-sm font-bold hover:underline"
                                    >
                                        Browse Menu
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-800">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Total</span>
                                <span className="text-3xl font-bold text-slate-100">{formatCurrency(cartTotal)}</span>
                            </div>
                            <button
                                onClick={handlePlaceOrder}
                                className="btn btn-primary w-full py-4 rounded-2xl text-lg font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                                disabled={cart.length === 0 || placingOrder}
                            >
                                {placingOrder ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        Checkout
                                        <ChevronRight className="w-5 h-5 opacity-50" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Bar (Mobile) */}
            {cartCount > 0 && !cartOpen && (
                <div
                    className="fixed bottom-6 left-4 right-4 z-40 bg-slate-100 rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-slide-up cursor-pointer active:scale-95 transition-transform"
                    onClick={() => setCartOpen(true)}
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md">
                            {cartCount}
                        </div>
                        <span className="font-bold text-slate-900">View Order</span>
                    </div>
                    <span className="font-bold text-slate-900 text-lg">{formatCurrency(cartTotal)}</span>
                </div>
            )}
        </div>
    );
}
