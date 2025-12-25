"use client";

import { useEffect, useState } from "react";
import {
    Receipt,
    Banknote,
    CreditCard,
    TrendingUp,
    Users,
    Gift,
    Download,
    Calendar,
    Loader2,
    ArrowLeft
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { formatCurrency } from "@/lib/utils";
import { startOfDay, endOfDay, format, subDays, addDays } from "date-fns";
import Link from "next/link";

interface SettlementStats {
    totalTickets: number;
    cashTotal: number;
    cardTotal: number;
    tipsTotal: number;
    loyaltySignups: number;
    pointsRedeemed: number;
    totalRevenue: number;
}

interface TicketDetail {
    id: string;
    table_number: string | null;
    order_type: string;
    subtotal: number;
    tax: number;
    tip: number;
    discount: number;
    total: number;
    payment_method: string | null;
    payment_status: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    customer_name: string | null;
}

export default function SettlementPage() {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [stats, setStats] = useState<SettlementStats>({
        totalTickets: 0,
        cashTotal: 0,
        cardTotal: 0,
        tipsTotal: 0,
        loyaltySignups: 0,
        pointsRedeemed: 0,
        totalRevenue: 0
    });
    const [tickets, setTickets] = useState<TicketDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettlementData = async () => {
            if (!currentEmployee || !currentLocation) return;

            try {
                setLoading(true);
                const supabase = createClient();
                const start = startOfDay(selectedDate).toISOString();
                const end = endOfDay(selectedDate).toISOString();

                // Fetch orders for this server on selected date
                const { data: orders, error: ordersError } = await (supabase
                    .from("orders") as any)
                    .select("id, table_number, order_type, subtotal, tax, tip, discount, total, payment_method, payment_status, status, created_at, completed_at, customer_name")
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
                const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

                // Fetch loyalty signups
                const orderIds = ordersList.map((o: any) => o.id);
                let loyaltySignups = 0;
                let pointsRedeemed = 0;

                if (orderIds.length > 0) {
                    const { data: customers } = await (supabase
                        .from("customers") as any)
                        .select("id")
                        .eq("location_id", currentLocation.id)
                        .gte("created_at", start)
                        .lte("created_at", end);

                    loyaltySignups = customers?.length || 0;

                    const { data: redemptions } = await (supabase
                        .from("reward_redemptions") as any)
                        .select("points_used")
                        .in("order_id", orderIds);

                    pointsRedeemed = redemptions?.reduce((sum: number, r: any) => sum + Number(r.points_used || 0), 0) || 0;
                }

                setStats({
                    totalTickets: ordersList.length,
                    cashTotal,
                    cardTotal,
                    tipsTotal,
                    loyaltySignups,
                    pointsRedeemed,
                    totalRevenue
                });

            } catch (err) {
                console.error("Error fetching settlement data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettlementData();
    }, [currentEmployee?.id, currentLocation?.id, selectedDate]);

    const exportToCSV = () => {
        if (tickets.length === 0) return;

        const headers = [
            "Order ID",
            "Date",
            "Time",
            "Table/Type",
            "Customer",
            "Subtotal",
            "Tax",
            "Discount",
            "Tip",
            "Total",
            "Payment Method",
            "Status"
        ];

        const rows = tickets.map(ticket => [
            ticket.id,
            format(new Date(ticket.created_at), "MM/dd/yyyy"),
            format(new Date(ticket.created_at), "h:mm a"),
            ticket.order_type === "dine_in"
                ? `Table ${ticket.table_number || "N/A"}`
                : ticket.order_type?.replace("_", " ").toUpperCase(),
            ticket.customer_name || "Walk-in",
            ticket.subtotal?.toFixed(2) || "0.00",
            ticket.tax?.toFixed(2) || "0.00",
            ticket.discount?.toFixed(2) || "0.00",
            ticket.tip?.toFixed(2) || "0.00",
            ticket.total?.toFixed(2) || "0.00",
            ticket.payment_method || "N/A",
            ticket.payment_status
        ]);

        // Add summary row
        rows.push([]);
        rows.push(["SUMMARY"]);
        rows.push(["Total Tickets", stats.totalTickets.toString()]);
        rows.push(["Cash Total", `$${stats.cashTotal.toFixed(2)}`]);
        rows.push(["Card Total", `$${stats.cardTotal.toFixed(2)}`]);
        rows.push(["Tips Total", `$${stats.tipsTotal.toFixed(2)}`]);
        rows.push(["Total Revenue", `$${stats.totalRevenue.toFixed(2)}`]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `settlement_${format(selectedDate, "yyyy-MM-dd")}_${currentEmployee?.first_name || "server"}.csv`;
        link.click();
    };

    if (!currentEmployee || !currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Receipt className="h-12 w-12 text-slate-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Session</h2>
                <p className="text-slate-400 mb-6">Please select a location and log in.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">End of Day Settlement</h1>
                        <p className="text-slate-400 text-sm">
                            {currentEmployee.first_name} {currentEmployee.last_name} • {format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Date Navigation */}
                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                            className="p-2 hover:bg-slate-700 rounded transition-colors"
                        >
                            ←
                        </button>
                        <div className="flex items-center gap-2 px-3">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <input
                                type="date"
                                value={format(selectedDate, "yyyy-MM-dd")}
                                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                className="bg-transparent border-0 text-sm focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                            className="p-2 hover:bg-slate-700 rounded transition-colors"
                            disabled={selectedDate >= new Date()}
                        >
                            →
                        </button>
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={exportToCSV}
                        disabled={tickets.length === 0}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
            )}

            {!loading && (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        <div className="card">
                            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                                <Receipt className="h-3 w-3" />
                                <span>Tickets</span>
                            </div>
                            <p className="text-2xl font-bold">{stats.totalTickets}</p>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-2 text-green-400 text-xs mb-1">
                                <TrendingUp className="h-3 w-3" />
                                <span>Tips</span>
                            </div>
                            <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.tipsTotal)}</p>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1">
                                <Banknote className="h-3 w-3" />
                                <span>Cash</span>
                            </div>
                            <p className="text-2xl font-bold">{formatCurrency(stats.cashTotal)}</p>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-2 text-blue-400 text-xs mb-1">
                                <CreditCard className="h-3 w-3" />
                                <span>Card</span>
                            </div>
                            <p className="text-2xl font-bold">{formatCurrency(stats.cardTotal)}</p>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-2 text-orange-400 text-xs mb-1">
                                <Receipt className="h-3 w-3" />
                                <span>Revenue</span>
                            </div>
                            <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-2 text-purple-400 text-xs mb-1">
                                <Users className="h-3 w-3" />
                                <span>Signups</span>
                            </div>
                            <p className="text-2xl font-bold">{stats.loyaltySignups}</p>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
                                <Gift className="h-3 w-3" />
                                <span>Pts Redeemed</span>
                            </div>
                            <p className="text-2xl font-bold">{stats.pointsRedeemed}</p>
                        </div>
                    </div>

                    {/* Tickets Table */}
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700 text-left">
                                        <th className="pb-3 font-medium text-slate-400">Time</th>
                                        <th className="pb-3 font-medium text-slate-400">Table/Type</th>
                                        <th className="pb-3 font-medium text-slate-400">Customer</th>
                                        <th className="pb-3 font-medium text-slate-400 text-right">Subtotal</th>
                                        <th className="pb-3 font-medium text-slate-400 text-right">Tax</th>
                                        <th className="pb-3 font-medium text-slate-400 text-right">Discount</th>
                                        <th className="pb-3 font-medium text-slate-400 text-right">Tip</th>
                                        <th className="pb-3 font-medium text-slate-400 text-right">Total</th>
                                        <th className="pb-3 font-medium text-slate-400 text-center">Payment</th>
                                        <th className="pb-3 font-medium text-slate-400 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map((ticket) => (
                                        <tr key={ticket.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                                            <td className="py-3">
                                                {format(new Date(ticket.created_at), "h:mm a")}
                                            </td>
                                            <td className="py-3">
                                                {ticket.order_type === "dine_in"
                                                    ? `Table ${ticket.table_number || "N/A"}`
                                                    : ticket.order_type?.replace("_", " ").toUpperCase()}
                                            </td>
                                            <td className="py-3 text-slate-300">
                                                {ticket.customer_name || "Walk-in"}
                                            </td>
                                            <td className="py-3 text-right">{formatCurrency(ticket.subtotal || 0)}</td>
                                            <td className="py-3 text-right text-slate-400">{formatCurrency(ticket.tax || 0)}</td>
                                            <td className="py-3 text-right text-red-400">
                                                {ticket.discount > 0 ? `-${formatCurrency(ticket.discount)}` : "-"}
                                            </td>
                                            <td className="py-3 text-right text-green-400">
                                                {ticket.tip > 0 ? formatCurrency(ticket.tip) : "-"}
                                            </td>
                                            <td className="py-3 text-right font-medium">{formatCurrency(ticket.total)}</td>
                                            <td className="py-3 text-center">
                                                {ticket.payment_method === "cash" && "💵"}
                                                {(ticket.payment_method === "card" || ticket.payment_method === "stripe") && "💳"}
                                                {!ticket.payment_method && "-"}
                                            </td>
                                            <td className="py-3 text-center">
                                                <span className={`badge ${ticket.payment_status === "paid"
                                                    ? "badge-success"
                                                    : "badge-warning"
                                                    }`}>
                                                    {ticket.payment_status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {tickets.length === 0 && (
                                <div className="text-center py-12 text-slate-500">
                                    <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>No tickets for this date</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
