"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Loader2, Link2, Check, X, Layers } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface AddOn {
    id: string;
    name: string;
    price: number;
    is_active: boolean;
}

interface LinkAddOnModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipeId: string | null;
    recipeName?: string;
    locationId: string;
    onLinkComplete: () => void;
}

export default function LinkAddOnModal({
    isOpen,
    onClose,
    recipeId,
    recipeName,
    locationId,
    onLinkComplete
}: LinkAddOnModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [loading, setLoading] = useState(false);
    const [linking, setLinking] = useState(false);
    const [selectedAddOnId, setSelectedAddOnId] = useState<string | null>(null);
    const [existingLinks, setExistingLinks] = useState<Set<string>>(new Set());

    // Fetch add-ons when modal opens
    useEffect(() => {
        if (isOpen && locationId && recipeId) {
            fetchAddOns();
            fetchExistingLinks();
        } else {
            // Reset state on close
            setSearchQuery("");
            setSelectedAddOnId(null);
        }
    }, [isOpen, locationId, recipeId]);

    const fetchAddOns = async () => {
        setLoading(true);
        const supabase = createClient();
        try {
            const { data, error } = await (supabase
                .from("add_ons") as any)
                .select("id, name, price, is_active")
                .eq("location_id", locationId)
                .eq("is_active", true)
                .order("name");

            if (error) throw error;
            setAddOns(data || []);
        } catch (error) {
            console.error("Error fetching add-ons:", error);
            toast.error("Failed to load add-ons");
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingLinks = async () => {
        if (!recipeId) return;
        const supabase = createClient();
        try {
            const { data, error } = await (supabase
                .from("add_on_recipe_links") as any)
                .select("add_on_id")
                .eq("recipe_id", recipeId);

            if (error) throw error;
            setExistingLinks(new Set((data || []).map((link: any) => link.add_on_id)));
        } catch (error) {
            console.error("Error fetching existing links:", error);
        }
    };

    const handleLink = async () => {
        if (!recipeId || !selectedAddOnId) return;

        setLinking(true);
        const supabase = createClient();
        try {
            const { error } = await (supabase
                .from("add_on_recipe_links") as any)
                .insert({
                    recipe_id: recipeId,
                    add_on_id: selectedAddOnId
                });

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    toast.error("This add-on is already linked to this recipe.");
                } else {
                    throw error;
                }
            } else {
                toast.success("Add-on linked successfully! Its ingredients will now be deducted when ordered.");
                onLinkComplete();
                onClose();
            }
        } catch (error) {
            console.error("Error linking add-on:", error);
            toast.error("Failed to link add-on");
        } finally {
            setLinking(false);
        }
    };

    const filteredAddOns = addOns.filter(addOn =>
        addOn.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="card w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-500" />
                        Link Add-On
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
                        Select an add-on to link to <span className="text-white font-medium">{recipeName || "this recipe"}</span>.
                        When this add-on is ordered, ingredients from this recipe will be deducted from inventory.
                    </p>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search add-ons..."
                            className="input w-full pl-10 bg-slate-950 border-slate-800 focus:border-purple-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="border border-slate-800 rounded-lg bg-slate-950/50 max-h-[300px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                            </div>
                        ) : filteredAddOns.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                {addOns.length === 0
                                    ? "No add-ons found. Create add-ons in Menu → Add Ons first."
                                    : "No add-ons match your search."
                                }
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {filteredAddOns.map((addOn) => {
                                    const isAlreadyLinked = existingLinks.has(addOn.id);
                                    return (
                                        <button
                                            key={addOn.id}
                                            onClick={() => !isAlreadyLinked && setSelectedAddOnId(addOn.id)}
                                            disabled={isAlreadyLinked}
                                            className={cn(
                                                "w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between group",
                                                isAlreadyLinked
                                                    ? "opacity-50 cursor-not-allowed bg-slate-800/30"
                                                    : selectedAddOnId === addOn.id
                                                        ? "bg-purple-500/10 text-purple-400"
                                                        : "hover:bg-slate-800/50 text-slate-300"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium">{addOn.name}</span>
                                                <span className="text-xs text-slate-500">
                                                    +${addOn.price.toFixed(2)}
                                                </span>
                                            </div>
                                            {isAlreadyLinked ? (
                                                <span className="text-xs text-green-400 flex items-center gap-1">
                                                    <Check className="w-3 h-3" />
                                                    Linked
                                                </span>
                                            ) : selectedAddOnId === addOn.id ? (
                                                <Check className="w-4 h-4 text-purple-500" />
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
                        disabled={!selectedAddOnId || linking}
                        className="btn btn-primary bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {linking ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Linking...
                            </>
                        ) : (
                            <>
                                <Link2 className="w-4 h-4 mr-2" />
                                Link Add-On
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
