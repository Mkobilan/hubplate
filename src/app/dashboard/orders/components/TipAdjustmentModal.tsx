"use client";

import { useState } from "react";
import { DollarSign, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface TipAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onSuccess: (updatedOrder: any) => void;
}

export default function TipAdjustmentModal({
    isOpen,
    onClose,
    order,
    onSuccess,
}: TipAdjustmentModalProps) {
    const [tipAmount, setTipAmount] = useState<string>(order?.tip?.toString() || "0");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!order) return;

        const newTip = parseFloat(tipAmount);
        if (isNaN(newTip) || newTip < 0) {
            toast.error("Please enter a valid tip amount");
            return;
        }

        try {
            setLoading(true);
            const supabase = createClient();

            // Recalculate total: subtotal + tax + tip
            const newTotal = Number(order.subtotal || 0) + Number(order.tax || 0) + newTip;

            const { data, error } = await (supabase.from("orders") as any)
                .update({
                    tip: newTip,
                    total: newTotal,
                    updated_at: new Date().toISOString()
                })
                .eq("id", order.id)
                .select()
                .single();

            if (error) throw error;

            toast.success("Tip updated successfully");
            onSuccess(data);
            onClose();
        } catch (err: any) {
            console.error("Error updating tip:", err);
            toast.error(err.message || "Failed to update tip");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Adjust Tip"
            className="max-w-sm"
        >
            <div className="space-y-4 pt-2">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex justify-between text-sm text-slate-400 mb-1">
                        <span>Subtotal</span>
                        <span>{formatCurrency(order?.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400 mb-3">
                        <span>Tax</span>
                        <span>{formatCurrency(order?.tax || 0)}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-700 flex justify-between font-bold text-slate-100">
                        <span>Total (Before Tip)</span>
                        <span>{formatCurrency(Number(order?.subtotal || 0) + Number(order?.tax || 0))}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 px-1">Tip Amount</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="number"
                            step="0.01"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-lg font-bold focus:border-orange-500 outline-none transition-colors"
                            value={tipAmount}
                            onChange={(e) => setTipAmount(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg">
                    <div className="flex justify-between items-center font-bold">
                        <span className="text-orange-200">New Total</span>
                        <span className="text-xl text-orange-400">
                            {formatCurrency(Number(order?.subtotal || 0) + Number(order?.tax || 0) + (parseFloat(tipAmount) || 0))}
                        </span>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary flex-1"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn btn-primary flex-1"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Update Tip"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
