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
import ItemCustomizationModal, { CartModifier } from "./ItemCustomizationModal";
import CheckoutModal, { CartItem } from "./CheckoutModal";

export type PublicMenuItem = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category_id: string;
    image_url?: string | null;
};

export type PricingRule = {
    id: string;
    name: string;
    rule_type: 'discount' | 'surge';
    discount_type: 'percentage' | 'fixed';
    value: number;
    category_ids: string[];
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
    taxRate: number;
    pricingRules?: PricingRule[];
}

export default function PublicMenu({
    items,
    categories,
    locationId,
    locationName,
    tableNumber,
    taxRate,
    pricingRules = []
}: PublicMenuProps) {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [cartOpen, setCartOpen] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [customizingItem, setCustomizingItem] = useState<PublicMenuItem | null>(null);
    const [checkoutOpen, setCheckoutOpen] = useState(false);

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
    const cartSubtotal = cart.reduce((sum, item) => {
        const modifiersTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0);
        return sum + (item.price + modifiersTotal) * item.quantity;
    }, 0);

    // Handle item click - open customization modal
    const handleItemClick = (item: PublicMenuItem) => {
        setCustomizingItem(item);
    };

    // Handle adding item with customizations to cart
    const handleAddToCart = (notes: string, modifiers: CartModifier[]) => {
        if (!customizingItem) return;

        // Check if a similar item already exists (same id, notes, and modifiers)
        const existingIndex = cart.findIndex(c =>
            c.id === customizingItem.id &&
            c.notes === notes &&
            JSON.stringify(c.modifiers) === JSON.stringify(modifiers)
        );

        if (existingIndex !== -1) {
            // Increment quantity
            const newCart = [...cart];
            newCart[existingIndex] = {
                ...newCart[existingIndex],
                quantity: newCart[existingIndex].quantity + 1
            };
            setCart(newCart);
        } else {
            // Add as new item
            setCart([...cart, {
                id: customizingItem.id,
                name: customizingItem.name,
                price: customizingItem.price,
                quantity: 1,
                notes: notes || undefined,
                modifiers,
                category_id: customizingItem.category_id
            }]);
        }

        toast.success(`Added ${customizingItem.name} to order`);
        setCustomizingItem(null);
    };

    const updateQuantity = (index: number, delta: number) => {
        const newCart = cart.map((item, i) =>
            i === index ? { ...item, quantity: item.quantity + delta } : item
        ).filter(item => item.quantity > 0);
        setCart(newCart);
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;
        setCartOpen(false);
        setCheckoutOpen(true);
    };

    const handleCheckoutSuccess = () => {
        setCart([]);
        setCheckoutOpen(false);
    };

    // Helper to calculate adjusted price
    const getAdjustedPrice = (item: PublicMenuItem) => {
        let adjustedPrice = item.price;
        let appliedRule: PricingRule | null = null;

        // Find the first applicable rule
        for (const rule of pricingRules) {
            const appliesToCategory = rule.category_ids.length === 0 || rule.category_ids.includes(item.category_id);
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
                break; // Only apply one rule for simplicity
            }
        }

        return {
            price: Math.max(0, adjustedPrice),
            isAdjusted: appliedRule !== null,
            ruleType: appliedRule?.rule_type
        };
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
                        onClick={() => handleItemClick(item)}
                    >
                        <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-slate-100">{item.name}</h3>
                                <div className="flex flex-col items-end">
                                    {getAdjustedPrice(item).isAdjusted ? (
                                        <>
                                            <span className={cn(
                                                "font-bold px-2 py-0.5 rounded text-sm",
                                                getAdjustedPrice(item).ruleType === 'surge' ? "text-orange-400 bg-orange-500/10" : "text-green-400 bg-green-500/10"
                                            )}>
                                                {formatCurrency(getAdjustedPrice(item).price)}
                                            </span>
                                            <span className="text-[10px] text-slate-500 line-through">
                                                {formatCurrency(item.price)}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded text-sm">
                                            {formatCurrency(item.price)}
                                        </span>
                                    )}
                                </div>
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
                            {cart.map((item, idx) => {
                                const modifiersTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0);
                                const itemTotal = item.price + modifiersTotal;
                                return (
                                    <div key={idx} className="flex items-start justify-between group py-2 border-b border-slate-800/50 last:border-0">
                                        <div className="flex-1">
                                            <p className="font-bold text-sm text-slate-200">{item.name}</p>
                                            <p className="text-xs text-slate-500">{formatCurrency(itemTotal)}</p>
                                            {item.modifiers.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {item.modifiers.map((mod, i) => (
                                                        <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                                                            +{mod.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {item.notes && (
                                                <p className="text-[10px] text-orange-400 italic mt-1">"{item.notes}"</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
                                            <button
                                                onClick={() => updateQuantity(idx, -1)}
                                                className="hover:text-white text-slate-400 transition-colors"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="text-sm font-bold w-4 text-center text-slate-200">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(idx, 1)}
                                                className="hover:text-white text-slate-400 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
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
                                <span className="text-slate-400">Subtotal</span>
                                <span className="text-3xl font-bold text-slate-100">{formatCurrency(cartSubtotal)}</span>
                            </div>
                            <button
                                onClick={handleCheckout}
                                className="btn btn-primary w-full py-4 rounded-2xl text-lg font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                                disabled={cart.length === 0}
                            >
                                Checkout
                                <ChevronRight className="w-5 h-5 opacity-50" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Bar (Mobile) */}
            {cartCount > 0 && !cartOpen && !checkoutOpen && (
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
                    <span className="font-bold text-slate-900 text-lg">{formatCurrency(cartSubtotal)}</span>
                </div>
            )}

            {/* Item Customization Modal */}
            {customizingItem && (
                <ItemCustomizationModal
                    item={customizingItem}
                    locationId={locationId}
                    onClose={() => setCustomizingItem(null)}
                    onConfirm={handleAddToCart}
                />
            )}

            {/* Checkout Modal */}
            {checkoutOpen && (
                <CheckoutModal
                    cart={cart}
                    locationId={locationId}
                    locationName={locationName}
                    tableNumber={tableNumber}
                    taxRate={taxRate}
                    onClose={() => setCheckoutOpen(false)}
                    onSuccess={handleCheckoutSuccess}
                />
            )}
        </div>
    );
}
