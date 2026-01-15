"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

import {
    X,
    CreditCard,
    Smartphone,
    Loader2,
    Sparkles,
    Hash,
    DollarSign,
    User,
    Table as TableIcon,
    Check
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn, formatCurrency } from "@/lib/utils";


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
    const [addToTable, setAddToTable] = useState(false);
    const [selectedTableNumber, setSelectedTableNumber] = useState("");
    const [activeTables, setActiveTables] = useState<any[]>([]);
    const [fetchingTables, setFetchingTables] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        if (isOpen && locationId) {
            fetchActiveTables();
        }
    }, [isOpen, locationId]);

    const fetchActiveTables = async () => {
        setFetchingTables(true);
        try {
            // Fetch orders that are not paid to find active tables
            const { data: orders, error } = await supabase
                .from("orders")
                .select("table_number, id")
                .eq("location_id", locationId)
                .neq("payment_status", "paid")
                .in("status", ["sent", "preparing", "ready", "served", "pending"]);

            if (error) throw error;

            // Get unique table numbers
            const uniqueTables = Array.from(new Set(orders?.map(o => o.table_number).filter(Boolean)));
            setActiveTables(uniqueTables.sort());
        } catch (err) {
            console.error("Error fetching active tables:", err);
        } finally {
            setFetchingTables(false);
        }
    };


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
            const { data } = await response.json();
            const issuedCard = data;

            // Handle Add to Table
            if (addToTable && selectedTableNumber) {
                await pushToOrder(issuedCard);
            }

            onComplete(issuedCard);
            onClose();

            // Reset form
            setCardNumber("");
            setAmount("");
            setCustomerName("");
            setAddToTable(false);
            setSelectedTableNumber("");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const pushToOrder = async (cardData: any) => {
        try {
            // 1. Fetch the active order for the selected table
            const { data: order, error: fetchError } = await supabase
                .from("orders")
                .select("*")
                .eq("location_id", locationId)
                .eq("table_number", selectedTableNumber)
                .neq("payment_status", "paid")
                .in("status", ["sent", "preparing", "ready", "served", "pending"])
                .maybeSingle();

            if (fetchError) throw fetchError;
            if (!order) {
                toast.error(`No active order found for table ${selectedTableNumber}`);
                return;
            }

            // 2. Prepare the new item
            const newItem = {
                id: crypto.randomUUID(),
                menu_item_id: "gift_card_issuance",
                name: `Gift Card: ${cardData.card_number}`,
                price: cardData.original_balance,
                quantity: 1,
                notes: `Issued: ${cardData.card_number}`,
                modifiers: [],
                seat_number: 1,
                status: 'sent',
                category_name: "Gift Cards",
                sent_at: new Date().toISOString()
            };

            // 3. Update Order items and totals
            const updatedItems = [...(order.items || []), newItem];

            // Calculate new totals
            const subtotal = updatedItems.reduce((sum, item) => {
                // Simplified subtotal calculation for gift cards
                const modsTotal = (item.modifiers || []).reduce((s: number, a: any) => s + (a.price || 0), 0);
                return sum + ((item.price || 0) + modsTotal) * (item.quantity || 1);
            }, 0);

            // Re-fetch location for tax rate to be safe, or use order's existing tax rate context
            // For now, let's assume we can get it from the order or a default
            const taxRate = order.tax / (order.subtotal || 1) * 100 || 8.75;
            const tax = subtotal * (taxRate / 100);
            const total = subtotal + tax + (order.delivery_fee || 0) - (order.discount || 0);

            const { error: updateError } = await (supabase.from("orders") as any)
                .update({
                    items: updatedItems,
                    subtotal,
                    tax,
                    total,
                    updated_at: new Date().toISOString()
                })
                .eq("id", order.id);

            if (updateError) throw updateError;
            toast.success(`Added to table ${selectedTableNumber}'s ticket`);
        } catch (err) {
            console.error("Error pushing to order:", err);
            toast.error("Failed to add gift card to order");
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

                {/* Add to Table Option */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                    <button
                        onClick={() => setAddToTable(!addToTable)}
                        className="flex items-center gap-3 w-full group"
                    >
                        <div className={cn(
                            "h-5 w-5 rounded border flex items-center justify-center transition-all",
                            addToTable
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "border-slate-700 bg-slate-900 group-hover:border-slate-500"
                        )}>
                            {addToTable && <Check className="h-3 w-3 stroke-[4]" />}
                        </div>
                        <span className="text-sm font-medium text-slate-300">Add to Table / Ticket</span>
                    </button>

                    {addToTable && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="text-xs font-bold text-slate-500 uppercase px-1">Select Active Table</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                    <TableIcon className="h-4 w-4" />
                                </div>
                                {activeTables.length > 0 ? (
                                    <select
                                        className="input pl-10 h-11 appearance-none bg-slate-900"
                                        value={selectedTableNumber}
                                        onChange={(e) => setSelectedTableNumber(e.target.value)}
                                    >
                                        <option value="">Choose a table...</option>
                                        {activeTables.map(tableNum => (
                                            <option key={tableNum} value={tableNum}>Table {tableNum}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="input pl-10 h-11 flex items-center text-slate-500 text-sm italic">
                                        No active tables found
                                    </div>
                                )}
                            </div>
                            {activeTables.length === 0 && (
                                <p className="text-[10px] text-slate-500 px-1">
                                    Only tables with open orders can be selected.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t border-slate-800">
                    <button onClick={onClose} className="btn btn-secondary flex-1">
                        Cancel
                    </button>
                    <button
                        onClick={handleIssue}
                        disabled={loading || !cardNumber || !amount || (addToTable && !selectedTableNumber)}
                        className="btn btn-primary flex-1"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue Gift Card"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
