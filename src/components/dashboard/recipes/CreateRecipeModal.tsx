"use client";

import { useState, useEffect } from "react";
import {
    X,
    Plus,
    Trash2,
    Search,
    Loader2,
    ChefHat,
    Package,
    UtensilsCrossed,
    Check,
    AlertCircle,
    Download,
    Info,
    FileText
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import type { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type RecipeInsert = Database["public"]["Tables"]["recipes"]["Insert"];
type IngredientInsert = Database["public"]["Tables"]["recipe_ingredients"]["Insert"];
type RecipeMenuItemInsert = Database["public"]["Tables"]["recipe_menu_items"]["Insert"];

interface CreateRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    onComplete: () => void;
    recipe?: any; // Optional recipe to edit
}

export default function CreateRecipeModal({ isOpen, onClose, locationId, onComplete, recipe }: CreateRecipeModalProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [instructions, setInstructions] = useState("");
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [selectedMenuItems, setSelectedMenuItems] = useState<string[]>([]);
    const [isEditing, setIsEditing] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [inventory, setInventory] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [fetchingData, setFetchingData] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            if (recipe) {
                setIsEditing(true);
                setName(recipe.name || "");
                setDescription(recipe.description || "");
                setInstructions(recipe.instructions || "");

                // Map existing ingredients
                if (recipe.recipe_ingredients) {
                    setIngredients(recipe.recipe_ingredients.map((ing: any) => ({
                        // Preserve ID for updating/tracking, but main logic uses inventory_item_id because this builder is inventory-centric
                        // CAUTION: Unlinked ingredients (manual text) might not map well here if we strictly require inventory_item_id
                        // We will allow items without inventory_item_id but filter valid inventory items for search
                        id: ing.id,
                        inventory_item_id: ing.inventory_item_id || `temp-${Math.random()}`, // Fallback for unlinked
                        name: ing.inventory_items?.name || ing.ingredient_name,
                        unit: ing.unit || ing.inventory_items?.unit,
                        quantity_used: ing.quantity_used,
                        is_manual: !ing.inventory_item_id
                    })));
                }

                // Map existing menu links
                if (recipe.recipe_menu_items) {
                    setSelectedMenuItems(recipe.recipe_menu_items.map((link: any) => link.menu_item_id));
                }
            } else {
                setIsEditing(false);
                resetForm();
            }
        }
    }, [isOpen, recipe]);

    const fetchInitialData = async () => {
        setFetchingData(true);
        const supabase = createClient();
        try {
            const [paramsInv, paramsMenu] = await Promise.all([
                supabase.from("inventory_items").select("*").eq("location_id", locationId).order("name"),
                supabase.from("menu_items").select("*").eq("location_id", locationId).order("name")
            ]);

            setInventory(paramsInv.data || []);
            setMenuItems(paramsMenu.data || []);
        } catch (err) {
            console.error("Error fetching data:", err);
            toast.error("Failed to load inventory");
        } finally {
            setFetchingData(false);
        }
    };

    const addIngredient = (item: any) => {
        if (ingredients.some(i => i.inventory_item_id === item.id)) {
            toast.error("Ingredient already added");
            return;
        }
        setIngredients([...ingredients, {
            inventory_item_id: item.id,
            name: item.name,
            unit: item.unit,
            quantity_used: 1,
            is_manual: false
        }]);
        setSearchQuery("");
    };

    const removeIngredient = (id: string) => {
        setIngredients(ingredients.filter(i => i.inventory_item_id !== id));
    };

    const updateIngredientQty = (id: string, qty: number) => {
        setIngredients(ingredients.map(i =>
            i.inventory_item_id === id ? { ...i, quantity_used: qty } : i
        ));
    };

    const toggleMenuItem = (id: string) => {
        setSelectedMenuItems(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return toast.error("Please enter a recipe name");
        // if (ingredients.length === 0) return toast.error("Please add at least one ingredient"); // Relaxed for editing legacy data

        setLoading(true);
        const supabase = createClient();
        try {
            let recipeId = recipe?.id;

            // 1. Create OR Update Recipe
            const recipeData: any = {
                location_id: locationId,
                name,
                description,
                instructions,
                updated_at: new Date().toISOString()
            };

            if (isEditing && recipeId) {
                const { error: updateError } = await (supabase
                    .from("recipes") as any)
                    .update(recipeData)
                    .eq("id", recipeId);
                if (updateError) throw updateError;
            } else {
                const { data: newRecipe, error: createError } = await (supabase
                    .from("recipes") as any)
                    .insert(recipeData)
                    .select()
                    .single();
                if (createError) throw createError;
                recipeId = newRecipe.id;
            }

            // 2. Handle Ingredients (Full Replace Strategy is safest for complex lists)
            // But we need to be careful not to create orphans if we can help it, OR just wipe and replace.
            // For now, wipe and replace for this recipe is standard for simple relations.

            // First, delete existing ingredients for this recipe
            if (isEditing) {
                await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
            }

            if (ingredients.length > 0) {
                const ingredientData: IngredientInsert[] = ingredients.map(ing => ({
                    recipe_id: recipeId,
                    inventory_item_id: ing.is_manual ? null : ing.inventory_item_id, // Handle manual/unlinked
                    ingredient_name: ing.name, // Fallback name
                    quantity_used: ing.quantity_used,
                    unit: ing.unit,
                    quantity_raw: `${ing.quantity_used} ${ing.unit}` // Auto-gen raw string
                }));

                const { error: ingError } = await (supabase
                    .from("recipe_ingredients") as any)
                    .insert(ingredientData);

                if (ingError) throw ingError;
            }

            // 3. Handle Menu Links (Full Replace)
            if (isEditing) {
                await supabase.from("recipe_menu_items").delete().eq("recipe_id", recipeId);
            }

            if (selectedMenuItems.length > 0) {
                const linkData: RecipeMenuItemInsert[] = selectedMenuItems.map(itemId => ({
                    recipe_id: recipeId,
                    menu_item_id: itemId
                }));

                const { error: linkError } = await (supabase
                    .from("recipe_menu_items") as any)
                    .insert(linkData);

                if (linkError) throw linkError;
            }

            toast.success(isEditing ? "Recipe updated!" : "Recipe created successfully!");
            onComplete();
            if (!isEditing) resetForm(); // Only reset if create mode, otherwise closing modal handles it
            onClose();
        } catch (err: any) {
            console.error("Error saving recipe:", err);
            toast.error(err.message || "Failed to save recipe");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName("");
        setDescription("");
        setInstructions("");
        setIngredients([]);
        setSelectedMenuItems([]);
    };

    if (!isOpen) return null;

    const filteredInventory = inventory.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ingredients.some(ing => ing.inventory_item_id === i.id)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-xl">
                            <ChefHat className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{isEditing ? "Edit Recipe" : "Create New Recipe"}</h2>
                            <p className="text-sm text-slate-400">{isEditing ? "Modify recipe details and ingredients" : "Build a recipe and link it to items & inventory"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Recipe Name</label>
                                <input
                                    required
                                    className="input w-full"
                                    placeholder="e.g. Signature Margarita"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Description (Optional)</label>
                                <textarea
                                    className="input w-full min-h-[100px] resize-none"
                                    placeholder="Brief description of the drink..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Preparation Instructions</label>
                            <textarea
                                className="input w-full min-h-[178px] resize-none"
                                placeholder="1. Chill the glass...\n2. Combine ingredients..."
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Ingredients */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Ingredients</h3>
                                <div className="text-[10px] text-slate-400">Deducts from inventory</div>
                            </div>

                            <div className="space-y-3">
                                {ingredients.map((ing) => (
                                    <div key={ing.inventory_item_id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{ing.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{ing.unit}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="input w-20 !py-1 !px-2 text-center font-mono text-sm"
                                                value={ing.quantity_used}
                                                onChange={(e) => updateIngredientQty(ing.inventory_item_id, parseFloat(e.target.value) || 0)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeIngredient(ing.inventory_item_id)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        className="input !pl-10 w-full bg-slate-900/50 group-hover:bg-slate-900 transition-colors"
                                        placeholder="Search inventory to add..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto overflow-x-hidden p-1">
                                            {filteredInventory.length > 0 ? filteredInventory.map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => addIngredient(item)}
                                                    className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-between text-sm group"
                                                >
                                                    <span className="truncate">{item.name}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase">{item.unit}</span>
                                                </button>
                                            )) : (
                                                <div className="p-3 text-center text-xs text-slate-500 italic">No matching items</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Menu Item Linking */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Link to Menu Items</h3>
                                <div className="text-[10px] text-slate-400">Optional linkage</div>
                            </div>

                            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-4 max-h-[300px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                {menuItems.map((item) => {
                                    const isSelected = selectedMenuItems.includes(item.id);
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => toggleMenuItem(item.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all",
                                                isSelected
                                                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <UtensilsCrossed className={cn("h-4 w-4", isSelected ? "text-white" : "text-slate-500")} />
                                                <span className="text-sm font-medium truncate">{item.name}</span>
                                            </div>
                                            {isSelected && <Check className="h-4 w-4" />}
                                        </button>
                                    );
                                })}
                                {menuItems.length === 0 && (
                                    <div className="text-center py-10">
                                        <p className="text-xs text-slate-500">No menu items found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary min-w-[140px]"
                        disabled={loading || !name || ingredients.length === 0}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEditing ? "Save Changes" : "Create Recipe")}
                    </button>
                </div>
            </div>
        </div>
    );
}
