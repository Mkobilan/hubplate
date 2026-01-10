"use client";

import { useState, useEffect } from "react";
import {
    X,
    Search,
    Loader2,
    Package,
    Save,
    AlertCircle,
    Check,
    Link as LinkIcon
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ManageIngredientsModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipeId: string;
    recipeName: string;
    locationId: string;
    onComplete: () => void;
}

export default function ManageIngredientsModal({
    isOpen,
    onClose,
    recipeId,
    recipeName,
    locationId,
    onComplete
}: ManageIngredientsModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeIngredientId, setActiveIngredientId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && recipeId) {
            fetchData();
        }
    }, [isOpen, recipeId]);

    const fetchData = async () => {
        setFetching(true);
        const supabase = createClient();
        try {
            // Fetch ingredients first
            const { data: ingData, error: ingError } = await supabase
                .from("recipe_ingredients")
                .select("*, inventory_items(name, unit)")
                .eq("recipe_id", recipeId);

            if (ingError) {
                console.error("Error fetching ingredients:", ingError);
                throw ingError;
            }

            // Fetch inventory
            // Removed ambiguous category join to prevent errors if FK logic is fuzzy
            const { data: invData, error: invError } = await supabase
                .from("inventory_items")
                .select("id, name, unit, category")
                .eq("location_id", locationId)
                .order("name");

            if (invError) {
                console.error("Error fetching inventory:", invError);
                throw invError;
            }

            setIngredients(ingData || []);
            setInventory(invData || []);
        } catch (err: any) {
            console.error("Error fetching data (ManageIngredientsModal):", err);
            toast.error(`Failed to load data: ${err.message || 'Unknown error'}`);
        } finally {
            setFetching(false);
        }
    };

    const handleLinkIngredient = async (ingredientId: string, inventoryItem: any) => {
        setLoading(true);
        const supabase = createClient();
        try {
            const { error } = await (supabase
                .from("recipe_ingredients") as any)
                .update({
                    inventory_item_id: inventoryItem.id,
                    unit: inventoryItem.unit // Auto-update unit to match inventory
                })
                .eq("id", ingredientId);

            if (error) throw error;

            toast.success("Ingredient linked successfully");

            // Update local state
            setIngredients(prev => prev.map(ing =>
                ing.id === ingredientId
                    ? {
                        ...ing,
                        inventory_item_id: inventoryItem.id,
                        inventory_items: { name: inventoryItem.name, unit: inventoryItem.unit },
                        unit: inventoryItem.unit
                    }
                    : ing
            ));
            setActiveIngredientId(null);
            setSearchQuery("");
        } catch (err) {
            console.error("Error linking ingredient:", err);
            toast.error("Failed to link ingredient");
        } finally {
            setLoading(false);
        }
    };

    const handleUnlink = async (ingredientId: string) => {
        if (!confirm("Are you sure you want to unlink this ingredient?")) return;

        setLoading(true);
        const supabase = createClient();
        try {
            const { error } = await (supabase
                .from("recipe_ingredients") as any)
                .update({
                    inventory_item_id: null
                })
                .eq("id", ingredientId);

            if (error) throw error;

            toast.success("Ingredient unlinked");
            // Update local state
            setIngredients(prev => prev.map(ing =>
                ing.id === ingredientId
                    ? {
                        ...ing,
                        inventory_item_id: null,
                        inventory_items: null
                    }
                    : ing
            ));
        } catch (err) {
            console.error("Error unlinking:", err);
            toast.error("Failed to unlink");
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/20 rounded-xl">
                            <Package className="h-6 w-6 text-pink-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Manage Ingredients</h2>
                            <p className="text-sm text-slate-400">Link ingredients to inventory for {recipeName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {fetching ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {ingredients.length === 0 && (
                                <div className="text-center py-10 text-slate-500">
                                    No ingredients found for this recipe.
                                </div>
                            )}

                            {ingredients.map((ing) => (
                                <div key={ing.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-slate-200">{ing.ingredient_name || "Unnamed Ingredient"}</h3>
                                                {ing.inventory_item_id ? (
                                                    <span className="badge badge-success text-[10px]">Linked</span>
                                                ) : (
                                                    <span className="badge badge-warning text-[10px]">Unlinked</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 font-mono">
                                                {ing.quantity_raw || `${ing.quantity_used} ${ing.unit}`}
                                            </p>
                                        </div>

                                        {ing.inventory_item_id ? (
                                            <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800">
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-pink-400">{ing.inventory_items?.name}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase">Inventory Item</p>
                                                </div>
                                                <button
                                                    onClick={() => handleUnlink(ing.id)}
                                                    className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                                                    title="Unlink"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setActiveIngredientId(activeIngredientId === ing.id ? null : ing.id);
                                                    setSearchQuery("");
                                                }}
                                                className="btn btn-secondary text-xs !py-1.5 gap-2"
                                            >
                                                <LinkIcon className="h-3 w-3" />
                                                Link Item
                                            </button>
                                        )}
                                    </div>

                                    {/* Link Dropdown */}
                                    {activeIngredientId === ing.id && !ing.inventory_item_id && (
                                        <div className="mt-4 pt-4 border-t border-slate-700/50 animate-in slide-in-from-top-2">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                <input
                                                    className="input w-full !pl-10 mb-2"
                                                    placeholder="Search inventory..."
                                                    autoFocus
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                                                {filteredInventory.map(item => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleLinkIngredient(ing.id, item)}
                                                        className="w-full text-left px-3 py-2 hover:bg-slate-700/50 rounded-lg transition-colors flex items-center justify-between group"
                                                    >
                                                        <span className="text-sm">{item.name}</span>
                                                        <span className="text-[10px] text-slate-500 group-hover:text-slate-300">
                                                            {/* Display category if available, it might be an ID or Name depending on schema, but safe to render if string */}
                                                            {typeof item.category === 'object' ? item.category?.name : item.category}
                                                        </span>
                                                    </button>
                                                ))}
                                                {filteredInventory.length === 0 && (
                                                    <div className="text-center py-2 text-xs text-slate-500 italic">
                                                        No matches found
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={() => {
                            onComplete();
                            onClose();
                        }}
                        className="btn btn-primary min-w-[100px]"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
