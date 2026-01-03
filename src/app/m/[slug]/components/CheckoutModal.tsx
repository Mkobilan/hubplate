"use client";

import { useState } from "react";
import { X, Loader2, ChevronRight, ShoppingBag, MessageSquare } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { CartModifier } from "./ItemCustomizationModal";

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    modifiers: CartModifier[];
    category_id: string;
}

interface CheckoutModalProps {
    cart: CartItem[];
    locationId: string;
    locationName: string;
    tableNumber?: string;
    taxRate: number;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CheckoutModal({
    cart,
    locationId,
    locationName,
    tableNumber,
    taxRate,
    onClose,
    onSuccess
}: CheckoutModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [orderNotes, setOrderNotes] = useState("");

    // Customer info (optional)
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => {
        const itemModifiersTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0);
        return sum + (item.price + itemModifiersTotal) * item.quantity;
    }, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const handleSubmit = async () => {
        if (cart.length === 0) return;

        setLoading(true);
        try {
            const response = await fetch("/api/online-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    locationId,
                    tableNumber: tableNumber || null,
                    orderType: tableNumber ? "dine_in" : "pickup",
                    items: cart.map(item => ({
                        id: crypto.randomUUID(),
                        menu_item_id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        notes: item.notes || null,
                        modifiers: item.modifiers,
                        status: "sent",
                        sent_at: new Date().toISOString()
                    })),
                    subtotal,
                    tax,
                    total,
                    orderNotes: orderNotes.trim() || null,
                    customer: (name || phone || email) ? {
                        name: name.trim() || null,
                        phone: phone.trim() || null,
                        email: email.trim() || null
                    } : null
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create order");
            }

            const { orderId } = await response.json();

            toast.success("Order placed! Redirecting to payment...");
            onSuccess();

            // Redirect to payment page
            router.push(`/pay/${orderId}`);
        } catch (error: any) {
            console.error("Checkout error:", error);
            toast.error(error.message || "Failed to place order");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-slate-900 w-full max-w-lg md:rounded-2xl rounded-t-3xl border-t md:border border-slate-800 p-6 animate-slide-up md:animate-in md:zoom-in-95 md:duration-200 max-h-[90vh] overflow-y-auto">
                {/* Handle for mobile */}
                <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6 md:hidden" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-xl">
                            <ShoppingBag className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-100">Checkout</h2>
                            <p className="text-sm text-slate-400">{locationName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Order Summary */}
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                            Order Summary
                        </h3>
                        <div className="space-y-3 max-h-[150px] overflow-y-auto">
                            {cart.map((item, idx) => {
                                const itemModifiersTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0);
                                const itemTotal = (item.price + itemModifiersTotal) * item.quantity;
                                return (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <div className="flex-1">
                                            <span className="text-slate-200">
                                                {item.quantity}x {item.name}
                                            </span>
                                            {item.modifiers.length > 0 && (
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    {item.modifiers.map(m => m.name).join(", ")}
                                                </div>
                                            )}
                                            {item.notes && (
                                                <div className="text-[10px] text-orange-400 italic mt-0.5">
                                                    "{item.notes}"
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-slate-400">{formatCurrency(itemTotal)}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="border-t border-slate-700 mt-3 pt-3 space-y-1">
                            <div className="flex justify-between text-sm text-slate-400">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-400">
                                <span>Tax ({taxRate}%)</span>
                                <span>{formatCurrency(tax)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-700 text-slate-100">
                                <span>Total</span>
                                <span className="text-orange-400">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Order Notes */}
                    <div>
                        <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">
                            <MessageSquare className="h-3 w-3" />
                            Order Notes (Optional)
                        </label>
                        <textarea
                            placeholder="Any special instructions for your entire order..."
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 min-h-[60px] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 resize-none"
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                        />
                    </div>

                    {/* Customer Info */}
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                            Your Information (Optional)
                        </h3>
                        <p className="text-xs text-slate-500 mb-3">
                            Provide your details for order updates and faster checkout next time.
                        </p>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Name"
                                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="tel"
                                    placeholder="Phone"
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading || cart.length === 0}
                        className="btn btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                Proceed to Payment
                                <ChevronRight className="h-5 w-5 opacity-50" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-slate-500">
                        You'll be redirected to a secure payment page.
                    </p>
                </div>
            </div>
        </div>
    );
}
