"use client";

import { useState, useEffect } from "react";
import {
    Activity,
    Search,
    Plus,
    Loader2,
    Package,
    ChefHat,
    Check,
    ChevronRight,
    History,
    TrendingDown,
    X
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";
import type { Database } from "@/types/database";

type PourInsert = Database["public"]["Tables"]["pours"]["Insert"];

interface PourTrackerProps {
    locationId: string;
}

export default function PourTracker({ locationId }: PourTrackerProps) {
    const currentEmployee = useAppStore(state => state.currentEmployee);
    const [loading, setLoading] = useState(false);
    const [fetchingItems, setFetchingItems] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [inventory, setInventory] = useState<any[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [recentPours, setRecentPours] = useState<any[]>([]);

    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
    const [pourQty, setPourQty] = useState<number>(1);
    const [pourType, setPourType] = useState<string>("standard");

    const fetchItems = async () => {
        setFetchingItems(true);
        const supabase = createClient();
        try {
            const [invRes, recRes, pourRes] = await Promise.all([
                supabase.from("inventory_items").select("*").eq("location_id", locationId).order("name"),
                supabase.from("recipes").select("*").eq("location_id", locationId).order("name"),
                supabase.from("pours")
                    .select("*, inventory_items(name), recipes(name)")
                    .eq("location_id", locationId)
                    .order("created_at", { ascending: false })
                    .limit(5)
            ]);

            setInventory(invRes.data || []);
            setRecipes(recRes.data || []);
            setRecentPours(pourRes.data || []);
        } catch (err) {
            console.error("Error fetching pour data:", err);
        } finally {
            setFetchingItems(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [locationId]);

    const handleLogPour = async () => {
        if (!selectedItem || !locationId) return;

        setLoading(true);
        const supabase = createClient();
        try {
            const pourData: PourInsert = {
                location_id: locationId,
                inventory_item_id: selectedItem.id,
                recipe_id: selectedRecipe?.id || null,
                employee_id: currentEmployee?.id || null,
                quantity: pourQty,
                unit: selectedItem.unit,
                pour_type: pourType as any
            };

            const { error } = await (supabase
                .from("pours") as any)
                .insert(pourData);

            if (error) throw error;

            toast.success("Pour logged successfully!");
            fetchItems();
            setSelectedItem(null);
            setSelectedRecipe(null);
            setPourQty(1);
            setPourType("standard");
        } catch (err: any) {
            toast.error(err.message || "Failed to log pour");
        } finally {
            setLoading(false);
        }
    };

    const filteredInventory = inventory.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredRecipes = recipes.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="card h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-pink-500/20 rounded-lg">
                        <Activity className="h-5 w-5 text-pink-500" />
                    </div>
                    <h2 className="font-bold text-lg">Quick Pour Tracker</h2>
                </div>
                <History className="h-5 w-5 text-slate-500" />
            </div>

            <div className="flex-1 space-y-6">
                {/* Search & Selection */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search drink or bottle..."
                            className="input !pl-10 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {searchQuery && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto p-1 shadow-2xl">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 py-2">Recipes</p>
                            {filteredRecipes.map(recipe => (
                                <button
                                    key={recipe.id}
                                    onClick={() => {
                                        setSelectedRecipe(recipe);
                                        setSearchQuery("");
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800 rounded-lg text-sm transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <ChefHat className="h-3.5 w-3.5 text-orange-400" />
                                        <span>{recipe.name}</span>
                                    </div>
                                    <ChevronRight className="h-3 w-3 text-slate-600" />
                                </button>
                            ))}
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 py-2 border-t border-slate-800 mt-1">Inventory</p>
                            {filteredInventory.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedItem(item);
                                        setSearchQuery("");
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800 rounded-lg text-sm transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <Package className="h-3.5 w-3.5 text-slate-400" />
                                        <span>{item.name}</span>
                                    </div>
                                    <ChevronRight className="h-3 w-3 text-slate-600" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Entry UI */}
                {(selectedItem || selectedRecipe) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {selectedRecipe ? <ChefHat className="h-5 w-5 text-orange-500" /> : <Package className="h-5 w-5 text-slate-400" />}
                                <div>
                                    <p className="font-bold">{selectedRecipe?.name || selectedItem?.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {selectedRecipe ? "Linking pour to recipe" : `Logging ${selectedItem?.unit} pour`}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedItem(null); setSelectedRecipe(null); }} className="p-1.5 hover:bg-slate-800 rounded-lg">
                                <X className="h-4 w-4 text-slate-500" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Quantity</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="input w-full font-mono text-center"
                                    value={pourQty}
                                    onChange={(e) => setPourQty(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Type</label>
                                <select
                                    className="input w-full"
                                    value={pourType}
                                    onChange={(e) => setPourType(e.target.value)}
                                >
                                    <option value="standard">Standard</option>
                                    <option value="double">Double</option>
                                    <option value="shot">Shot</option>
                                    <option value="manual">Manual</option>
                                </select>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary w-full py-4 bg-pink-500 hover:bg-pink-600 border-none shadow-lg shadow-pink-500/20"
                            onClick={handleLogPour}
                            disabled={loading || (selectedRecipe && !selectedItem) || (!selectedRecipe && !selectedItem)}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Pour"}
                        </button>
                    </div>
                )}

                {/* Recent Pours */}
                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent Activity</p>
                    <div className="space-y-2">
                        {recentPours.map(pour => (
                            <div key={pour.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-3">
                                    <TrendingDown className="h-4 w-4 text-red-400" />
                                    <div>
                                        <p className="text-sm font-medium">{pour.inventory_items?.name}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {new Date(pour.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {pour.pour_type}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-slate-300">-{pour.quantity}{pour.unit}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
