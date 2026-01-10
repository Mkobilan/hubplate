"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    ChefHat,
    Plus,
    Search,
    Link2,
    BookOpen,
    Upload,
    MoreVertical,
    Edit2,
    Trash2,
    Activity,
    AlertCircle,
    Loader2,
    CheckSquare,
    Square,
    X,
} from "lucide-react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";
import CreateRecipeModal from "@/components/dashboard/recipes/CreateRecipeModal";
import RecipeCSVUploadModal from "@/components/dashboard/recipes/RecipeCSVUploadModal";
import PourTracker from "@/components/dashboard/recipes/PourTracker";
import type { Database } from "@/types/database";

type Recipe = Database["public"]["Tables"]["recipes"]["Row"];
type RecipeIngredient = Database["public"]["Tables"]["recipe_ingredients"]["Row"] & {
    inventory_items?: { name: string } | null;
};
type RecipeWithDetails = Recipe & {
    recipe_ingredients?: RecipeIngredient[];
    recipe_menu_items?: {
        menu_item_id: string;
        menu_items?: { name: string } | null;
    }[];
};
type InventoryItem = { id: string; name: string };

export default function RecipesPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [recipes, setRecipes] = useState<RecipeWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Selection and bulk actions
    const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
    const [isSelectMode, setIsSelectMode] = useState(false);

    // Dropdown menu state
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // Delete confirmation modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [recipeToDelete, setRecipeToDelete] = useState<RecipeWithDetails | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sync ingredients state
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchRecipes = useCallback(async () => {
        if (!currentLocation) return;
        setLoading(true);
        const supabase = createClient();
        try {
            const { data, error } = await supabase
                .from("recipes")
                .select(`
                    *,
                    recipe_ingredients (
                        id,
                        ingredient_name,
                        inventory_item_id,
                        quantity_used,
                        quantity_raw,
                        unit,
                        inventory_items (
                            name
                        )
                    ),
                    recipe_menu_items (
                        menu_item_id,
                        menu_items (
                            name
                        )
                    )
                `)
                .eq("location_id", currentLocation.id)
                .order("name");

            if (error) throw error;
            setRecipes(data || []);
        } catch (err: any) {
            console.error("Error fetching recipes:", err);
            toast.error("Failed to load recipes");
        } finally {
            setLoading(false);
        }
    }, [currentLocation?.id]);

    useEffect(() => {
        fetchRecipes();
    }, [fetchRecipes]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        if (openDropdownId) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [openDropdownId]);

    const filteredRecipes = recipes.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleSelectRecipe = (id: string) => {
        const newSelected = new Set(selectedRecipes);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedRecipes(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedRecipes.size === filteredRecipes.length) {
            setSelectedRecipes(new Set());
        } else {
            setSelectedRecipes(new Set(filteredRecipes.map(r => r.id)));
        }
    };

    const handleDeleteRecipe = async (recipe: RecipeWithDetails) => {
        setRecipeToDelete(recipe);
        setShowDeleteModal(true);
        setOpenDropdownId(null);
    };

    const handleBulkDelete = () => {
        if (selectedRecipes.size === 0) return;
        setRecipeToDelete(null); // null means bulk delete
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        const supabase = createClient();

        try {
            const idsToDelete = recipeToDelete
                ? [recipeToDelete.id]
                : Array.from(selectedRecipes);

            // Delete recipe ingredients first (cascade should handle this but let's be explicit)
            await (supabase.from("recipe_ingredients") as any)
                .delete()
                .in("recipe_id", idsToDelete);

            // Delete recipe menu item links
            await (supabase.from("recipe_menu_items") as any)
                .delete()
                .in("recipe_id", idsToDelete);

            // Delete the recipes
            const { error } = await (supabase.from("recipes") as any)
                .delete()
                .in("id", idsToDelete);

            if (error) throw error;

            toast.success(
                recipeToDelete
                    ? `Deleted "${recipeToDelete.name}"`
                    : `Deleted ${idsToDelete.length} recipes`
            );

            // Clear selection and refresh
            setSelectedRecipes(new Set());
            setIsSelectMode(false);
            fetchRecipes();
        } catch (err: any) {
            console.error("Error deleting recipes:", err);
            toast.error("Failed to delete recipes");
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setRecipeToDelete(null);
        }
    };

    const exitSelectMode = () => {
        setIsSelectMode(false);
        setSelectedRecipes(new Set());
    };

    const handleSyncIngredients = async () => {
        if (!currentLocation) return;
        setIsSyncing(true);
        const supabase = createClient();

        try {
            // 1. Get all unmatched ingredients for this location's recipes
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: unmatchedIngredients, error: fetchIngError } = await (supabase
                .from("recipe_ingredients") as any)
                .select(`
                    id,
                    ingredient_name,
                    inventory_item_id,
                    recipe_id,
                    recipes!inner(location_id)
                `)
                .is("inventory_item_id", null)
                .not("ingredient_name", "is", null)
                .eq("recipes.location_id", currentLocation.id);

            if (fetchIngError) throw fetchIngError;

            if (!unmatchedIngredients || unmatchedIngredients.length === 0) {
                toast.success("All ingredients are already matched!");
                setIsSyncing(false);
                return;
            }

            // 2. Get ALL inventory items for this location to avoid excessive API calls
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: inventoryItems, error: fetchInvError } = await (supabase
                .from("inventory_items") as any)
                .select("id, name")
                .eq("location_id", currentLocation.id);

            if (fetchInvError) throw fetchInvError;

            if (!inventoryItems || inventoryItems.length === 0) {
                toast.error("No items found in inventory to match against.");
                setIsSyncing(false);
                return;
            }

            let matchedCount = 0;
            let failedUpdates = 0;

            const cleanRegex = (str: string) => {
                return str.toLowerCase()
                    .replace(/^[\d\s./-]+\s*(oz|ml|cl|tsp|tbsp|dash|dashes|drop|drops|splash|barspoon|part|parts|cup|g|kg|lb)?\s+/i, '')
                    .replace(/\s+\d+\s*(ml|l|oz|cl|g|kg|lb|units|unit|pk|pack|btl|bottle|btls)?$/i, '')
                    .trim();
            };

            for (const ing of unmatchedIngredients as RecipeIngredient[]) {
                const rawName = ing.ingredient_name?.trim() || "";
                const cleanedName = cleanRegex(rawName);

                // Strategy 1: Exact Match (Case-insensitive)
                let match = (inventoryItems as InventoryItem[]).find(item =>
                    item.name.toLowerCase().trim() === rawName.toLowerCase()
                );

                // Strategy 2: Clean Match (Exact match against cleaned name)
                if (!match && cleanedName !== rawName.toLowerCase()) {
                    match = (inventoryItems as InventoryItem[]).find(item =>
                        item.name.toLowerCase().trim() === cleanedName
                    );
                }

                // Strategy 3: Fuzzy Match (Inventory item contains cleaned name)
                if (!match) {
                    match = (inventoryItems as InventoryItem[]).find(item =>
                        item.name.toLowerCase().includes(cleanedName) ||
                        cleanedName.includes(item.name.toLowerCase().trim())
                    );
                }

                if (match) {
                    // Update the ingredient with the inventory item link
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { error: updateError } = await (supabase
                        .from("recipe_ingredients") as any)
                        .update({ inventory_item_id: match.id })
                        .eq("id", ing.id);

                    if (updateError) {
                        console.error(`Failed to update ingredient ${ing.id}:`, updateError);
                        failedUpdates++;
                    } else {
                        matchedCount++;
                    }
                }
            }

            if (matchedCount > 0) {
                toast.success(`Matched ${matchedCount} ingredient(s) to inventory!`);
                if (failedUpdates > 0) {
                    toast.error(`Failed to update ${failedUpdates} ingredients due to database errors.`);
                }
                fetchRecipes(); // Refresh to show updates
            } else {
                toast.error("No matches found. Check that ingredient names exist in inventory.");
            }
        } catch (err: any) {
            console.error("Error syncing ingredients:", err);
            toast.error("Failed to sync ingredients");
        } finally {
            setIsSyncing(false);
        }
    };

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <Link href="/dashboard/locations" className="btn btn-primary">Go to Locations</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <ChefHat className="h-8 w-8 text-orange-500" />
                        Recipes & Pour Tracking
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Manage beverage recipes, link them to the menu, and track accurate inventory pours
                    </p>
                </div>
                <div className="flex gap-2">
                    {isSelectMode ? (
                        <>
                            <button
                                onClick={exitSelectMode}
                                className="btn btn-secondary"
                            >
                                <X className="h-4 w-4" />
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedRecipes.size === 0}
                                className="btn bg-red-600 hover:bg-red-700 text-white border-none disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete ({selectedRecipes.size})
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="btn btn-secondary"
                            >
                                <Upload className="h-4 w-4" />
                                Upload Recipe Book
                            </button>
                            <button
                                onClick={handleSyncIngredients}
                                disabled={isSyncing}
                                className="btn btn-secondary"
                                title="Match unlinked ingredients to inventory items"
                            >
                                <Link2 className="h-4 w-4" />
                                {isSyncing ? "Syncing..." : "Sync Ingredients"}
                            </button>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="btn btn-primary"
                            >
                                <Plus className="h-4 w-4" />
                                Create Recipe
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search recipes (e.g., Margarita, Old Fashioned...)"
                        className="input !pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {!isSelectMode && recipes.length > 0 && (
                        <button
                            onClick={() => setIsSelectMode(true)}
                            className="btn btn-secondary whitespace-nowrap"
                        >
                            <CheckSquare className="h-4 w-4" />
                            Select
                        </button>
                    )}
                    <button className="btn btn-secondary whitespace-nowrap">
                        <Activity className="h-4 w-4" />
                        Recent Pours
                    </button>
                </div>
            </div>

            {/* Bulk selection bar */}
            {isSelectMode && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            {selectedRecipes.size === filteredRecipes.length ? (
                                <CheckSquare className="h-4 w-4 text-orange-500" />
                            ) : (
                                <Square className="h-4 w-4" />
                            )}
                            Select All ({filteredRecipes.length})
                        </button>
                    </div>
                    <p className="text-sm text-slate-500">
                        {selectedRecipes.size} selected
                    </p>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 text-orange-500 animate-spin mb-4" />
                    <p className="text-slate-400">Loading recipes...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Recipes List */}
                    <div className="lg:col-span-3">
                        {filteredRecipes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredRecipes.map((recipe) => (
                                    <div
                                        key={recipe.id}
                                        className={cn(
                                            "card group hover:border-orange-500/50 transition-all overflow-hidden relative",
                                            isSelectMode && selectedRecipes.has(recipe.id) && "border-orange-500 bg-orange-500/5"
                                        )}
                                    >
                                        {/* Selection checkbox */}
                                        {isSelectMode && (
                                            <button
                                                onClick={() => toggleSelectRecipe(recipe.id)}
                                                className="absolute top-4 left-4 z-10"
                                            >
                                                {selectedRecipes.has(recipe.id) ? (
                                                    <CheckSquare className="h-5 w-5 text-orange-500" />
                                                ) : (
                                                    <Square className="h-5 w-5 text-slate-600 hover:text-slate-400" />
                                                )}
                                            </button>
                                        )}

                                        <div className={cn("flex justify-between items-start mb-4", isSelectMode && "pl-8")}>
                                            <div>
                                                <h3
                                                    className="text-lg font-bold group-hover:text-orange-400 transition-colors cursor-pointer"
                                                    onClick={() => !isSelectMode && (window.location.href = `/dashboard/recipes/${recipe.id}`)}
                                                >
                                                    {recipe.name}
                                                </h3>
                                                <p className="text-xs text-slate-500 line-clamp-1">{recipe.description || "No description"}</p>
                                            </div>

                                            {/* Three-dot dropdown menu */}
                                            {!isSelectMode && (
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenDropdownId(openDropdownId === recipe.id ? null : recipe.id);
                                                        }}
                                                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>

                                                    {openDropdownId === recipe.id && (
                                                        <div
                                                            className="absolute right-0 top-8 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Link
                                                                href={`/dashboard/recipes/${recipe.id}`}
                                                                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-800 transition-colors"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                                Edit Recipe
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDeleteRecipe(recipe)}
                                                                className="flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left text-red-400 hover:bg-red-500/10 transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Key Ingredients</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {recipe.recipe_ingredients?.slice(0, 3).map((ri: RecipeIngredient) => (
                                                        <span
                                                            key={ri.id}
                                                            className={cn(
                                                                "badge border-none text-[10px]",
                                                                ri.inventory_item_id ? "bg-slate-800 text-slate-300" : "bg-orange-500/10 text-orange-400"
                                                            )}
                                                        >
                                                            {ri.inventory_items?.name || ri.ingredient_name}
                                                        </span>
                                                    ))}
                                                    {(recipe.recipe_ingredients?.length || 0) > 3 && (
                                                        <span className="text-[10px] text-slate-500">+{(recipe.recipe_ingredients?.length || 0) - 3} more</span>
                                                    )}
                                                    {(!recipe.recipe_ingredients || recipe.recipe_ingredients.length === 0) && (
                                                        <span className="text-[10px] text-slate-600 italic">No ingredients linked</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Link2 className="h-3.5 w-3.5 text-blue-400" />
                                                    <span className="text-xs text-slate-400">
                                                        {recipe.recipe_menu_items?.length || 0} Linked Items
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Link href={`/dashboard/recipes/${recipe.id}`} className="btn btn-secondary !py-1 !px-3 text-xs">
                                                        Details
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="card text-center py-20 border-dashed">
                                <div className="bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                                    <BookOpen className="h-8 w-8 text-slate-600" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">No Recipes Found</h3>
                                <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                                    Start by creating your first cocktail recipe or upload a recipe book to begin tracking pours.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pour Tracker Sidebar */}
                    <div className="lg:col-span-1">
                        <PourTracker locationId={currentLocation.id} />
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="card w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-8 w-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">
                                {recipeToDelete
                                    ? `Delete &quot;${recipeToDelete.name}&quot;?`
                                    : `Delete ${selectedRecipes.size} Recipes?`
                                }
                            </h3>
                            <p className="text-slate-400 text-sm mb-6">
                                This action cannot be undone. All associated ingredients and menu links will also be removed.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setRecipeToDelete(null);
                                    }}
                                    className="btn btn-secondary flex-1"
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="btn bg-red-600 hover:bg-red-700 text-white border-none flex-1"
                                >
                                    {isDeleting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "Delete"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CreateRecipeModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                locationId={currentLocation.id}
                onComplete={fetchRecipes}
            />

            <RecipeCSVUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                locationId={currentLocation.id}
                onComplete={fetchRecipes}
            />
        </div>
    );
}
