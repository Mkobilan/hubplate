"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Receipt,
    Users,
    DollarSign,
    Percent,
    Calculator,
    Check,
    CreditCard,
    Smartphone,
    ArrowRight,
    X,
    Plus,
    Minus
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";

// Order type for Supabase integration (bill split)
type OrderItemSplit = { id: string; name: string; price: number; quantity: number };
type OrderSplit = {
    id: string;
    table: string;
    items: OrderItemSplit[];
    subtotal: number;
    tax: number;
    total: number;
};

// TODO: Fetch from Supabase based on order id param
const order: OrderSplit | null = null;

type SplitMethod = "equal" | "by-item" | "custom";

export default function BillSplitPage() {
    const { t } = useTranslation();
    const [splitMethod, setSplitMethod] = useState<SplitMethod | null>(null);
    const [numberOfGuests, setNumberOfGuests] = useState(2);
    const [selectedItems, setSelectedItems] = useState<Record<string, number[]>>({});
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [payingGuest, setPayingGuest] = useState<number | null>(null);

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] space-y-4">
                <Receipt className="h-12 w-12 text-slate-700" />
                <h2 className="text-xl font-bold">Order Not Found</h2>
                <p className="text-slate-500 text-sm">This order might have been closed or the ID is incorrect.</p>
                <Link href="/dashboard/orders" className="btn-primary">Back to Orders</Link>
            </div>
        );
    }

    const perPersonAmount = order.total / numberOfGuests;

    const handlePayGuest = (guestIndex: number) => {
        setPayingGuest(guestIndex);
        setShowPaymentModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Receipt className="h-8 w-8 text-orange-500" />
                        Bill Split - {order.table}
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Order #{order.id} • {formatCurrency(order.total)} total
                    </p>
                </div>
                <button className="btn-secondary">
                    <X className="h-4 w-4" />
                    Cancel Split
                </button>
            </div>

            {/* Split Method Selection */}
            {!splitMethod && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => setSplitMethod("equal")}
                        className="card hover:border-orange-500/50 transition-all text-left group"
                    >
                        <div className="p-3 bg-orange-500/10 rounded-2xl w-fit mb-4 group-hover:bg-orange-500/20 transition-colors">
                            <Users className="h-6 w-6 text-orange-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Split Equally</h3>
                        <p className="text-sm text-slate-500">
                            Divide the total bill evenly among all guests.
                        </p>
                    </button>

                    <button
                        onClick={() => setSplitMethod("by-item")}
                        className="card hover:border-orange-500/50 transition-all text-left group"
                    >
                        <div className="p-3 bg-blue-500/10 rounded-2xl w-fit mb-4 group-hover:bg-blue-500/20 transition-colors">
                            <Receipt className="h-6 w-6 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">By Item</h3>
                        <p className="text-sm text-slate-500">
                            Let each guest select which items they ordered.
                        </p>
                    </button>

                    <button
                        onClick={() => setSplitMethod("custom")}
                        className="card hover:border-orange-500/50 transition-all text-left group"
                    >
                        <div className="p-3 bg-purple-500/10 rounded-2xl w-fit mb-4 group-hover:bg-purple-500/20 transition-colors">
                            <Calculator className="h-6 w-6 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Custom Amount</h3>
                        <p className="text-sm text-slate-500">
                            Enter specific amounts for each guest to pay.
                        </p>
                    </button>
                </div>
            )}

            {/* Equal Split View */}
            {splitMethod === "equal" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card">
                        <h3 className="font-bold mb-6">Number of Guests</h3>
                        <div className="flex items-center justify-center gap-6">
                            <button
                                onClick={() => setNumberOfGuests(Math.max(2, numberOfGuests - 1))}
                                className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
                            >
                                <Minus className="h-6 w-6" />
                            </button>
                            <span className="text-5xl font-bold">{numberOfGuests}</span>
                            <button
                                onClick={() => setNumberOfGuests(Math.min(10, numberOfGuests + 1))}
                                className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
                            >
                                <Plus className="h-6 w-6" />
                            </button>
                        </div>
                        <p className="text-center text-slate-500 mt-4">
                            {formatCurrency(perPersonAmount)} per person (incl. tax)
                        </p>
                    </div>

                    <div className="card">
                        <h3 className="font-bold mb-4">Guest Payments</h3>
                        <div className="space-y-3">
                            {Array.from({ length: numberOfGuests }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium">Guest {i + 1}</p>
                                            <p className="text-sm text-slate-500">{formatCurrency(perPersonAmount)}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handlePayGuest(i)}
                                        className="btn-primary text-sm py-2"
                                    >
                                        Pay Now
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* By Item View */}
            {splitMethod === "by-item" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card">
                        <h3 className="font-bold mb-4">Order Items</h3>
                        <div className="space-y-3">
                            {order.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800"
                                >
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-sm text-slate-500">
                                            {item.quantity}x @ {formatCurrency(item.price)}
                                        </p>
                                    </div>
                                    <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-slate-500">Total (incl. tax)</span>
                            <span className="text-xl font-bold">{formatCurrency(order.total)}</span>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="font-bold mb-4">Assign Items to Guests</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Tap an item, then tap a guest to assign it to them.
                        </p>
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium">Guest {i + 1}</p>
                                            <p className="text-xs text-slate-500">0 items assigned</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-slate-500">{formatCurrency(0)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Split View */}
            {splitMethod === "custom" && (
                <div className="card max-w-xl mx-auto">
                    <h3 className="font-bold mb-6">Enter Custom Amounts</h3>
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold shrink-0">
                                    {i + 1}
                                </div>
                                <div className="flex-1 relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        type="number"
                                        className="input pl-8"
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                                <button className="btn-primary text-sm py-2 whitespace-nowrap">
                                    Pay Now
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                        <span className="text-slate-500">Remaining</span>
                        <span className="text-xl font-bold text-orange-400">{formatCurrency(order.total)}</span>
                    </div>
                </div>
            )}

            {/* Back Button */}
            {splitMethod && (
                <div className="text-center">
                    <button onClick={() => setSplitMethod(null)} className="btn-secondary">
                        ← Choose Different Method
                    </button>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowPaymentModal(false)} />
                    <div className="relative card w-full max-w-md text-center">
                        <button
                            onClick={() => setShowPaymentModal(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="p-3 bg-orange-500/20 rounded-2xl w-fit mx-auto mb-4">
                            <CreditCard className="h-8 w-8 text-orange-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Guest {(payingGuest || 0) + 1} Payment</h2>
                        <p className="text-4xl font-bold text-orange-400 mb-6">{formatCurrency(perPersonAmount)}</p>

                        <div className="space-y-3">
                            <button className="btn-primary w-full py-4">
                                <CreditCard className="h-5 w-5" />
                                Pay with Card
                            </button>
                            <button className="btn-secondary w-full py-4">
                                <Smartphone className="h-5 w-5" />
                                Tap-to-Pay
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
