"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { Mail, Loader2, Send } from "lucide-react";

interface EmailGiftCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    card: any;
    locationId: string;
}

export function EmailGiftCardModal({ isOpen, onClose, card, locationId }: EmailGiftCardModalProps) {
    const [email, setEmail] = useState(card?.metadata?.customer_email || "");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!email) {
            toast.error("Please enter an email address");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/gift-cards/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cardId: card.id,
                    email,
                    locationId
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to send email");
            }

            toast.success("Gift card emailed successfully!");
            onClose();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!card) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Email Gift Card"
        >
            <div className="space-y-6 pt-4">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Card Number:</span>
                        <span className="font-mono font-bold text-orange-400">{card.card_number}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Current Balance:</span>
                        <span className="font-bold">${card.current_balance.toFixed(2)}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase px-1">Recipient Email</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                            <Mail className="h-4 w-4" />
                        </div>
                        <input
                            type="email"
                            placeholder="customer@example.com"
                            className="input pl-10"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 px-1">
                        The gift card details will be sent immediately to this address.
                    </p>
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-800">
                    <button onClick={onClose} className="btn btn-secondary flex-1">
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={loading || !email}
                        className="btn btn-primary flex-1 bg-orange-600 hover:bg-orange-700 border-none"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Send Email
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
