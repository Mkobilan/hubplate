"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Search,
    Filter,
    ClipboardList,
    Clock,
    User,
    DollarSign,
    Receipt,
    X,
    ChevronDown,
    ChevronUp,
    Pencil
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { startOfDay, endOfDay, format, addDays } from "date-fns";
import { Modal } from "@/components/ui/modal";

type OrderStatus = "all" | "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled";

export default function OrderHistoryPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [statusFilter, setStatusFilter] = useState<OrderStatus>("all");
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);

    const [compingItem, setCompingItem] = useState<any>(null);
    const [compReason, setCompReason] = useState("");
    const [showCompModal, setShowCompModal] = useState(false);

    const isTerminalMode = useAppStore((state) => state.isTerminalMode);
    const canComp = isTerminalMode
        ? (currentEmployee?.role === "owner" || currentEmployee?.role === "manager")
        : isOrgOwner || currentEmployee?.role === "owner" || currentEmployee?.role === "manager";

    const fetchOrders = useCallback(async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();
            const start = startOfDay(selectedDate).toISOString();
            const end = endOfDay(selectedDate).toISOString();

            let query = supabase
                .from("orders")
                .select("*, server:employees(first_name, last_name)")
                .eq("location_id", currentLocation.id)
                .gte("created_at", start)
                .lte("created_at", end)
                .order("created_at", { ascending: false });

            if (statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;

            setOrders(data || []);
        } catch (err) {
            console.error("Error fetching order history:", err);
        } finally {
            setLoading(false);
        }
    }, [currentLocation, selectedDate, statusFilter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);


    const handleViewDetails = (order: any) => {
        setSelectedOrder(order);
        setShowDetailModal(true);
    };

    const handleCompClick = (target: any = null) => {
        const item = target || selectedOrder;
        setCompingItem(item);

        // Load existing reason if it exists
        const isOrder = item.id === selectedOrder.id;
        if (isOrder) {
            setCompReason(selectedOrder.comp_reason || "");
        } else {
            // Check if the item is already comped in the comp_meta
            const compedItemReason = selectedOrder.comp_meta?.comped_items?.[item.id];
            setCompReason(compedItemReason || "");
        }

        setShowCompModal(true);
    };

    const confirmComp = async () => {
        if (!selectedOrder || !compingItem) return;

        try {
            const supabase = createClient() as any;
            const isOrderLevel = compingItem.id === selectedOrder.id;

            let updatePayload: any = {};
            let newSubtotal = 0;
            let newTax = 0;
            let newTotal = 0;
            let updatedItems = [...selectedOrder.items]; // Create a mutable copy

            if (isOrderLevel) {
                const isRemovingComp = selectedOrder.is_comped;
                const newCompStatus = !isRemovingComp;

                updatePayload = {
                    is_comped: newCompStatus,
                    comp_reason: newCompStatus ? compReason : null
                };

                if (newCompStatus) {
                    updatedItems = updatedItems.map((i: any) => ({
                        ...i,
                        // We do NOT change the status here, we rely on comp_meta being the source of truth for the whole order being comped
                    }));
                    newSubtotal = 0;
                    newTax = 0;
                    newTotal = 0;
                } else {
                    // If un-comping the whole order, revert item statuses based on comp_meta or default
                    const compedItemsMeta = selectedOrder.comp_meta?.comped_items || {};
                    updatedItems = updatedItems.map((i: any) => ({
                        ...i,
                        status: compedItemsMeta[i.id] ? 'comped' : 'completed' // Or whatever default status is
                    }));

                    // Recalculate based on items, respecting JSONB item-level comps from comp_meta
                    const taxRate = currentLocation?.tax_rate ?? 8.75;
                    newSubtotal = updatedItems.reduce((sum: number, i: any) => {
                        const isItemComped = selectedOrder.comp_meta?.comped_items?.[i.id] || false;
                        return sum + (isItemComped ? 0 : (Number(i.unit_price || i.price) * i.quantity));
                    }, 0);
                    newTax = newSubtotal * (taxRate / 100);
                    newTotal = newSubtotal + newTax + (selectedOrder.tip || 0);
                }
                updatePayload.items = updatedItems; // Update the items array in the payload
            } else {
                // Item level comp using the "Smart Column"
                const compedItemsMeta = { ...(selectedOrder.comp_meta?.comped_items || {}) };
                const isItemComped = compedItemsMeta[compingItem.id];

                if (isItemComped) {
                    delete compedItemsMeta[compingItem.id];
                    // Reverting: No status change needed as we didn't change it to 'comped'
                } else {
                    compedItemsMeta[compingItem.id] = compReason;
                    // Apply: No status change needed
                }

                updatePayload = {
                    comp_meta: { ...selectedOrder.comp_meta, comped_items: compedItemsMeta },
                    items: updatedItems // Update the items array in the payload
                };

                // Recalculate totals (only if the whole order isn't comped)
                if (!selectedOrder.is_comped) {
                    const taxRate = currentLocation?.tax_rate ?? 8.75;
                    newSubtotal = updatedItems.reduce((sum: number, i: any) => {
                        const isIComped = compedItemsMeta[i.id]; // Check comp_meta
                        return sum + (isIComped ? 0 : (Number(i.unit_price || i.price) * i.quantity));
                    }, 0);
                    newTax = newSubtotal * (taxRate / 100);
                    newTotal = newSubtotal + newTax + (selectedOrder.tip || 0);
                } else {
                    // If the whole order is comped, item-level comps don't change the total
                    newSubtotal = 0;
                    newTax = 0;
                    newTotal = 0;
                }
            }

            updatePayload.subtotal = newSubtotal;
            updatePayload.tax = newTax;
            updatePayload.total = newTotal;

            const { error: orderError } = await supabase
                .from("orders")
                .update(updatePayload)
                .eq("id", selectedOrder.id);

            if (orderError) throw orderError;

            await fetchOrders();
            setSelectedOrder({ ...selectedOrder, ...updatePayload });
            setShowCompModal(false);
            setCompingItem(null);
            setCompReason("");

        } catch (err: any) {
            console.error("Error toggling comp:", err);
            alert(`Error: ${err.message || "Something went wrong"}`);
        }
    };

    const statusStyles: Record<string, string> = {
        pending: "badge-info",
        preparing: "badge-warning",
        ready: "badge-success",
        served: "badge-success",
        completed: "badge-success",
        cancelled: "badge-danger",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Order History</h1>
                    <p className="text-slate-400 mt-1">Review all orders for {format(selectedDate, 'MMMM do, yyyy')}</p>
                </div>
            </div>

            {/* Filters & Tools */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex items-center gap-4 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2 px-2">
                        <CalendarIcon className="h-4 w-4 text-orange-400" />
                        <span className="font-semibold whitespace-nowrap">
                            {format(selectedDate, 'MMM d, yyyy')}
                        </span>
                        <input
                            type="date"
                            className="absolute opacity-0 w-8 pointer-events-none"
                            onChange={(e) => setSelectedDate(new Date(e.target.value))}
                        />
                    </div>
                    <button
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                    <button
                        className="text-xs px-2 py-1 text-slate-400 hover:text-white"
                        onClick={() => setSelectedDate(new Date())}
                    >
                        Today
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {(["all", "pending", "preparing", "ready", "completed", "cancelled"] as OrderStatus[]).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                "btn text-xs py-1.5 px-3 capitalize",
                                statusFilter === status ? "btn-primary" : "btn-secondary"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Table */}
            <div className="card p-0 overflow-hidden border-slate-800 bg-slate-900/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/80 border-b border-slate-800">
                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Order ID</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Type / Table</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Server</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Time</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Total</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="p-4 h-12 bg-slate-800/20" />
                                    </tr>
                                ))
                            ) : orders.length > 0 ? (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="p-4 font-mono text-xs text-slate-400">
                                            #{order.id.slice(0, 8)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium capitalize">{order.order_type?.replace('_', ' ')}</span>
                                                {order.table_number && (
                                                    <span className="text-[10px] text-slate-500 uppercase">Table {order.table_number}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-[10px]">
                                                    {order.server?.first_name?.[0] || '?'}{order.server?.last_name?.[0] || ''}
                                                </div>
                                                <span className="text-sm">
                                                    {order.server ? `${order.server.first_name} ${order.server.last_name}` : "Unknown"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-400">
                                            {format(new Date(order.created_at), 'h:mm a')}
                                        </td>
                                        <td className="p-4 font-bold text-orange-400">
                                            {formatCurrency(order.total)}
                                        </td>
                                        <td className="p-4">
                                            <span className={cn("badge text-[10px] capitalize", statusStyles[order.status] || "badge-secondary")}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleViewDetails(order)}
                                                className="btn btn-secondary text-xs py-1 px-3"
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-500">
                                            <ClipboardList className="h-8 w-8 opacity-20" />
                                            <p>No orders found for this date</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Detail Modal */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title={`Order Details #${selectedOrder?.id?.slice(0, 8)}`}
            >
                {selectedOrder && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                            <div className="space-y-1">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Details</p>
                                <p className="text-sm"><span className="text-slate-400">Type:</span> <span className="capitalize">{selectedOrder.order_type?.replace('_', ' ')}</span></p>
                                <p className="text-sm"><span className="text-slate-400">Table:</span> <span>{selectedOrder.table_number || "N/A"}</span></p>
                                <p className="text-sm"><span className="text-slate-400">Server:</span> <span>{selectedOrder.server ? `${selectedOrder.server.first_name} ${selectedOrder.server.last_name}` : "Unknown"}</span></p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Time & Status</p>
                                <p className="text-sm text-slate-400">{format(new Date(selectedOrder.created_at), 'MMM d, h:mm a')}</p>
                                <span className={cn("badge text-[10px] ml-auto block w-fit capitalize", statusStyles[selectedOrder.status] || "badge-secondary")}>
                                    {selectedOrder.status}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-2">
                                <ClipboardList className="h-3 w-3" /> Items
                            </p>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                                    (selectedOrder.items || []).map((item: any) => {
                                        const isItemComped = selectedOrder.comp_meta?.comped_items?.[item.id];
                                        return (
                                            <div key={item.id} className={cn(
                                                "flex justify-between items-center bg-slate-800/30 p-3 rounded-lg border border-slate-700/50",
                                                (selectedOrder.is_comped || isItemComped) && "opacity-60 grayscale-[0.5] border-orange-500/20"
                                            )}>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-sm">
                                                            {item.name} <span className="text-slate-500">x{item.quantity}</span>
                                                        </p>
                                                        {isItemComped && (
                                                            <div className="flex flex-col">
                                                                <span className="badge badge-warning text-[8px] py-0 px-1 uppercase w-fit">Comped</span>
                                                                <p className="text-[9px] text-slate-500 italic">"{selectedOrder.comp_meta?.comped_items?.[item.id]}"</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {item.notes && <p className="text-xs text-orange-400 mt-0.5 italic">{item.notes}</p>}
                                                    {item.modifiers && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {(item.modifiers as string[]).map((mod: string, idx: number) => (
                                                                <span key={idx} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{mod}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className={cn("text-sm font-bold", (selectedOrder.is_comped || isItemComped) && "line-through text-slate-500")}>
                                                            {formatCurrency((item.unit_price || item.price) * item.quantity)}
                                                        </p>
                                                        {(selectedOrder.is_comped || isItemComped) && (
                                                            <p className="text-xs font-bold text-green-400">$0.00</p>
                                                        )}
                                                    </div>

                                                    {canComp && (
                                                        <button
                                                            onClick={() => handleCompClick(item)}
                                                            className={cn(
                                                                "p-1.5 rounded-lg transition-colors",
                                                                isItemComped ? "bg-orange-500/20 text-orange-400" : "hover:bg-slate-700 text-slate-400 hover:text-white"
                                                            )}
                                                            disabled={selectedOrder.is_comped}
                                                            title={isItemComped ? "Update Item Comp" : "Comp Just This Item"}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-center text-slate-500 text-sm py-4">No items recorded</p>
                                )}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800 space-y-1">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Subtotal</span>
                                <span>{formatCurrency(selectedOrder.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Tax</span>
                                <span>{formatCurrency(selectedOrder.tax)}</span>
                            </div>
                            {selectedOrder.tip > 0 && (
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Tip</span>
                                    <span>{formatCurrency(selectedOrder.tip)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-lg font-bold pt-1 border-t border-slate-700">
                                <div className="flex items-center gap-2">
                                    <span className="text-orange-400">Total</span>
                                    {selectedOrder.is_comped && (
                                        <div className="flex flex-col">
                                            <span className="badge badge-warning text-[8px] py-0 px-1 uppercase w-fit">Comped</span>
                                            {selectedOrder.comp_reason && (
                                                <p className="text-[9px] text-slate-500 italic font-normal">"{selectedOrder.comp_reason}"</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-orange-400">{formatCurrency(selectedOrder.total)}</span>
                                    {canComp && (
                                        <button
                                            onClick={() => handleCompClick()}
                                            className={cn(
                                                "p-1.5 rounded-lg transition-colors",
                                                selectedOrder.is_comped ? "bg-orange-500/20 text-orange-400" : "bg-slate-800 text-slate-400 hover:text-white"
                                            )}
                                            title={selectedOrder.is_comped ? "Update Comp Reason" : "Comp Entire Order (Make Free)"}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="btn btn-secondary flex-1 py-1.5 text-sm"
                            >
                                Close
                            </button>
                            <button
                                className="btn btn-primary flex-1 gap-2 py-1.5 text-sm"
                                onClick={() => window.print()}
                            >
                                <Receipt className="h-4 w-4" />
                                Print Receipt
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Comp Confirmation Modal */}
            <Modal
                isOpen={showCompModal}
                onClose={() => setShowCompModal(false)}
                title={compingItem?.id === selectedOrder?.id ? (selectedOrder?.is_comped ? "Remove Complimentary Status" : "Complimentary Order") : (selectedOrder?.comp_meta?.comped_items?.[compingItem?.id] ? "Remove Item Comp" : "Comp Item")}
                className="max-w-md"
            >
                <div className="space-y-4">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <p className="text-sm text-slate-400">{compingItem?.id === selectedOrder?.id ? 'Order' : 'Item'} to {((compingItem?.id === selectedOrder?.id ? selectedOrder?.is_comped : selectedOrder?.comp_meta?.comped_items?.[compingItem?.id])) ? 'un-comp' : 'comp'}:</p>
                        <p className="text-lg font-bold">{compingItem?.id === selectedOrder?.id ? `Ticket #${selectedOrder?.id?.slice(0, 8)}` : compingItem?.name}</p>
                        <p className="text-orange-400 font-mono">Current Val: {formatCurrency(compingItem?.id === selectedOrder?.id ? selectedOrder?.total : (Number(compingItem?.unit_price || compingItem?.price) * compingItem?.quantity))}</p>
                    </div>

                    {!((compingItem?.id === selectedOrder?.id ? selectedOrder?.is_comped : selectedOrder?.comp_meta?.comped_items?.[compingItem?.id])) ? (
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Reason for Comping</label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:border-orange-500 outline-none transition-colors min-h-[100px]"
                                placeholder="E.g., Manager guest, widespread service delay, VIP..."
                                value={compReason}
                                onChange={(e) => setCompReason(e.target.value)}
                            />
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic font-medium">
                            Are you sure you want to remove the complimentary status and charge the customer?
                        </p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setShowCompModal(false)}
                            className="btn btn-secondary flex-1 py-2"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmComp}
                            disabled={!((compingItem?.id === selectedOrder?.id ? selectedOrder?.is_comped : selectedOrder?.comp_meta?.comped_items?.[compingItem?.id])) && !compReason.trim()}
                            className={cn(
                                "btn flex-1 py-2 rounded-xl font-bold transition-all",
                                ((compingItem?.id === selectedOrder?.id ? selectedOrder?.is_comped : selectedOrder?.comp_meta?.comped_items?.[compingItem?.id])) ? "bg-orange-500 hover:bg-orange-600 text-white" : "btn-primary"
                            )}
                        >
                            {((compingItem?.id === selectedOrder?.id ? selectedOrder?.is_comped : selectedOrder?.comp_meta?.comped_items?.[compingItem?.id])) ? "Confirm Charge" : "Confirm Comp"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
