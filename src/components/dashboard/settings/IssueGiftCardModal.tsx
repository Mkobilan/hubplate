"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import {
    X,
    CreditCard,
    Smartphone,
    Loader2,
    Sparkles,
    Hash,
    DollarSign,
    User
} from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface IssueGiftCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    onComplete: (data?: any) => void;
}


export function IssueGiftCardModal({ isOpen, onClose, locationId, onComplete }: IssueGiftCardModalProps) {
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<"physical" | "digital">("physical");
    const [cardNumber, setCardNumber] = useState("");
    const [amount, setAmount] = useState("");
    const [customerName, setCustomerName] = useState("");

    const generateRandomCode = () => {
        // Generate a random 12-digit code for digital cards
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 12; i++) {
            if (i > 0 && i % 4 === 0) result += "-";
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCardNumber(result);
    };

    const handleIssue = async () => {
        if (!cardNumber || !amount) {
            toast.error("Please fill in all required fields");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/gift-cards/issue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    locationId,
                    cardNumber,
                    amount: parseFloat(amount),
                    isDigital: type === "digital",
                    metadata: {
                        customer_name: customerName || null
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to issue gift card");
            }

            toast.success(`${type === "physical" ? "Gift card" : "Digital code"} issued successfully`);
            const responseData = await response.json();
            onComplete(responseData.data);
            onClose();

            // Reset form
            setCardNumber("");
            setAmount("");
            setCustomerName("");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Issue New Gift Card"
        >
            <div className="space-y-6 pt-4">
                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => {
                            setType("physical");
                            setCardNumber("");
                        }}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === "physical"
                            ? "border-orange-500 bg-orange-500/10 text-orange-500"
                            : "border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700"
                            }`}
                    >
                        <CreditCard className="h-6 w-6" />
                        <span className="text-sm font-bold">Physical Card</span>
                    </button>
                    <button
                        onClick={() => {
                            setType("digital");
                            if (!cardNumber) generateRandomCode();
                        }}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === "digital"
                            ? "border-orange-500 bg-orange-500/10 text-orange-500"
                            : "border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700"
                            }`}
                    >
                        <Smartphone className="h-6 w-6" />
                        <span className="text-sm font-bold">Digital Code</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Card Number / Code */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase px-1 flex justify-between">
                            {type === "physical" ? "Card Number" : "Digital Code"}
                            {type === "digital" && (
                                <button
                                    onClick={generateRandomCode}
                                    className="text-orange-500 hover:text-orange-400 flex items-center gap-1"
                                >
                                    <Sparkles className="h-3 w-3" />
                                    Regenerate
                                </button>
                            )}
                        </label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                <Hash className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder={type === "physical" ? "Enter card number" : "GIFT-XXXX-XXXX"}
                                className="input pl-10"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase px-1">Initial Balance</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                <DollarSign className="h-4 w-4" />
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="input pl-10"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Customer Info (Optional) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase px-1">Customer Name (Optional)</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                <User className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="For record keeping"
                                className="input pl-10"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-800">
                    <button onClick={onClose} className="btn btn-secondary flex-1">
                        Cancel
                    </button>
                    <button
                        onClick={handleIssue}
                        disabled={loading || !cardNumber || !amount}
                        className="btn btn-primary flex-1"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue Gift Card"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
