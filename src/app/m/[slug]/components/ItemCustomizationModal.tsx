"use client";

import { useState, useEffect } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export interface CartModifier {
    id?: string;
    name: string;
    price: number;
    type: 'add-on' | 'upsell' | 'side' | 'dressing';
}

interface ItemCustomizationModalProps {
    item: {
        id: string;
        name: string;
        description: string | null;
        price: number;
        category_id: string;
    };
    locationId: string;
    onClose: () => void;
    onConfirm: (notes: string, modifiers: CartModifier[]) => void;
}

export default function ItemCustomizationModal({
    item,
    locationId,
    onClose,
    onConfirm
}: ItemCustomizationModalProps) {
    const [notes, setNotes] = useState("");
    const [selectedModifiers, setSelectedModifiers] = useState<CartModifier[]>([]);
    const [availableOptions, setAvailableOptions] = useState<CartModifier[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        const fetchOptions = async () => {
            if (!locationId) return;
            setLoading(true);
            try {
                let combinedOptions: CartModifier[] = [];

                // 1. Fetch Add-Ons for this category or item via assignments
                const { data: addOnAssignments } = await (supabase.from("add_on_assignments") as any)
                    .select("add_on_id")
                    .or(`menu_item_id.eq.${item.id},category_id.eq.${item.category_id}`);

                const addOnIds = (addOnAssignments || []).map((a: any) => a.add_on_id);

                if (addOnIds.length > 0) {
                    const { data: addOnsData } = await (supabase.from("add_ons") as any)
                        .select("id, name, price")
                        .eq("location_id", locationId)
                        .eq("is_active", true)
                        .in("id", addOnIds);

                    if (addOnsData) {
                        combinedOptions = [
                            ...combinedOptions,
                            ...addOnsData.map((a: any) => ({ id: a.id, name: a.name, price: a.price, type: 'add-on' as const }))
                        ];
                    }
                }

                // 2. Fetch Sides for this item or category (Dressings come later)
                const { data: sideAssignments } = await (supabase.from("side_assignments") as any)
                    .select("side_id")
                    .or(`menu_item_id.eq.${item.id},category_id.eq.${item.category_id}`);

                const sideIds = (sideAssignments || []).map((a: any) => a.side_id);

                if (sideIds.length > 0) {
                    const { data: sidesData } = await (supabase.from("sides") as any)
                        .select("id, name, price")
                        .eq("location_id", locationId)
                        .eq("is_active", true)
                        .in("id", sideIds);

                    if (sidesData) {
                        combinedOptions = [
                            ...combinedOptions,
                            ...sidesData.map((s: any) => ({ id: s.id, name: s.name, price: s.price, type: 'side' as const }))
                        ];
                    }
                }

                // 3. Fetch Dressings for this item or category
                const { data: dressingAssignments } = await (supabase.from("dressing_assignments") as any)
                    .select("dressing_id")
                    .or(`menu_item_id.eq.${item.id},category_id.eq.${item.category_id}`);

                const dressingIds = (dressingAssignments || []).map((a: any) => a.dressing_id);

                if (dressingIds.length > 0) {
                    const { data: dressingsData } = await (supabase.from("dressings") as any)
                        .select("id, name, price")
                        .eq("location_id", locationId)
                        .eq("is_active", true)
                        .in("id", dressingIds);

                    if (dressingsData) {
                        combinedOptions = [
                            ...combinedOptions,
                            ...dressingsData.map((d: any) => ({ id: d.id, name: d.name, price: d.price, type: 'dressing' as const }))
                        ];
                    }
                }

                setAvailableOptions(combinedOptions);
            } catch (error) {
                console.error("Error fetching customization options:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOptions();
    }, [item.id, item.category_id, locationId]);

    const toggleModifier = (mod: any) => {
        const existing = selectedModifiers.find(m => m.name === mod.name && m.type === mod.type);
        if (existing) {
            setSelectedModifiers(selectedModifiers.filter(m => !(m.name === mod.name && m.type === mod.type)));
        } else {
            setSelectedModifiers([...selectedModifiers, {
                id: mod.id,
                name: mod.name,
                price: mod.price,
                type: mod.type
            }]);
        }
    };

    const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0);
    const totalPrice = item.price + modifiersTotal;

    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-slate-900 w-full max-w-lg md:rounded-2xl rounded-t-3xl border-t md:border border-slate-800 p-6 animate-slide-up md:animate-in md:zoom-in-95 md:duration-200 max-h-[85vh] overflow-y-auto">
                {/* Handle for mobile */}
                <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6 md:hidden" />

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">{item.name}</h2>
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                            {item.description || "No description"}
                        </p>
                        <p className="text-orange-400 font-bold mt-2">{formatCurrency(item.price)}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Special Instructions */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">
                            Special Instructions
                        </label>
                        <textarea
                            placeholder="Any allergies, dietary restrictions, or special requests..."
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 min-h-[80px] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 resize-none"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Sides Section */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-blue-500 font-bold mb-2">
                            Choice of Side
                        </label>
                        {!loading && availableOptions.filter(o => o.type === 'side').length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-1">
                                {availableOptions.filter(o => o.type === 'side').map((mod, idx) => {
                                    const isSelected = selectedModifiers.some(
                                        m => m.name === mod.name && m.type === 'side'
                                    );
                                    return (
                                        <button
                                            key={`side-${idx}`}
                                            onClick={() => toggleModifier(mod)}
                                            className={cn(
                                                "flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all",
                                                isSelected
                                                    ? "bg-blue-600 border-blue-400 text-white"
                                                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                                            )}
                                        >
                                            <div className="flex flex-col items-start text-left">
                                                <span className="font-medium">{mod.name}</span>
                                            </div>
                                            <span className="font-bold">+{formatCurrency(mod.price)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            !loading && (
                                <p className="text-sm text-slate-600 italic py-2">
                                    No sides available
                                </p>
                            )
                        )}
                    </div>

                    {/* Dressings Section */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-cyan-500 font-bold mb-2">
                            Choice of Dressing
                        </label>
                        {!loading && availableOptions.filter(o => o.type === 'dressing').length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-1">
                                {availableOptions.filter(o => o.type === 'dressing').map((mod, idx) => {
                                    const isSelected = selectedModifiers.some(
                                        m => m.name === mod.name && m.type === 'dressing'
                                    );
                                    return (
                                        <button
                                            key={`dressing-${idx}`}
                                            onClick={() => toggleModifier(mod)}
                                            className={cn(
                                                "flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all",
                                                isSelected
                                                    ? "bg-cyan-600 border-cyan-400 text-white"
                                                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                                            )}
                                        >
                                            <div className="flex flex-col items-start text-left">
                                                <span className="font-medium">{mod.name}</span>
                                            </div>
                                            <span className="font-bold">+{formatCurrency(mod.price)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            !loading && (
                                <p className="text-sm text-slate-600 italic py-2">
                                    No dressings available
                                </p>
                            )
                        )}
                    </div>

                    {/* Add-Ons Section */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">
                            Add-Ons & Extras
                        </label>
                        {loading ? (
                            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading options...
                            </div>
                        ) : availableOptions.filter(o => o.type === 'add-on' || o.type === 'upsell').length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-1">
                                {availableOptions.filter(o => o.type === 'add-on' || o.type === 'upsell').map((mod, idx) => {
                                    const isSelected = selectedModifiers.some(
                                        m => m.name === mod.name && (m.type === 'add-on' || m.type === 'upsell')
                                    );
                                    return (
                                        <button
                                            key={`${mod.type}-${idx}`}
                                            onClick={() => toggleModifier(mod)}
                                            className={cn(
                                                "flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all",
                                                isSelected
                                                    ? "bg-orange-500 border-orange-400 text-white"
                                                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                                            )}
                                        >
                                            <div className="flex flex-col items-start text-left">
                                                <span className="font-medium">{mod.name}</span>
                                                <span className={cn(
                                                    "text-[10px] uppercase font-bold",
                                                    isSelected
                                                        ? "text-orange-200"
                                                        : "text-orange-400"
                                                )}>
                                                    {mod.type === 'upsell' ? 'Add-on' : mod.type}
                                                </span>
                                            </div>
                                            <span className="font-bold">+{formatCurrency(mod.price)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            !loading && (
                                <p className="text-sm text-slate-600 italic py-2">
                                    No add-ons available
                                </p>
                            )
                        )}
                    </div>

                    {/* Total & Confirm */}
                    <div className="pt-4 border-t border-slate-800 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Total</span>
                            <span className="text-2xl font-bold text-orange-400">
                                {formatCurrency(totalPrice)}
                            </span>
                        </div>
                        <button
                            onClick={() => onConfirm(notes.trim(), selectedModifiers)}
                            className="btn btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-2"
                        >
                            <Plus className="h-5 w-5" />
                            Add to Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
