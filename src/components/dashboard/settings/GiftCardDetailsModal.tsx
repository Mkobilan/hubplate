"use client";

import { useState, useEffect } from "react";
import {
    X,
    CreditCard,
    Smartphone,
    Calendar,
    DollarSign,
    User,
    History,
    CheckCircle2,
    XCircle,
    Loader2,
    ExternalLink,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface GiftCardDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    card: any;
    locationId: string;
}

export function GiftCardDetailsModal({ isOpen, onClose, card, locationId }: GiftCardDetailsModalProps) {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        if (isOpen && card) {
            fetchHistory();
        }
    }, [isOpen, card]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Reconstruct history from orders
            // 1. Where this card was used for payment
            // 2. Where this card was issued (menu item id 'gift_card_issuance')
            // 3. Where this card was used in partial payments

            const { data: orders, error } = await supabase
                .from("orders")
                .select("id, table_number, order_type, items, metadata, payment_method, total, created_at, paid_at")
                .eq("location_id", locationId)
                .or(`payment_method.eq.gift_card,metadata->>gift_card_number.eq.${card.card_number}`);

            // Note: Supabase JS filter for JSONB content might be tricky with partial_payments.
            // Let's fetch orders at this location and filter in JS for now as a robust fallback.
            // In a large DB, we'd use a more specialized query or an RPC.

            const { data: allRelatedOrders, error: allOrdersError } = await (supabase
                .from("orders") as any)
                .select("id, table_number, order_type, items, metadata, payment_method, total, created_at, paid_at")
                .eq("location_id", locationId)
                .order("created_at", { ascending: false });

            if (allOrdersError) throw allOrdersError;

            const usageLogs: any[] = [];

            (allRelatedOrders || []).forEach((order: any) => {
                // Check if card was ISSUED in this order
                const issuedItem = (order.items as any[])?.find(item =>
                    item.menu_item_id === "gift_card_issuance" && item.name.includes(card.card_number)
                );
                if (issuedItem) {
                    usageLogs.push({
                        id: `${order.id}-issue`,
                        orderId: order.id,
                        type: "issuance",
                        amount: issuedItem.price,
                        date: order.created_at,
                        description: `Card Issued (Table ${order.table_number})`
                    });
                }

                // Check if card was used for FULL payment
                if (order.payment_method === "gift_card" && order.metadata?.gift_card_number === card.card_number) {
                    usageLogs.push({
                        id: `${order.id}-payment`,
                        orderId: order.id,
                        type: "payment",
                        amount: -order.total,
                        date: order.paid_at || order.created_at,
                        description: `Full Payment (Order #${order.id.slice(0, 8)})`
                    });
                }

                // Check for PARTIAL payments
                const partials = (order.metadata as any)?.partial_payments || [];
                partials.forEach((p: any, idx: number) => {
                    if (p.method === "gift_card" && p.card_number === card.card_number) {
                        usageLogs.push({
                            id: `${order.id}-partial-${idx}`,
                            orderId: order.id,
                            type: "payment",
                            amount: -p.amount,
                            date: p.at || order.created_at,
                            description: `Partial Payment (Order #${order.id.slice(0, 8)})`
                        });
                    }
                });
            });

            // Sort by date descending
            usageLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setHistory(usageLogs);
        } catch (err) {
            console.error("Error fetching gift card history:", err);
            toast.error("Failed to load usage history");
        } finally {
            setLoading(false);
        }
    };

    if (!card) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Gift Card Details"
        >
            <div className="space-y-6 pt-4">
                {/* Basic Info Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        {card.is_active ? (
                            <span className="badge bg-green-500/10 text-green-500 border-green-500/20 px-3 py-1">Active</span>
                        ) : (
                            <span className="badge bg-red-500/10 text-red-500 border-red-500/20 px-3 py-1">Inactive</span>
                        )}
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Card Number</p>
                        <h3 className="text-2xl font-mono font-bold text-orange-400 tracking-tighter">
                            {card.card_number.replace(/(.{4})/g, "$1 ").trim()}
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Balance</p>
                            <p className="text-3xl font-black text-white">{formatCurrency(card.current_balance)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Original Balance</p>
                            <p className="text-xl font-bold text-slate-400">{formatCurrency(card.original_balance)}</p>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-2">
                            {card.metadata?.is_digital ? <Smartphone className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                            <span>{card.metadata?.is_digital ? "Digital Code" : "Physical Card"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Issued {new Date(card.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Additional Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card-sub p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                        <div className="flex items-center gap-3 mb-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</span>
                        </div>
                        <p className="text-sm font-bold text-slate-200">
                            {card.metadata?.customer_name || "Anonymous Guest"}
                        </p>
                        {card.metadata?.customer_email && (
                            <p className="text-xs text-slate-500 mt-1">{card.metadata.customer_email}</p>
                        )}
                    </div>
                    <div className="card-sub p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                        <div className="flex items-center gap-3 mb-2">
                            <History className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Used</span>
                        </div>
                        <p className="text-sm font-bold text-slate-200">
                            {card.last_used_at ? new Date(card.last_used_at).toLocaleDateString() : "Never"}
                        </p>
                    </div>
                </div>

                {/* History Section */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <History className="h-4 w-4" /> Usage History
                        </h4>
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                    </div>

                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                        {history.length > 0 ? (
                            <div className="divide-y divide-slate-800 transition-all">
                                {history.map((log) => (
                                    <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-900/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                log.type === 'issuance' ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                                            )}>
                                                {log.type === 'issuance' ? <Plus className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-200">{log.description}</p>
                                                <p className="text-[10px] text-slate-500 font-medium">{new Date(log.date).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                "font-black text-sm",
                                                log.amount > 0 ? "text-green-500" : "text-white"
                                            )}>
                                                {log.amount > 0 ? "+" : ""}{formatCurrency(log.amount)}
                                            </p>
                                            <button
                                                className="text-[10px] text-orange-500 hover:text-orange-400 flex items-center gap-1 ml-auto mt-1 font-bold"
                                                onClick={() => {
                                                    // In a real app, this would route to the order page or open an order detail modal
                                                    toast.success(`Opening order ${log.orderId.slice(0, 8)}`);
                                                }}
                                            >
                                                Order Details <ArrowUpRight className="h-2 w-2" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <History className="h-8 w-8 text-slate-800 mx-auto mb-2" />
                                <p className="text-sm text-slate-600">No transaction records found.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                    <button onClick={onClose} className="btn btn-secondary flex-1">
                        Close
                    </button>
                    {card.is_active && (
                        <button
                            className="btn bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex-1"
                            onClick={() => {
                                toast.error("Please use the action menu on the main page to deactivate.");
                            }}
                        >
                            Deactivate
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}

// Plus icon was missing from lucide-react imports above, adding it conceptually
const Plus = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
