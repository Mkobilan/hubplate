"use client";

import { useEffect, useState } from "react";
import {
    Receipt,
    Banknote,
    CreditCard,
    TrendingUp,
    Users,
    Gift,
    ChevronDown,
    ChevronUp,
    Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { formatCurrency } from "@/lib/utils";
import { startOfDay, endOfDay, format } from "date-fns";
import Link from "next/link";

interface SettlementStats {
    totalTickets: number;
    cashTotal: number;
    cardTotal: number;
    tipsTotal: number;
    loyaltySignups: number;
    pointsRedeemed: number;
}

interface TicketSummary {
    id: string;
    table_number: string | null;
    order_type: string;
    total: number;
    tip: number;
    payment_method: string | null;
    payment_status: string;
    status: string;
    created_at: string;
}

export default function ServerSettlement() {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [stats, setStats] = useState<SettlementStats>({
        totalTickets: 0,
        cashTotal: 0,
        cardTotal: 0,
        tipsTotal: 0,
        loyaltySignups: 0,
        pointsRedeemed: 0
    });
    const [tickets, setTickets] = useState<TicketSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const fetchSettlementData = async () => {
            if (!currentEmployee || !currentLocation) return;

            try {
                setLoading(true);
                const supabase = createClient();
                const today = new Date();
                const start = startOfDay(today).toISOString();
                const end = endOfDay(today).toISOString();

                // Fetch today's orders for this server
                const { data: orders, error: ordersError } = await (supabase
                    .from("orders") as any)
                    .select("id, table_number, order_type, total, tip, payment_method, payment_status, status, created_at")
                    .eq("server_id", currentEmployee.id)
                    .eq("location_id", currentLocation.id)
                    .gte("created_at", start)
                    .lte("created_at", end)
                    .order("created_at", { ascending: false });

                if (ordersError) throw ordersError;

                const ordersList = orders || [];
                setTickets(ordersList);

                // Calculate stats
                const paidOrders = ordersList.filter((o: any) => o.payment_status === "paid");
                const cashOrders = paidOrders.filter((o: any) => o.payment_method === "cash");
                const cardOrders = paidOrders.filter((o: any) => o.payment_method === "card" || o.payment_method === "stripe");

                const cashTotal = cashOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
                const cardTotal = cardOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
                const tipsTotal = paidOrders.reduce((sum: number, o: any) => sum + Number(o.tip || 0), 0);

                // Fetch loyalty signups (customers created today linked to server's orders)
                const orderIds = ordersList.map((o: any) => o.id);
                let loyaltySignups = 0;
                let pointsRedeemed = 0;

                if (orderIds.length > 0) {
                    // Count customers created today at this location
                    const { data: customers, error: custError } = await (supabase
                        .from("customers") as any)
                        .select("id")
                        .eq("location_id", currentLocation.id)
                        .gte("created_at", start)
                        .lte("created_at", end);

                    if (!custError && customers) {
                        loyaltySignups = customers.length;
                    }

                    // Count redemptions for this server's orders
                    const { data: redemptions, error: redemError } = await (supabase
                        .from("reward_redemptions") as any)
                        .select("points_used")
                        .in("order_id", orderIds);

                    if (!redemError && redemptions) {
                        pointsRedeemed = redemptions.reduce((sum: number, r: any) => sum + Number(r.points_used || 0), 0);
                    }
                }

                setStats({
                    totalTickets: ordersList.length,
                    cashTotal,
                    cardTotal,
                    tipsTotal,
                    loyaltySignups,
                    pointsRedeemed
                });

            } catch (err) {
                console.error("Error fetching settlement data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettlementData();

        // Subscribe to real-time updates
        if (!currentEmployee || !currentLocation) return;

        const supabase = createClient();
        const subscription = supabase
            .channel("settlement_updates")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders",
                    filter: `server_id=eq.${currentEmployee.id}`
                },
                () => {
                    fetchSettlementData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [currentEmployee?.id, currentLocation?.id]);

    if (!currentEmployee) return null;

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-orange-400" />
                    <h2 className="text-lg font-semibold">Today's Tickets</h2>
                </div>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>

            {/* Summary Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <Receipt className="h-3 w-3" />
                        <span>Total Tickets</span>
                    </div>
                    <p className="text-xl font-bold">{stats.totalTickets}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-400 text-xs mb-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Tips Earned</span>
                    </div>
                    <p className="text-xl font-bold text-green-400">{formatCurrency(stats.tipsTotal)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1">
                        <Banknote className="h-3 w-3" />
                        <span>Cash</span>
                    </div>
                    <p className="text-lg font-semibold">{formatCurrency(stats.cashTotal)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-400 text-xs mb-1">
                        <CreditCard className="h-3 w-3" />
                        <span>Card</span>
                    </div>
                    <p className="text-lg font-semibold">{formatCurrency(stats.cardTotal)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-purple-400 text-xs mb-1">
                        <Users className="h-3 w-3" />
                        <span>Loyalty Signups</span>
                    </div>
                    <p className="text-lg font-semibold">{stats.loyaltySignups}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
                        <Gift className="h-3 w-3" />
                        <span>Points Redeemed</span>
                    </div>
                    <p className="text-lg font-semibold">{stats.pointsRedeemed}</p>
                </div>
            </div>

            {/* Expandable Ticket List */}
            {tickets.length > 0 && (
                <>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-slate-300 py-2 border-t border-slate-800"
                    >
                        <span>View Ticket Details ({tickets.length})</span>
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {expanded && (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="flex items-center justify-between py-2 px-3 bg-slate-800/30 rounded-lg text-sm"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {ticket.order_type === "dine_in"
                                                ? `Table ${ticket.table_number || "N/A"}`
                                                : ticket.order_type?.replace("_", " ").toUpperCase()}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {format(new Date(ticket.created_at), "h:mm a")}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{formatCurrency(ticket.total)}</p>
                                        <div className="flex items-center gap-2 text-xs">
                                            {ticket.tip > 0 && (
                                                <span className="text-green-400">+{formatCurrency(ticket.tip)}</span>
                                            )}
                                            <span className={`${ticket.payment_status === "paid"
                                                ? "text-green-400"
                                                : "text-amber-400"
                                                }`}>
                                                {ticket.payment_method === "cash" && "💵"}
                                                {(ticket.payment_method === "card" || ticket.payment_method === "stripe") && "💳"}
                                                {!ticket.payment_method && ticket.payment_status === "paid" && "✓ paid"}
                                                {!ticket.payment_method && ticket.payment_status !== "paid" && "unpaid"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {tickets.length === 0 && !loading && (
                <div className="text-center py-6 text-slate-500">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tickets yet today</p>
                </div>
            )}

            {/* View Full Settlement Link */}
            <Link
                href="/dashboard/settlement"
                className="btn btn-ghost w-full mt-4 text-sm text-center block"
            >
                View Full Settlement →
            </Link>
        </div>
    );
}
