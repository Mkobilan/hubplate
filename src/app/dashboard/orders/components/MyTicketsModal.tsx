"use client";

import { useEffect, useState } from "react";
import { X, Clock, DollarSign, LayoutList, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MyTicketsModalProps {
    onClose: () => void;
    onSelectOrder: (order: any) => void;
}

export default function MyTicketsModal({ onClose, onSelectOrder }: MyTicketsModalProps) {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const supabase = createClient();

    useEffect(() => {
        const fetchMyTickets = async () => {
            if (!currentLocation?.id || !currentEmployee?.id) return;

            try {
                const { data, error } = await supabase
                    .from("orders")
                    .select("*")
                    .eq("location_id", currentLocation.id)
                    .eq("server_id", currentEmployee.id)
                    .neq("payment_status", "paid")
                    .neq("status", "cancelled")
                    .order("created_at", { ascending: false });

                if (error) throw error;
                setOrders(data || []);
            } catch (error) {
                console.error("Error fetching tickets:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMyTickets();
    }, [currentLocation?.id, currentEmployee?.id]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative card w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <LayoutList className="h-6 w-6 text-orange-500" />
                        <h2 className="text-xl font-bold text-slate-100">My Active Tickets</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-2" />
                            <p className="text-slate-400">Loading your tickets...</p>
                        </div>
                    ) : orders.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {orders.map((order) => (
                                <button
                                    key={order.id}
                                    onClick={() => onSelectOrder(order)}
                                    className="flex flex-col p-4 bg-slate-800/40 border border-slate-700 rounded-xl text-left hover:border-orange-500/50 hover:bg-slate-800/60 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-lg text-slate-100">
                                            {order.order_type === 'dine_in' ? `Table ${order.table_number}` : order.order_type.toUpperCase()}
                                        </div>
                                        <span className={cn(
                                            "badge text-[10px] uppercase",
                                            order.status === 'pending' && "badge-info",
                                            order.status === 'in_progress' && "badge-warning",
                                            order.status === 'ready' && "badge-success animate-pulse",
                                            order.status === 'served' && "bg-slate-700 text-slate-300"
                                        )}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-auto">
                                        <div className="flex items-center gap-1 text-slate-400 text-sm">
                                            <Clock className="h-3 w-3" />
                                            <span>{Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 60000)}m</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-orange-400 font-bold ml-auto">
                                            <DollarSign className="h-4 w-4" />
                                            <span>{formatCurrency(order.total)}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <LayoutList className="h-12 w-12 opacity-20 mb-4" />
                            <p>You have no active tickets</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-800 text-center">
                    <button onClick={onClose} className="btn btn-secondary w-full">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
