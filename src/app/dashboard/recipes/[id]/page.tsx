"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    ChefHat,
    ChevronLeft,
    Clock,
    Edit2,
    Link2,
    List,
    Package,
    UtensilsCrossed,
    Loader2,
    AlertCircle,
    Check,
    Plus,
    Trash2,
    ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import LinkMenuItemModal from "@/components/dashboard/recipes/LinkMenuItemModal";
import CreateRecipeModal from "@/components/dashboard/recipes/CreateRecipeModal";
import ManageIngredientsModal from "@/components/dashboard/recipes/ManageIngredientsModal";
import DeleteRecipeModal from "@/components/dashboard/recipes/DeleteRecipeModal";
import { useAppStore } from "@/stores";
import { isInstructionalNoise } from "@/lib/csv/csvUtils";
import { useRouter } from "next/navigation";

export default function RecipeDetailsPage() {
    const params = useParams();
    const id = params.id as string;
    const { t } = useTranslation();
    const [recipe, setRecipe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showManageIngredientsModal, setShowManageIngredientsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const router = useRouter();

    const fetchRecipe = useCallback(async () => {
        if (!id) return;
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
                            name,
                            stock_quantity,
                            unit
                        )
                    ),
                    recipe_menu_items (
                        menu_item_id,
                        menu_items (
                            name,
                            price,
                            category_id
                        )
                    )
                `)
                .eq("id", id)
                .single();

            if (error) throw error;
            setRecipe(data);
        } catch (err: any) {
            console.error("Error fetching recipe:", err);
            toast.error("Failed to load recipe details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchRecipe();
    }, [fetchRecipe]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 text-orange-500 animate-spin mb-4" />
                <p className="text-slate-400">Loading recipe details...</p>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Recipe Not Found</h2>
                <Link href="/dashboard/recipes" className="btn btn-primary mt-4">Back to Recipes</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/recipes" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">{recipe.name}</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="text-slate-400 text-sm flex items-center gap-1.5">
                            <ChefHat className="h-4 w-4" />
                            {recipe.recipe_ingredients?.length || 0} Ingredients
                        </span>
                        <span className="text-slate-400 text-sm flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            Updated {new Date(recipe.updated_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Description & Instructions */}
                    <div className="card space-y-6">
                        <div>
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                                <List className="h-5 w-5 text-orange-500" />
                                Description
                            </h3>
                            <p className="text-slate-400 leading-relaxed">
                                {recipe.description || "No description provided for this recipe."}
                            </p>
                        </div>
                        <div className="pt-6 border-t border-slate-800">
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                                <List className="h-5 w-5 text-orange-500" />
                                Preparation Instructions
                            </h3>
                            <div className="text-slate-400 whitespace-pre-wrap leading-relaxed">
                                {recipe.instructions || "No preparation steps provided."}
                            </div>
                        </div>
                    </div>

                    {/* Ingredients Table */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Package className="h-5 w-5 text-pink-500" />
                                Ingredients & Inventory
                            </h3>
                            <button
                                onClick={() => setShowManageIngredientsModal(true)}
                                className="btn btn-secondary !py-1 !px-3 text-xs"
                            >
                                Manage Ingredients
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-slate-800 pb-4">
                                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <th className="pb-4">Ingredient</th>
                                        <th className="pb-4">Quantity Used</th>
                                        <th className="pb-4">In Stock</th>
                                        <th className="pb-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {recipe.recipe_ingredients?.map((ri: any) => (
                                        <tr key={ri.id} className="group hover:bg-slate-900/40">
                                            <td className="py-4">
                                                <div className="font-medium">{ri.inventory_items?.name || ri.ingredient_name}</div>
                                                <div className="text-[10px] text-slate-600 uppercase tracking-tighter">
                                                    {ri.inventory_item_id ? "Inventory Item" : (isInstructionalNoise(ri.ingredient_name) ? "Instructional Step" : "Manual Entry")}
                                                </div>
                                            </td>
                                            <td className="py-4 font-mono text-sm text-slate-300">
                                                {ri.quantity_raw || `${ri.quantity_used} ${ri.unit}`}
                                            </td>
                                            <td className="py-4 font-mono text-sm text-slate-400">
                                                {ri.inventory_item_id ? (
                                                    `${ri.inventory_items?.stock_quantity ?? 0} ${ri.inventory_items?.unit || ''}`
                                                ) : (
                                                    <span className="text-slate-600 italic">N/A</span>
                                                )}
                                            </td>
                                            <td className="py-4 text-right">
                                                {!ri.inventory_item_id ? (
                                                    isInstructionalNoise(ri.ingredient_name) ? (
                                                        <span className="badge bg-slate-800/50 text-slate-500 text-[10px]">Instruction</span>
                                                    ) : (
                                                        <span className="badge bg-orange-500/10 text-orange-400 text-[10px]">Unlinked</span>
                                                    )
                                                ) : ri.inventory_items?.stock_quantity <= 0 ? (
                                                    <span className="badge badge-danger text-[10px]">86'd</span>
                                                ) : ri.inventory_items?.stock_quantity < 10 ? (
                                                    <span className="badge badge-warning text-[10px]">Low</span>
                                                ) : (
                                                    <span className="badge badge-success text-[10px]">OK</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Linked Menu Items */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Link2 className="h-5 w-5 text-blue-500" />
                                Linked Menu Items
                            </h3>
                            <button
                                onClick={() => setShowLinkModal(true)}
                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-500"
                                title="Link more items"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {recipe.recipe_menu_items?.map((link: any) => (
                                <div key={link.menu_item_id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <UtensilsCrossed className="h-4 w-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{link.menu_items?.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">${link.menu_items?.price}</p>
                                        </div>
                                    </div>
                                    <Check className="h-4 w-4 text-green-500" />
                                </div>
                            ))}
                            {recipe.recipe_menu_items?.length === 0 && (
                                <div className="text-center py-6">
                                    <p className="text-xs text-slate-500 italic">No menu items linked yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="card">
                        <h3 className="text-lg font-bold mb-6">Actions</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="btn btn-secondary w-full justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <Edit2 className="h-4 w-4" />
                                    Edit Recipe
                                </div>
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="btn btn-secondary w-full justify-between text-red-400 hover:text-red-300"
                            >
                                <div className="flex items-center gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Delete Recipe
                                </div>
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Link Menu Item Modal */}
            <LinkMenuItemModal
                isOpen={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                recipeId={id}
                recipeName={recipe?.name}
                locationId={currentLocation?.id || ""}
                onLinkComplete={fetchRecipe}
            />

            {/* Edit Recipe Modal */}
            {recipe && (
                <CreateRecipeModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    locationId={currentLocation?.id || ""}
                    onComplete={fetchRecipe}
                    recipe={recipe}
                />
            )}

            {/* Manage Ingredients Modal */}
            {recipe && (
                <ManageIngredientsModal
                    isOpen={showManageIngredientsModal}
                    onClose={() => setShowManageIngredientsModal(false)}
                    locationId={currentLocation?.id || ""}
                    recipeId={recipe.id}
                    recipeName={recipe.name}
                    onComplete={fetchRecipe}
                />
            )}

            {/* Delete Recipe Modal */}
            <DeleteRecipeModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                recipeName={recipe?.name || ""}
                onConfirm={async () => {
                    // Delete logic here or use the modal's internal logic if it has one?
                    // Checking DeleteRecipeModal usage in recipes/page.tsx: it takes isDeleting and onConfirm props.
                    // I need to implement the delete call here.
                    const supabase = createClient();
                    try {
                        await supabase.from("recipes").delete().eq("id", recipe.id);
                        toast.success("Recipe deleted");
                        router.push("/dashboard/recipes");
                    } catch (err) {
                        console.error("Error deleting recipe:", err);
                        toast.error("Failed to delete recipe");
                    }
                }}
                isDeleting={false} // We handle loading inside onConfirm usually, but DeleteRecipeModal might expect prop?
            // Wait, typically onConfirm handles the async op.
            />
        </div>
    );
}
