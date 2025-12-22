"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    QrCode,
    CreditCard,
    Smartphone,
    CheckCircle2,
    Clock,
    DollarSign,
    Receipt,
    Star,
    Send,
    X
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Mock order for pay-at-table demo
const mockOrder = {
    id: "ORD-8765",
    table: "Table 12",
    items: [
        { name: "Grilled Salmon", price: 28.99, quantity: 1 },
        { name: "House Salad", price: 9.99, quantity: 1 },
        { name: "Glass of Chardonnay", price: 12.00, quantity: 2 },
    ],
    subtotal: 62.98,
    tax: 5.04,
    total: 68.02
};

const tipOptions = [15, 18, 20, 25];

export default function PayAtTablePage() {
    const { t } = useTranslation();
    const [selectedTip, setSelectedTip] = useState<number | null>(18);
    const [customTip, setCustomTip] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"card" | "digital" | null>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [rating, setRating] = useState<number | null>(null);

    const tipAmount = selectedTip ? (mockOrder.subtotal * selectedTip) / 100 : parseFloat(customTip) || 0;
    const grandTotal = mockOrder.total + tipAmount;

    const handlePay = () => {
        setIsPaid(true);
        setTimeout(() => setShowFeedback(true), 1500);
    };

    if (isPaid && showFeedback) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-10 w-10 text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Thank You!</h1>
                        <p className="text-slate-400 mt-2">Your payment of {formatCurrency(grandTotal)} was successful.</p>
                    </div>

                    <div className="p-4 bg-slate-900/50 rounded-xl">
                        <p className="text-sm text-slate-500 mb-3">How was your experience?</p>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={cn(
                                        "p-2 rounded-lg transition-all",
                                        rating && star <= rating ? "text-yellow-400" : "text-slate-600 hover:text-yellow-400/50"
                                    )}
                                >
                                    <Star className={cn("h-8 w-8", rating && star <= rating && "fill-yellow-400")} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button className="btn-secondary w-full">
                            <Receipt className="h-4 w-4" />
                            Email Receipt
                        </button>
                        <button className="btn-primary w-full">
                            <Send className="h-4 w-4" />
                            Share Feedback
                        </button>
                    </div>

                    <p className="text-xs text-slate-500">
                        Receipt #PAY-{mockOrder.id.split("-")[1]} • {new Date().toLocaleDateString()}
                    </p>
                </div>
            </div>
        );
    }

    if (isPaid) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Clock className="h-10 w-10 text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold">Processing Payment...</h2>
                    <p className="text-slate-400">Please wait while we confirm your transaction.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8">
            <div className="max-w-md mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <QrCode className="h-8 w-8 text-orange-400" />
                    </div>
                    <h1 className="text-2xl font-bold">{mockOrder.table}</h1>
                    <p className="text-slate-400">Order #{mockOrder.id}</p>
                </div>

                {/* Order Summary */}
                <div className="card">
                    <h3 className="font-bold mb-4">Your Order</h3>
                    <div className="space-y-3">
                        {mockOrder.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                                <span className="text-slate-400">
                                    {item.quantity}x {item.name}
                                </span>
                                <span>{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Subtotal</span>
                            <span>{formatCurrency(mockOrder.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Tax</span>
                            <span>{formatCurrency(mockOrder.tax)}</span>
                        </div>
                    </div>
                </div>

                {/* Tip Selection */}
                <div className="card">
                    <h3 className="font-bold mb-4">Add a Tip</h3>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {tipOptions.map((tip) => (
                            <button
                                key={tip}
                                onClick={() => { setSelectedTip(tip); setCustomTip(""); }}
                                className={cn(
                                    "py-3 rounded-xl font-bold transition-all",
                                    selectedTip === tip
                                        ? "bg-orange-500 text-white"
                                        : "bg-slate-800 hover:bg-slate-700"
                                )}
                            >
                                {tip}%
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="number"
                            className="input pl-8"
                            placeholder="Custom amount"
                            value={customTip}
                            onChange={(e) => { setCustomTip(e.target.value); setSelectedTip(null); }}
                        />
                    </div>
                    {tipAmount > 0 && (
                        <p className="text-center text-sm text-slate-500 mt-2">
                            Tip: {formatCurrency(tipAmount)}
                        </p>
                    )}
                </div>

                {/* Total */}
                <div className="card bg-orange-500/10 border-orange-500/30">
                    <div className="flex justify-between items-center">
                        <span className="font-bold">Total</span>
                        <span className="text-3xl font-bold text-orange-400">{formatCurrency(grandTotal)}</span>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3">
                    <button
                        onClick={() => { setPaymentMethod("card"); handlePay(); }}
                        className="btn-primary w-full py-4"
                    >
                        <CreditCard className="h-5 w-5" />
                        Pay with Card
                    </button>
                    <button
                        onClick={() => { setPaymentMethod("digital"); handlePay(); }}
                        className="btn-secondary w-full py-4"
                    >
                        <Smartphone className="h-5 w-5" />
                        Apple Pay / Google Pay
                    </button>
                </div>

                <p className="text-center text-xs text-slate-500">
                    Payments powered by Stripe. Your card information is encrypted end-to-end.
                </p>
            </div>
        </div>
    );
}
