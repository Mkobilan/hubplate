"use client";

import { useState, useEffect } from "react";
import {
    X,
    Search,
    Link2,
    Unlink,
    Check,
    Loader2,
    Package
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface MappedIngredient {
    originalText: string;
    inventoryItemId: string | null;
    inventoryItemName: string | null;
    quantity: number;
    unit: string;
}

interface MapIngredientsModalProps {
    isOpen: boolean;
    onClose: () => void;
    ingredients: string[];
    locationId: string;
    onConfirm: (mappedIngredients: MappedIngredient[]) => void;
}

// Simple parser to extract quantity and unit from ingredient strings
function parseIngredientText(text: string): { quantity: number; unit: string; name: string } {
    // Common patterns: "2 oz tequila", "1/2 cup flour", "3 limes"
    const match = text.match(/^([\d./]+)?\s*(oz|ml|cup|cups|tbsp|tsp|lb|lbs|g|kg|each|whole|slice|slices|dash|dashes)?\s*(.+)$/i);

    if (match) {
        let qty = 1;
        if (match[1]) {
            // Handle fractions like "1/2"
            if (match[1].includes('/')) {
                const [num, denom] = match[1].split('/');
                qty = parseInt(num) / parseInt(denom);
            } else {
                qty = parseFloat(match[1]);
            }
        }
        return {
            quantity: qty || 1,
            unit: match[2] || 'each',
            name: match[3]?.trim() || text
        };
    }

    return { quantity: 1, unit: 'each', name: text };
}

export default function MapIngredientsModal({
    isOpen,
    onClose,
    ingredients,
    locationId,
    onConfirm
}: MapIngredientsModalProps) {
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mappings, setMappings] = useState<MappedIngredient[]>([]);
    const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

    // Fetch inventory on mount
    useEffect(() => {
        if (isOpen && locationId) {
            fetchInventory();
            initializeMappings();
        }
    }, [isOpen, locationId, ingredients]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data } = await supabase
                .from("inventory_items")
                .select("id, name, unit, recipe_unit")
                .eq("location_id", locationId)
                .order("name");
            setInventory(data || []);
        } catch (err) {
            console.error("Error fetching inventory:", err);
        } finally {
            setLoading(false);
        }
    };

    const initializeMappings = () => {
        const initial: MappedIngredient[] = ingredients.map(ing => {
            const parsed = parseIngredientText(ing);
            return {
                originalText: ing,
                inventoryItemId: null,
                inventoryItemName: null,
                quantity: parsed.quantity,
                unit: parsed.unit
            };
        });
        setMappings(initial);
    };

    const updateMapping = (index: number, inventoryItem: any | null) => {
        setMappings(prev => prev.map((m, i) => {
            if (i !== index) return m;
            if (inventoryItem === null) {
                return { ...m, inventoryItemId: null, inventoryItemName: null };
            }
            return {
                ...m,
                inventoryItemId: inventoryItem.id,
                inventoryItemName: inventoryItem.name,
                unit: inventoryItem.recipe_unit || inventoryItem.unit || m.unit
            };
        }));
        setActiveDropdown(null);
        setSearchQueries(prev => ({ ...prev, [index]: '' }));
    };

    const updateQuantity = (index: number, quantity: number) => {
        setMappings(prev => prev.map((m, i) =>
            i === index ? { ...m, quantity } : m
        ));
    };

    const updateUnit = (index: number, unit: string) => {
        setMappings(prev => prev.map((m, i) =>
            i === index ? { ...m, unit } : m
        ));
    };

    const handleConfirm = () => {
        onConfirm(mappings);
        onClose();
    };

    const linkedCount = mappings.filter(m => m.inventoryItemId).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-xl">
                            <Package className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Map Ingredients</h2>
                            <p className="text-xs text-slate-400">
                                Link AI ingredients to your inventory for tracking
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-5 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                        </div>
                    ) : (
                        mappings.map((mapping, index) => (
                            <div
                                key={index}
                                className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3"
                            >
                                {/* Original Text */}
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-500 font-mono">#{index + 1}</span>
                                    <span className="text-slate-300 italic">"{mapping.originalText}"</span>
                                </div>

                                {/* Mapping Controls */}
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Inventory Picker */}
                                    <div className="relative flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-2">
                                            {mapping.inventoryItemId ? (
                                                <Link2 className="h-4 w-4 text-green-400 shrink-0" />
                                            ) : (
                                                <Unlink className="h-4 w-4 text-slate-500 shrink-0" />
                                            )}
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder={mapping.inventoryItemName || "Search inventory..."}
                                                    className={cn(
                                                        "input w-full !py-2 !text-sm",
                                                        mapping.inventoryItemId && "!bg-green-500/10 !border-green-500/30 !text-green-300"
                                                    )}
                                                    value={searchQueries[index] || ''}
                                                    onChange={(e) => {
                                                        setSearchQueries(prev => ({ ...prev, [index]: e.target.value }));
                                                        setActiveDropdown(index);
                                                    }}
                                                    onFocus={() => setActiveDropdown(index)}
                                                />
                                                {activeDropdown === index && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-10 max-h-40 overflow-y-auto p-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateMapping(index, null)}
                                                            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                                                        >
                                                            <Unlink className="h-3 w-3" />
                                                            Leave Unlinked
                                                        </button>
                                                        {inventory
                                                            .filter(item =>
                                                                item.name.toLowerCase().includes((searchQueries[index] || '').toLowerCase())
                                                            )
                                                            .slice(0, 10)
                                                            .map(item => (
                                                                <button
                                                                    key={item.id}
                                                                    type="button"
                                                                    onClick={() => updateMapping(index, item)}
                                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-800 rounded-lg flex items-center justify-between"
                                                                >
                                                                    <span className="truncate">{item.name}</span>
                                                                    <span className="text-[10px] text-slate-500 uppercase shrink-0 ml-2">
                                                                        {item.recipe_unit || item.unit}
                                                                    </span>
                                                                </button>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quantity */}
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="input w-20 !py-2 !text-sm text-center"
                                        value={mapping.quantity}
                                        onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                                    />

                                    {/* Unit */}
                                    <input
                                        type="text"
                                        className="input w-20 !py-2 !text-sm text-center"
                                        value={mapping.unit}
                                        onChange={(e) => updateUnit(index, e.target.value)}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-800 flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                        <span className="text-green-400 font-bold">{linkedCount}</span>
                        <span> / {mappings.length} linked to inventory</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="btn btn-primary"
                        >
                            <Check className="h-4 w-4" />
                            Confirm Mapping
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
