"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Sparkles,
    TrendingUp,
    DollarSign,
    Users,
    Clock,
    ChefHat,
    Plus,
    ThumbsUp,
    ThumbsDown,
    ArrowRight,
    Loader2,
    BookOpen
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { useEffect } from "react";
import MapIngredientsModal, { MappedIngredient } from "@/components/dashboard/menu/MapIngredientsModal";

// Type definition for AI menu suggestions
type MenuSuggestion = {
    id: string;
    name: string;
    description: string;
    reasoning: string;
    estimatedProfit: number;
    popularity: string;
    difficulty: string;
    prepTime: string;
    recipe?: {
        ingredients: string[];
        instructions: string[];
    };
};

// TODO: Fetch from Gemini AI API
const suggestions: MenuSuggestion[] = [];

export default function AISuggestionsPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [isGenerating, setIsGenerating] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [suggestions, setSuggestions] = useState<MenuSuggestion[]>([]);
    const [feedback, setFeedback] = useState<Record<string, "up" | "down" | null>>({});
    const [selectedSuggestion, setSelectedSuggestion] = useState<MenuSuggestion | null>(null);
    const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());

    const toggleRecipe = (id: string) => {
        setExpandedRecipes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleGenerate = async () => {
        if (!currentLocation?.id) return;

        setIsGenerating(true);
        setSuggestions([]); // Clear previous suggestions

        try {
            const response = await fetch("/api/ai/menu-suggestions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    locationId: currentLocation.id,
                    prompt: prompt.trim() || "Suggest some creative new menu items based on our inventory and trends."
                })
            });

            if (!response.ok) throw new Error("Failed to generate suggestions");

            const data = await response.json();
            // Add client-side IDs to the suggestions
            const suggestionsWithIds = data.map((item: any) => ({
                ...item,
                id: crypto.randomUUID()
            }));

            setSuggestions(suggestionsWithIds);
        } catch (error) {
            console.error("Error generating suggestions:", error);
            // In a real app, show toast error here
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFeedback = (id: string, type: "up" | "down") => {
        setFeedback(prev => ({ ...prev, [id]: prev[id] === type ? null : type }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-orange-500" />
                        AI Menu Suggestions
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Use AI to brainstorm new dishes. Specify constraints, ingredients, or trends you want to explore.
                    </p>
                </div>

                {/* Prompt Section */}
                <div className="card bg-slate-900/50 border-slate-800 p-6">
                    <label className="block text-sm font-bold text-slate-300 mb-2">
                        What would you like to create?
                    </label>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., 'Based on local trends in Houston, what new sandwich can we make?', 'Create a hearty vegan stew for winter', or 'Use our excess avocados to make a profitable appetizer'"
                                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none transition-all placeholder:text-slate-600"
                            />
                        </div>
                        <div className="md:w-48 flex flex-col justify-end">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !currentLocation}
                                className="btn btn-primary w-full h-12 text-lg"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Thinking...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-5 w-5" />
                                        Generate Ideas
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Context Banner */}
            {suggestions.length > 0 && (
                <div className="card border-orange-500/30 bg-orange-500/5 p-4 animate-in fade-in slide-in-from-top-4">
                    <p className="text-sm text-orange-200/80">
                        <strong>AI Insight:</strong> Generated items based on your menu profile, available inventory (or inferred ingredients), and your specific prompt.
                    </p>
                </div>
            )}

            {/* Suggestions Grid */}
            {suggestions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                    {suggestions.map((suggestion) => (
                        <div
                            key={suggestion.id}
                            className="card group hover:border-orange-500/50 transition-all duration-300 flex flex-col"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-orange-500/10 rounded-2xl">
                                    <ChefHat className="h-6 w-6 text-orange-400" />
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleFeedback(suggestion.id, "up")}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            feedback[suggestion.id] === "up"
                                                ? "bg-green-500/20 text-green-400"
                                                : "hover:bg-slate-800 text-slate-500"
                                        )}
                                    >
                                        <ThumbsUp className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleFeedback(suggestion.id, "down")}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            feedback[suggestion.id] === "down"
                                                ? "bg-red-500/20 text-red-400"
                                                : "hover:bg-slate-800 text-slate-500"
                                        )}
                                    >
                                        <ThumbsDown className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold mb-2 group-hover:text-orange-400 transition-colors">
                                {suggestion.name}
                            </h3>
                            <p className="text-sm text-slate-400 mb-4 flex-1">{suggestion.description}</p>

                            <div className="p-3 bg-slate-900/50 rounded-xl mb-4">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    <strong className="text-orange-400">Why this?</strong> {suggestion.reasoning}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <DollarSign className="h-4 w-4 text-green-400" />
                                    <span className="text-slate-400">Profit:</span>
                                    <span className="font-bold text-green-400">{formatCurrency(suggestion.estimatedProfit)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <TrendingUp className="h-4 w-4 text-blue-400" />
                                    <span className="text-slate-400">Demand:</span>
                                    <span className="font-bold">{suggestion.popularity}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="h-4 w-4 text-purple-400" />
                                    <span className="text-slate-400">Difficulty:</span>
                                    <span className="font-bold">{suggestion.difficulty}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-amber-400" />
                                    <span className="text-slate-400">Prep:</span>
                                    <span className="font-bold">{suggestion.prepTime}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-auto">
                                <button
                                    onClick={() => toggleRecipe(suggestion.id)}
                                    className="btn btn-secondary flex-1"
                                >
                                    <BookOpen className="h-4 w-4" />
                                    {expandedRecipes.has(suggestion.id) ? "Hide Recipe" : "View Recipe"}
                                </button>
                                <button
                                    onClick={() => setSelectedSuggestion(suggestion)}
                                    className="btn btn-primary flex-1"
                                >
                                    Add to Menu
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>

                            {expandedRecipes.has(suggestion.id) && suggestion.recipe && (
                                <div className="mt-4 pt-4 border-t border-slate-700 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-300 mb-2">Ingredients</h4>
                                            <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
                                                {suggestion.recipe.ingredients.map((ing, i) => (
                                                    <li key={i}>{ing}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-300 mb-2">Instructions</h4>
                                            <ol className="text-sm text-slate-400 list-decimal list-inside space-y-1">
                                                {suggestion.recipe.instructions.map((step, i) => (
                                                    <li key={i}>{step}</li>
                                                ))}
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                !isGenerating && (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <Sparkles className="h-16 w-16 text-slate-700 mb-4" />
                        <h3 className="text-xl font-bold text-slate-500">Ready to Brainstorm</h3>
                        <p className="text-slate-600 max-w-md mt-2">
                            Enter a prompt above and let AI create your next bestseller.
                        </p>
                    </div>
                )
            )}
            {/* Add Suggestion Modal */}
            {selectedSuggestion && (
                <AddSuggestionModal
                    suggestion={selectedSuggestion}
                    onClose={() => setSelectedSuggestion(null)}
                />
            )}
        </div>
    );
}

function AddSuggestionModal({
    suggestion,
    onClose
}: {
    suggestion: MenuSuggestion;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    // Recipe saving state
    const [saveRecipe, setSaveRecipe] = useState(false);
    const [showIngredientMapper, setShowIngredientMapper] = useState(false);
    const [mappedIngredients, setMappedIngredients] = useState<MappedIngredient[]>([]);
    const hasRecipe = suggestion.recipe && suggestion.recipe.ingredients.length > 0;

    // Fetch categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            if (!currentLocation?.id) return;
            const { data } = await supabase
                .from("menu_categories")
                .select("id, name")
                .eq("location_id", currentLocation.id)
                .eq("is_active", true);
            setCategories(data || []);
        };
        fetchCategories();
    }, [currentLocation?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation?.id) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const categoryId = formData.get("category_id") as string;

        setLoading(true);
        try {
            let recipeId: string | null = null;

            // 1. Create Recipe if checkbox is checked
            if (saveRecipe && hasRecipe) {

                const { data: newRecipe, error: recipeError } = await (supabase
                    .from("recipes") as any)
                    .insert({
                        location_id: currentLocation.id,
                        name: formData.get("name") as string,
                        description: formData.get("description") as string,
                        instructions: suggestion.recipe?.instructions?.join("\n") || ""
                    })
                    .select()
                    .single();

                if (recipeError) throw recipeError;
                recipeId = newRecipe.id;

                // 2. Create Recipe Ingredients
                if (mappedIngredients.length > 0) {
                    const ingredientData = mappedIngredients.map(ing => ({
                        recipe_id: recipeId,
                        inventory_item_id: ing.inventoryItemId,
                        ingredient_name: ing.inventoryItemName || ing.originalText,
                        quantity_used: ing.quantity,
                        unit: ing.unit,
                        quantity_raw: ing.originalText
                    }));

                    const { error: ingError } = await (supabase
                        .from("recipe_ingredients") as any)
                        .insert(ingredientData);

                    if (ingError) throw ingError;
                }
            }

            // 3. Create Menu Item
            const { data: newMenuItem, error: menuError } = await (supabase
                .from("menu_items") as any)
                .insert({
                    location_id: currentLocation.id,
                    name: formData.get("name") as string,
                    description: formData.get("description") as string,
                    price: parseFloat(formData.get("price") as string),
                    category_id: categoryId
                })
                .select()
                .single();

            if (menuError) throw menuError;

            // 4. Link Recipe to Menu Item if recipe was created
            if (recipeId && newMenuItem) {
                const { error: linkError } = await (supabase
                    .from("recipe_menu_items") as any)
                    .insert({
                        recipe_id: recipeId,
                        menu_item_id: newMenuItem.id
                    });

                if (linkError) throw linkError;
            }

            toast.success(
                saveRecipe && recipeId
                    ? "Item added to menu and recipe saved!"
                    : "Item added to menu successfully!"
            );
            onClose();
        } catch (error) {
            console.error("Error adding item:", JSON.stringify(error, null, 2));
            toast.error("Failed to add item to menu");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={onClose} />
                <div className="relative card w-full max-w-md animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">Add to Menu</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">Item Name</label>
                            <input
                                name="name"
                                type="text"
                                className="input"
                                defaultValue={suggestion.name}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Description</label>
                            <textarea
                                name="description"
                                className="input"
                                rows={3}
                                defaultValue={suggestion.description}
                            />
                        </div>
                        <div>
                            <label className="label">Price ($)</label>
                            <input
                                name="price"
                                type="number"
                                step="0.01"
                                className="input"
                                defaultValue={suggestion.estimatedProfit}
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                AI suggested price based on industry margins
                            </p>
                        </div>
                        <div>
                            <label className="label">Category</label>
                            <select name="category_id" className="input" required>
                                <option value="">Select a category</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Recipe Saving Option */}
                        {hasRecipe && (
                            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={saveRecipe}
                                        onChange={(e) => setSaveRecipe(e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500 bg-slate-800"
                                    />
                                    <div>
                                        <span className="font-medium text-purple-300">Save Recipe to Recipe Book</span>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Creates a recipe with {suggestion.recipe?.ingredients.length} ingredients
                                        </p>
                                    </div>
                                </label>

                                {saveRecipe && (
                                    <div className="pt-2 border-t border-purple-500/20">
                                        <button
                                            type="button"
                                            onClick={() => setShowIngredientMapper(true)}
                                            className="btn btn-secondary w-full !bg-purple-500/20 !border-purple-500/40 !text-purple-300 hover:!bg-purple-500/30"
                                        >
                                            <BookOpen className="h-4 w-4" />
                                            {mappedIngredients.length > 0
                                                ? `${mappedIngredients.filter(m => m.inventoryItemId).length}/${mappedIngredients.length} Ingredients Mapped`
                                                : "Map Ingredients to Inventory"
                                            }
                                        </button>
                                        <p className="text-[10px] text-slate-500 mt-2 text-center">
                                            Mapping ingredients enables automatic inventory deduction
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || (saveRecipe && mappedIngredients.length === 0)}
                                className="btn btn-primary flex-1"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to Menu"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Ingredient Mapper Modal */}
            {showIngredientMapper && currentLocation && (
                <MapIngredientsModal
                    isOpen={showIngredientMapper}
                    onClose={() => setShowIngredientMapper(false)}
                    ingredients={suggestion.recipe?.ingredients || []}
                    locationId={currentLocation.id}
                    onConfirm={(mapped) => {
                        setMappedIngredients(mapped);
                        setShowIngredientMapper(false);
                    }}
                />
            )}
        </>
    );
}
