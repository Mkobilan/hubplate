"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Loader2, Link2, Plus, Check, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];

interface LinkMenuItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipeId: string | null;
    recipeName?: string;
    locationId: string;
    onLinkComplete: () => void;
}

export default function LinkMenuItemModal({
    isOpen,
    onClose,
    recipeId,
    recipeName,
    locationId,
    onLinkComplete
}: LinkMenuItemModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [linking, setLinking] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    // Fetch menu items when modal opens
    useEffect(() => {
        if (isOpen && locationId) {
            fetchMenuItems();
        } else {
            // Reset state on close
            setSearchQuery("");
            setSelectedItemId(null);
        }
    }, [isOpen, locationId]);

    const fetchMenuItems = async () => {
        setLoading(true);
        const supabase = createClient();
        try {
            // Fetch all available menu items for this location
            const { data, error } = await supabase
                .from("menu_items")
                .select("*")
                .eq("location_id", locationId)
                .order("name");

            if (error) throw error;
            setMenuItems(data || []);
        } catch (error) {
            console.error("Error fetching menu items:", error);
            toast.error("Failed to load menu items");
        } finally {
            setLoading(false);
        }
    };

    const handleLink = async () => {
        if (!recipeId || !selectedItemId) return;

        setLinking(true);
        const supabase = createClient();
        try {
            const { error } = await (supabase
                .from("recipe_menu_items") as any)
                .insert({
                    recipe_id: recipeId,
                    menu_item_id: selectedItemId
                });

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    toast.error("This menu item is already linked to this recipe.");
                } else {
                    throw error;
                }
            } else {
                toast.success("Menu item linked successfully");
                onLinkComplete();
                onClose();
            }
        } catch (error) {
            console.error("Error linking menu item:", error);
            toast.error("Failed to link menu item");
        } finally {
            setLinking(false);
        }
    };

    const filteredItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="card w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-blue-500" />
                        Link Menu Item
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"
                    >
                        <span className="sr-only">Close</span>
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-400">
                        Select a menu item to link to <span className="text-white font-medium">{recipeName || "this recipe"}</span>.
                        When this menu item is ordered, ingredients from this recipe will be deducted.
                    </p>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search menu items..."
                            className="input w-full pl-10 bg-slate-950 border-slate-800 focus:border-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="border border-slate-800 rounded-lg bg-slate-950/50 max-h-[300px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                No menu items found.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {filteredItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedItemId(item.id)}
                                        className={cn(
                                            "w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between group",
                                            selectedItemId === item.id
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "hover:bg-slate-800/50 text-slate-300"
                                        )}
                                    >
                                        <span className="font-medium">{item.name}</span>
                                        {selectedItemId === item.id && (
                                            <Check className="w-4 h-4 text-blue-500" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        disabled={linking}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleLink}
                        disabled={!selectedItemId || linking}
                        className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {linking ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Linking...
                            </>
                        ) : (
                            <>
                                <Link2 className="w-4 h-4 mr-2" />
                                Link Item
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
