"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Loader2, Link2, Check, X, Salad } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Dressing {
    id: string;
    name: string;
    price: number;
    is_active: boolean;
}

interface LinkDressingModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipeId: string | null;
    recipeName?: string;
    locationId: string;
    onLinkComplete: () => void;
}

export default function LinkDressingModal({
    isOpen,
    onClose,
    recipeId,
    recipeName,
    locationId,
    onLinkComplete
}: LinkDressingModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [dressings, setDressings] = useState<Dressing[]>([]);
    const [loading, setLoading] = useState(false);
    const [linking, setLinking] = useState(false);
    const [selectedDressingId, setSelectedDressingId] = useState<string | null>(null);
    const [existingLinks, setExistingLinks] = useState<Set<string>>(new Set());

    // Fetch dressings when modal opens
    useEffect(() => {
        if (isOpen && locationId && recipeId) {
            fetchDressings();
            fetchExistingLinks();
        } else {
            // Reset state on close
            setSearchQuery("");
            setSelectedDressingId(null);
        }
    }, [isOpen, locationId, recipeId]);

    const fetchDressings = async () => {
        setLoading(true);
        const supabase = createClient();
        try {
            const { data, error } = await (supabase
                .from("dressings") as any)
                .select("id, name, price, is_active")
                .eq("location_id", locationId)
                .eq("is_active", true)
                .order("name");

            if (error) throw error;
            setDressings(data || []);
        } catch (error) {
            console.error("Error fetching dressings:", error);
            toast.error("Failed to load dressings");
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingLinks = async () => {
        if (!recipeId) return;
        const supabase = createClient();
        try {
            const { data, error } = await (supabase
                .from("dressing_recipe_links") as any)
                .select("dressing_id")
                .eq("recipe_id", recipeId);

            if (error) throw error;
            setExistingLinks(new Set((data || []).map((link: any) => link.dressing_id)));
        } catch (error) {
            console.error("Error fetching existing links:", error);
        }
    };

    const handleLink = async () => {
        if (!recipeId || !selectedDressingId) return;

        setLinking(true);
        const supabase = createClient();
        try {
            const { error } = await (supabase
                .from("dressing_recipe_links") as any)
                .insert({
                    recipe_id: recipeId,
                    dressing_id: selectedDressingId
                });

            if (error) {
                if (error.code === '23505') {
                    toast.error("This dressing is already linked to this recipe.");
                } else {
                    throw error;
                }
            } else {
                toast.success("Dressing linked successfully! Its ingredients will now be deducted when ordered.");
                onLinkComplete();
                onClose();
            }
        } catch (error) {
            console.error("Error linking dressing:", error);
            toast.error("Failed to link dressing");
        } finally {
            setLinking(false);
        }
    };

    const filteredDressings = dressings.filter(dressing =>
        dressing.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="card w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Salad className="w-5 h-5 text-green-500" />
                        Link Dressing
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
                        Select a dressing to link to <span className="text-white font-medium">{recipeName || "this recipe"}</span>.
                        When this dressing is ordered, ingredients from this recipe will be deducted from inventory.
                    </p>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search dressings..."
                            className="input w-full pl-10 bg-slate-950 border-slate-800 focus:border-green-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="border border-slate-800 rounded-lg bg-slate-950/50 max-h-[300px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                            </div>
                        ) : filteredDressings.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                {dressings.length === 0
                                    ? "No dressings found. Create dressings in Menu → Dressings first."
                                    : "No dressings match your search."
                                }
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {filteredDressings.map((dressing) => {
                                    const isAlreadyLinked = existingLinks.has(dressing.id);
                                    return (
                                        <button
                                            key={dressing.id}
                                            onClick={() => !isAlreadyLinked && setSelectedDressingId(dressing.id)}
                                            disabled={isAlreadyLinked}
                                            className={cn(
                                                "w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between group",
                                                isAlreadyLinked
                                                    ? "opacity-50 cursor-not-allowed bg-slate-800/30"
                                                    : selectedDressingId === dressing.id
                                                        ? "bg-green-500/10 text-green-400"
                                                        : "hover:bg-slate-800/50 text-slate-300"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium">{dressing.name}</span>
                                                <span className="text-xs text-slate-500">
                                                    +${dressing.price.toFixed(2)}
                                                </span>
                                            </div>
                                            {isAlreadyLinked ? (
                                                <span className="text-xs text-green-400 flex items-center gap-1">
                                                    <Check className="w-3 h-3" />
                                                    Linked
                                                </span>
                                            ) : selectedDressingId === dressing.id ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : null}
                                        </button>
                                    );
                                })}
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
                        disabled={!selectedDressingId || linking}
                        className="btn btn-primary bg-green-600 hover:bg-green-700 text-white"
                    >
                        {linking ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Linking...
                            </>
                        ) : (
                            <>
                                <Link2 className="w-4 h-4 mr-2" />
                                Link Dressing
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
