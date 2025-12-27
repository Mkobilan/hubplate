"use client";

import { useState } from "react";
import { X, Users, Split, Plus, Trash2, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

interface OrderItem {
    id: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    isUpsell?: boolean;
    isEdited?: boolean;
    seatNumber: number;
    status: 'pending' | 'preparing' | 'ready' | 'served';
    category_name?: string;
    sent_at?: string;
}

interface SplitCheckModalProps {
    orderId: string;
    items: OrderItem[];
    locationId: string;
    taxRate: number;
    serverId?: string;
    tableNumber?: string | null;
    orderType: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface SplitGroup {
    id: string;
    items: OrderItem[];
}

export default function SplitCheckModal({
    orderId,
    items,
    locationId,
    taxRate,
    serverId,
    tableNumber,
    orderType,
    onClose,
    onSuccess
}: SplitCheckModalProps) {
    const [groups, setGroups] = useState<SplitGroup[]>([
        { id: "1", items: [] },
        { id: "2", items: [] }
    ]);
    const [unassignedItems, setUnassignedItems] = useState<OrderItem[]>(items);
    const [isProcessing, setIsProcessing] = useState(false);
    const [draggedItem, setDraggedItem] = useState<{ item: OrderItem, from: 'unassigned' | string } | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null); // 'unassigned' or groupId
    const supabase = createClient();

    const handleDragStart = (e: React.DragEvent, item: OrderItem, from: 'unassigned' | string) => {
        setDraggedItem({ item, from });
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverTarget !== targetId) {
            setDragOverTarget(targetId);
        }
    };

    const handleDragLeave = () => {
        setDragOverTarget(null);
    };

    const handleDrop = (e: React.DragEvent, toTarget: string) => {
        e.preventDefault();
        setDragOverTarget(null);
        if (!draggedItem) return;

        if (draggedItem.from === toTarget) {
            setDraggedItem(null);
            return;
        }

        if (toTarget === 'unassigned') {
            moveItemToUnassigned(draggedItem.item, draggedItem.from);
        } else {
            moveItemToGroup(draggedItem.item, draggedItem.from, toTarget);
        }
        setDraggedItem(null);
    };

    const handleSplitBySeat = () => {
        const seatGroups = new Map<number, OrderItem[]>();
        items.forEach(item => {
            const seat = item.seatNumber || 0;
            if (!seatGroups.has(seat)) seatGroups.set(seat, []);
            seatGroups.get(seat)?.push(item);
        });

        const newGroups: SplitGroup[] = Array.from(seatGroups.entries()).map(([seat, seatItems], index) => ({
            id: (index + 1).toString(),
            items: seatItems
        }));

        setGroups(newGroups);
        setUnassignedItems([]);
    };

    const addGroup = () => {
        const nextId = (groups.length + 1).toString();
        setGroups([...groups, { id: nextId, items: [] }]);
    };

    const removeGroup = (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
            setUnassignedItems([...unassignedItems, ...group.items]);
            setGroups(groups.filter(g => g.id !== groupId));
        }
    };

    const moveItemToGroup = (item: OrderItem, fromSource: 'unassigned' | string, toGroupId: string) => {
        // Remove from source
        if (fromSource === 'unassigned') {
            setUnassignedItems(prev => prev.filter(i => i.id !== item.id));
        } else {
            setGroups(prev => prev.map(g =>
                g.id === fromSource ? { ...g, items: g.items.filter(i => i.id !== item.id) } : g
            ));
        }

        // Add to target
        setGroups(prev => prev.map(g =>
            g.id === toGroupId ? { ...g, items: [...g.items, item] } : g
        ));
    };

    const moveItemToUnassigned = (item: OrderItem, fromGroupId: string) => {
        setGroups(prev => prev.map(g =>
            g.id === fromGroupId ? { ...g, items: g.items.filter(i => i.id !== item.id) } : g
        ));
        setUnassignedItems(prev => [...prev, item]);
    };

    const calculateTotals = (groupItems: OrderItem[]) => {
        const subtotal = groupItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * (taxRate / 100);
        return { subtotal, tax, total: subtotal + tax };
    };

    const handleConfirmSplit = async () => {
        if (unassignedItems.length > 0) {
            toast.error("Please assign all items to a check");
            return;
        }

        const validGroups = groups.filter(g => g.items.length > 0);
        if (validGroups.length < 2) {
            toast.error("You need at least two checks with items to split");
            return;
        }

        setIsProcessing(true);
        try {
            // We use the original order ID for the first group to preserve history/metadata
            // and create new ones for the others. Or creating all new and closing original.
            // Let's create NEW orders for Groups [1...N] and then either update or close the original.

            // For simplicity and cleanliness: 
            // 1. Create new orders for ALL valid groups except maybe the first one?
            // Actually, let's create ALL new orders and mark the original as 'cancelled' or 'split'.

            for (let i = 0; i < validGroups.length; i++) {
                const group = validGroups[i];
                const { subtotal, tax, total } = calculateTotals(group.items);

                // Determine primary seat number for this check (use first item's seat)
                const groupSeatNumber = group.items.length > 0 ? group.items[0].seatNumber : null;

                const { error } = await (supabase
                    .from("orders") as any)
                    .insert({
                        location_id: locationId,
                        server_id: serverId || null,
                        table_number: tableNumber,
                        seat_number: groupSeatNumber,
                        status: "pending",
                        order_type: orderType,
                        subtotal,
                        tax,
                        total,
                        items: group.items
                    });

                if (error) throw error;
            }

            // Mark original order as completed/removed (since it was split)
            const { error: deleteError } = await (supabase
                .from("orders") as any)
                .delete()
                .eq("id", orderId);

            if (deleteError) throw deleteError;

            toast.success("Check split successfully!");
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error splitting check:", err);
            toast.error("Failed to split check");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <Split className="h-6 w-6 text-orange-500" />
                            Split Check
                        </h2>
                        <p className="text-slate-400">Partition items into multiple checks for Table {tableNumber}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSplitBySeat}
                            className="btn btn-secondary flex items-center gap-2 px-4 py-2"
                        >
                            <Users className="h-4 w-4" />
                            Split by Seat
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-full"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex gap-6 p-6 overflow-hidden">

                    <div
                        onDragOver={(e) => handleDragOver(e, 'unassigned')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'unassigned')}
                        className={cn(
                            "w-80 flex flex-col bg-slate-800/20 rounded-2xl border transition-all p-4",
                            dragOverTarget === 'unassigned' ? "border-orange-500 bg-orange-500/5 shadow-[0_0_20px_rgba(249,115,22,0.1)]" : "border-slate-800"
                        )}
                    >
                        <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest mb-4 flex items-center justify-between">
                            Unassigned Items
                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">{unassignedItems.length}</span>
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {unassignedItems.map(item => (
                                <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item, 'unassigned')}
                                    className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-orange-500/50 cursor-grab active:cursor-grabbing transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-slate-200">{item.quantity}x {item.name}</span>
                                        <div className="flex items-center gap-2">
                                            <select
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => moveItemToGroup(item, 'unassigned', e.target.value)}
                                                className="bg-slate-900 border border-slate-700 text-slate-400 text-[10px] rounded px-1 py-0.5 outline-none hover:border-orange-500 transition-colors"
                                                value="unassigned"
                                            >
                                                <option value="unassigned" disabled>Move to...</option>
                                                {groups.map((g, i) => (
                                                    <option key={g.id} value={g.id}>Check {i + 1}</option>
                                                ))}
                                            </select>
                                            <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-orange-500" />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 font-medium">Seat {item.seatNumber}</span>
                                        <span className="text-sm font-bold text-orange-400">{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                </div>
                            ))}
                            {unassignedItems.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-sm text-center">
                                    <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                                    All items assigned
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Checks Grid */}
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                            {groups.map((group, idx) => {
                                const { subtotal, total } = calculateTotals(group.items);
                                return (
                                    <div
                                        key={group.id}
                                        onDragOver={(e) => handleDragOver(e, group.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, group.id)}
                                        className={cn(
                                            "bg-slate-800/40 rounded-2xl border flex flex-col overflow-hidden group/check transition-all",
                                            dragOverTarget === group.id ? "border-orange-500 bg-orange-500/5 shadow-[0_0_20px_rgba(249,115,22,0.1)]" : "border-slate-800"
                                        )}
                                    >
                                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white">
                                                    {idx + 1}
                                                </div>
                                                <h3 className="font-bold text-slate-200">Check {idx + 1}</h3>
                                            </div>
                                            <button
                                                onClick={() => removeGroup(group.id)}
                                                className="opacity-0 group-hover/check:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="flex-1 p-4 overflow-y-auto space-y-2 min-h-[200px]">
                                            {group.items.map(item => (
                                                <div
                                                    key={item.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, item, group.id)}
                                                    className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-600 cursor-grab active:cursor-grabbing transition-all flex items-center justify-between group/item"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col gap-1 items-center">
                                                            <ChevronLeft className="h-4 w-4 text-slate-700 group-hover/item:text-slate-400" />
                                                            <select
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => {
                                                                    if (e.target.value === 'unassigned') {
                                                                        moveItemToUnassigned(item, group.id);
                                                                    } else {
                                                                        moveItemToGroup(item, group.id, e.target.value);
                                                                    }
                                                                }}
                                                                className="bg-slate-950 border border-slate-800 text-slate-600 text-[8px] rounded px-0.5 py-0 outline-none hover:border-orange-500 transition-colors"
                                                                value={group.id}
                                                            >
                                                                <option value="unassigned">Unassign</option>
                                                                {groups.map((g, i) => (
                                                                    <option key={g.id} value={g.id}>Check {i + 1}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-200 text-sm">{item.quantity}x {item.name}</p>
                                                            <p className="text-[10px] text-slate-500">Seat {item.seatNumber}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-300">{formatCurrency(item.price * item.quantity)}</span>
                                                </div>
                                            ))}
                                            {group.items.length === 0 && (
                                                <div className="h-full flex items-center justify-center text-slate-700 text-sm italic border-2 border-dashed border-slate-800/50 rounded-xl">
                                                    Empty Check
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4 bg-slate-900/40 border-t border-slate-800 mt-auto">
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                <span>Subtotal</span>
                                                <span>{formatCurrency(subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-orange-400">
                                                <span>Total</span>
                                                <span>{formatCurrency(total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add Check button card */}
                            <button
                                onClick={addGroup}
                                className="border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                                    <Plus className="h-6 w-6 text-slate-500 group-hover:text-white" />
                                </div>
                                <span className="font-bold text-slate-600 group-hover:text-slate-400">Add Check</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Remaining to Split</span>
                            <span className={cn("text-xl font-bold", unassignedItems.length > 0 ? "text-red-400" : "text-green-400")}>
                                {formatCurrency(unassignedItems.reduce((s, i) => s + (i.price * i.quantity), 0))}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Split into</span>
                            <span className="text-xl font-bold text-white">{groups.filter(g => g.items.length > 0).length} Checks</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="btn btn-secondary px-8 py-3"
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmSplit}
                            className="btn btn-primary px-12 py-3 text-lg font-bold"
                            disabled={isProcessing || unassignedItems.length > 0}
                        >
                            {isProcessing ? "Processing..." : "Confirm Split"}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
            `}</style>
        </div>
    );
}
