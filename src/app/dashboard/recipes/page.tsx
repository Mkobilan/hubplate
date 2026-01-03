"use client";

import { useState, useEffect } from "react";
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
    Loader2
} from "lucide-react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";
import CreateRecipeModal from "@/components/dashboard/recipes/CreateRecipeModal";
import RecipeCSVUploadModal from "@/components/dashboard/recipes/RecipeCSVUploadModal";
import PourTracker from "@/components/dashboard/recipes/PourTracker";

export default function RecipesPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchRecipes = async () => {
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
                        quantity_used,
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
    };

    useEffect(() => {
        fetchRecipes();
    }, [currentLocation?.id]);

    const filteredRecipes = recipes.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="btn btn-secondary"
                    >
                        <Upload className="h-4 w-4" />
                        Upload Recipe Book
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                    >
                        <Plus className="h-4 w-4" />
                        Create Recipe
                    </button>
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
                    <button className="btn btn-secondary whitespace-nowrap">
                        <Activity className="h-4 w-4" />
                        Recent Pours
                    </button>
                </div>
            </div>

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
                                    <div key={recipe.id} className="card group hover:border-orange-500/50 transition-all overflow-hidden">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold group-hover:text-orange-400 transition-colors cursor-pointer" onClick={() => window.location.href = `/dashboard/recipes/${recipe.id}`}>
                                                    {recipe.name}
                                                </h3>
                                                <p className="text-xs text-slate-500 line-clamp-1">{recipe.description || "No description"}</p>
                                            </div>
                                            <button className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Key Ingredients</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {recipe.recipe_ingredients?.slice(0, 3).map((ri: any) => (
                                                        <span key={ri.id} className="badge bg-slate-800 text-slate-300 border-none text-[10px]">
                                                            {ri.inventory_items?.name} ({ri.quantity_used}{ri.unit})
                                                        </span>
                                                    ))}
                                                    {recipe.recipe_ingredients?.length > 3 && (
                                                        <span className="text-[10px] text-slate-500">+{recipe.recipe_ingredients.length - 3} more</span>
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
