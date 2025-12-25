"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    ChefHat,
    ShoppingCart,
    ChevronRight,
    Plus,
    Minus,
    Sparkles,
    Search
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Menu item type for Supabase integration
type MenuItem = { id: string; name: string; category: string; price: number; description: string };

// TODO: Fetch from Supabase based on restaurantId param
const menuItems: MenuItem[] = [];

const categories = ["All", "Appetizers", "Entrees", "Sides", "Drinks"];

export default function PublicMenuPage() {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [cartOpen, setCartOpen] = useState(false);
    const [cart, setCart] = useState<{ id: string, name: string, price: number, quantity: number }[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const addToCart = (item: typeof menuItems[0]) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { id: item.id, name: item.name, price: item.price, quantity: 1 }]);
        }
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(cart.map(c => c.id === id ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0));
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800 px-4 py-4">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-500 rounded-lg">
                            <ChefHat className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">HubPlate Diner</h1>
                            <p className="text-xs text-slate-400">Order from Table 5</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setCartOpen(true)}
                        className="relative p-2 bg-slate-900 rounded-full border border-slate-700"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search our menu..."
                        className="input pl-10 bg-slate-900/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "btn btn-secondary whitespace-nowrap px-6 rounded-full py-2 text-sm",
                                selectedCategory === cat && "bg-orange-500 text-white border-orange-500"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Happy Hour Banner */}
                <div className="bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-xl">
                            <Sparkles className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="font-bold text-orange-100">Happy Hour is LIVE!</p>
                            <p className="text-xs text-orange-200/60">20% off all drinks until 6 PM</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-orange-500/50" />
                </div>

                {/* Menu Items */}
                <div className="space-y-4">
                    {filteredItems.map(item => (
                        <div
                            key={item.id}
                            className="card p-4 flex gap-4 hover:border-slate-700 transition-colors cursor-pointer active:scale-[0.98]"
                            onClick={() => addToCart(item)}
                        >
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between">
                                    <h3 className="font-bold">{item.name}</h3>
                                    <span className="font-bold text-orange-400">{formatCurrency(item.price)}</span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                            </div>
                            <div className="w-16 h-16 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center shrink-0">
                                <Plus className="w-5 h-5 text-slate-600" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Cart Drawer */}
            {cartOpen && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setCartOpen(false)} />
                    <div className="relative bg-slate-900 rounded-t-3xl p-6 border-t border-slate-800 animate-slide-up">
                        <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-6" />
                        <h2 className="text-xl font-bold mb-6">Your Order</h2>

                        <div className="space-y-4 max-h-[50vh] overflow-y-auto mb-6 pr-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-sm">{item.name}</p>
                                        <p className="text-xs text-slate-400">{formatCurrency(item.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
                                        <button onClick={() => updateQuantity(item.id, -1)}><Minus className="w-4 h-4" /></button>
                                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)}><Plus className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                            {cart.length === 0 && <p className="text-center text-slate-500 py-8">Your cart is empty</p>}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-800">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Total</span>
                                <span className="text-2xl font-bold text-orange-400">{formatCurrency(cartTotal)}</span>
                            </div>
                            <button
                                className="btn btn-primary w-full py-4 rounded-2xl text-lg font-bold shadow-lg shadow-orange-500/20"
                                disabled={cart.length === 0}
                            >
                                Place Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Bar (Mobile) */}
            {cartCount > 0 && !cartOpen && (
                <div className="fixed bottom-6 left-4 right-4 z-40 bg-orange-500 rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-slide-up cursor-pointer" onClick={() => setCartOpen(true)}>
                    <div className="flex items-center gap-3">
                        <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold text-white">{cartCount} items</span>
                        <span className="font-bold text-white">View Order</span>
                    </div>
                    <span className="font-bold text-white text-lg">{formatCurrency(cartTotal)}</span>
                </div>
            )}
        </div>
    );
}
