"use client";

import { useState, useEffect } from "react";
import {
    X,
    ShoppingCart,
    Loader2,
    Check,
    AlertCircle,
    Plus,
    Minus,
    ArrowRight,
    Package
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

interface CreatePOModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    lowStockItems: any[];
    onComplete: () => void;
}

export default function CreatePOModal({ isOpen, onClose, locationId, lowStockItems, onComplete }: CreatePOModalProps) {
    const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; cost: number; name: string }>>({});
    const [loading, setLoading] = useState(false);
    const [supplier, setSupplier] = useState("");

    useEffect(() => {
        if (isOpen && lowStockItems.length > 0) {
            const initial: Record<string, any> = {};
            lowStockItems.forEach(item => {
                // Suggest quantity to get back to par + reorder default
                const deficit = Math.max(0, (item.par_level || 0) - item.stock_quantity);
                const suggestedQty = deficit > 0 ? deficit : (item.reorder_quantity || 10);

                initial[item.id] = {
                    quantity: suggestedQty,
                    cost: item.cost_per_unit || 0,
                    name: item.name
                };
            });
            setSelectedItems(initial);

            // Try to auto-detect supplier if all items share one
            const suppliers = Array.from(new Set(lowStockItems.map(i => i.supplier).filter(Boolean)));
            if (suppliers.length === 1) {
                setSupplier(suppliers[0] as string);
            }
        }
    }, [isOpen, lowStockItems]);

    if (!isOpen) return null;

    const toggleItem = (itemId: string) => {
        setSelectedItems(prev => {
            const next = { ...prev };
            if (next[itemId]) {
                delete next[itemId];
            } else {
                const item = lowStockItems.find(i => i.id === itemId);
                next[itemId] = {
                    quantity: (item.par_level || 0) - item.stock_quantity || 10,
                    cost: item.cost_per_unit || 0,
                    name: item.name
                };
            }
            return next;
        });
    };

    const updateQty = (itemId: string, delta: number) => {
        setSelectedItems(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                quantity: Math.max(0, prev[itemId].quantity + delta)
            }
        }));
    };

    const handleCreatePO = async () => {
        const itemIds = Object.keys(selectedItems);
        if (itemIds.length === 0) {
            toast.error("Please select at least one item");
            return;
        }

        setLoading(true);
        const supabase = createClient();

        try {
            const totalAmount = Object.values(selectedItems).reduce((sum, item) => sum + (item.quantity * item.cost), 0);

            // 1. Create Purchase Order
            const { data: po, error: poError } = await (supabase
                .from('purchase_orders' as any) as any)
                .insert({
                    location_id: locationId,
                    supplier: supplier || "Generic Supplier",
                    status: 'draft',
                    total_amount: totalAmount
                })
                .select()
                .single();

            if (poError) throw poError;

            // 2. Create PO Items
            const poItems = itemIds.map(itemId => ({
                po_id: po.id,
                inventory_item_id: itemId,
                quantity: selectedItems[itemId].quantity,
                cost_at_order: selectedItems[itemId].cost
            }));

            const { error: itemsError } = await (supabase
                .from('purchase_order_items' as any) as any)
                .insert(poItems);

            if (itemsError) throw itemsError;

            toast.success("Purchase Order created specifically!");
            onComplete();
            onClose();
        } catch (err: any) {
            console.error("PO Creation error:", err);
            toast.error("Failed to create PO: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const totalOrderCost = Object.values(selectedItems).reduce((sum, item) => sum + (item.quantity * item.cost), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="card w-full max-w-3xl bg-slate-900 border-slate-800 shadow-2xl relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-orange-500" />
                            Generate Purchase Order
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Review and adjust items for reorder
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Supplier Info */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Supplier Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Sysco, Local Farms"
                            className="input"
                            value={supplier}
                            onChange={(e) => setSupplier(e.target.value)}
                        />
                    </div>

                    {/* Items List */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Items to Reorder</label>
                        {lowStockItems.length === 0 ? (
                            <div className="text-center py-10 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
                                <Package className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-500">No items below par level found.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {lowStockItems.map((item) => {
                                    const isSelected = !!selectedItems[item.id];
                                    const details = selectedItems[item.id];

                                    return (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "p-4 rounded-xl border transition-all flex items-center justify-between gap-4",
                                                isSelected ? "bg-orange-500/5 border-orange-500/30" : "bg-slate-800/50 border-slate-700/50 grayscale opacity-60"
                                            )}
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <button
                                                    onClick={() => toggleItem(item.id)}
                                                    className={cn(
                                                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors",
                                                        isSelected ? "bg-orange-500 border-orange-500 text-white" : "border-slate-600"
                                                    )}
                                                >
                                                    {isSelected && <Check className="h-4 w-4" />}
                                                </button>
                                                <div>
                                                    <p className="font-bold">{item.name}</p>
                                                    <div className="flex gap-4 mt-1 text-xs text-slate-500">
                                                        <span>Stock: <span className="text-red-400 font-medium">{item.stock_quantity} {item.unit}</span></span>
                                                        <span>Par: <span className="text-slate-300">{item.par_level} {item.unit}</span></span>
                                                    </div>
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <div className="flex items-center gap-6">
                                                    <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-700">
                                                        <button
                                                            onClick={() => updateQty(item.id, -1)}
                                                            className="p-1 hover:bg-slate-800 rounded transition-colors"
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            className="w-16 bg-transparent text-center font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            value={details.quantity}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], quantity: val } }));
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => updateQty(item.id, 1)}
                                                            className="p-1 hover:bg-slate-800 rounded transition-colors"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    <div className="text-right w-24">
                                                        <p className="text-sm font-bold">{formatCurrency(details.quantity * details.cost)}</p>
                                                        <p className="text-[10px] text-slate-500">{formatCurrency(details.cost)} / unit</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                    <div className="text-left">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Estimated Total</p>
                        <p className="text-2xl font-black text-orange-400">{formatCurrency(totalOrderCost)}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button
                            disabled={loading || Object.keys(selectedItems).length === 0}
                            onClick={handleCreatePO}
                            className="btn btn-primary bg-orange-500 hover:bg-orange-600 border-none px-8"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    Generate Draft PO
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
