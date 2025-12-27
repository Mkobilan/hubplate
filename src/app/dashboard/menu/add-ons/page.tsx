"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    Plus,
    Trash2,
    ChevronLeft,
    Save,
    Layers,
    Loader2,
    Check,
    X,
} from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";

type Category = { id: string; name: string };
type AddOn = {
    id: string;
    name: string;
    price: number;
    is_active: boolean;
    assigned_categories: string[]; // array of category IDs
};

export default function AddOnsPage() {
    const { t } = useTranslation();
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAddOn, setEditingAddOn] = useState<AddOn | null>(null);

    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const fetchMenuAndAddOns = async () => {
        if (!currentLocation?.id) return;
        setLoading(true);
        try {
            // Fetch categories
            const { data: cats } = await supabase
                .from("menu_categories")
                .select("id, name")
                .eq("location_id", currentLocation.id)
                .eq("is_active", true);
            setCategories(cats || []);

            // Fetch add-ons and their category assignments
            const { data: addOnsData, error: addOnsError } = await (supabase
                .from("add_ons") as any)
                .select(`
                    id, 
                    name, 
                    price, 
                    is_active,
                    add_on_category_assignments(category_id)
                `)
                .eq("location_id", currentLocation.id)
                .order("created_at", { ascending: false });

            if (addOnsError) throw addOnsError;

            const formattedAddOns: AddOn[] = (addOnsData || []).map((ao: any) => ({
                id: ao.id,
                name: ao.name,
                price: parseFloat(ao.price),
                is_active: ao.is_active,
                assigned_categories: ao.add_on_category_assignments.map((a: any) => a.category_id),
            }));

            setAddOns(formattedAddOns);
        } catch (error) {
            console.error("Error fetching add-ons:", error);
            toast.error("Failed to load add-ons");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuAndAddOns();
    }, [currentLocation?.id]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this add-on?")) return;
        try {
            const { error } = await (supabase.from("add_ons") as any).delete().eq("id", id);
            if (error) throw error;
            toast.success("Add-on deleted");
            fetchMenuAndAddOns();
        } catch (error) {
            console.error("Error deleting add-on:", error);
            toast.error("Failed to delete add-on");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/menu"
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Add Ons</h1>
                        <p className="text-slate-400 mt-1">
                            Manage extras and their prices mapped to categories
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                >
                    <Plus className="h-4 w-4" />
                    Create Add On
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <p className="mt-4 text-slate-400">Loading add-ons...</p>
                </div>
            ) : addOns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {addOns.map((ao) => (
                        <div key={ao.id} className="card group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{ao.name}</h3>
                                    <p className="text-orange-400 font-bold mt-1">
                                        +{formatCurrency(ao.price)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingAddOn(ao)}
                                        className="btn btn-ghost btn-sm p-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(ao.id)}
                                        className="btn btn-ghost btn-sm p-2 text-slate-500 hover:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-slate-800">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Applies to Categories:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {ao.assigned_categories.length > 0 ? (
                                        ao.assigned_categories.map((catId) => {
                                            const cat = categories.find((c) => c.id === catId);
                                            return (
                                                <span
                                                    key={catId}
                                                    className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300"
                                                >
                                                    {cat?.name || "Deleted Category"}
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span className="text-xs text-slate-500 italic">
                                            No categories mapped
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card py-20 text-center">
                    <Layers className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold">No Add Ons yet</h3>
                    <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                        Create add-ons like "Extra Cheese" or "Add Avocado" and map them to categories.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary mt-8"
                    >
                        <Plus className="h-4 w-4" />
                        Create First Add On
                    </button>
                </div>
            )}

            {/* Modals */}
            {(showAddModal || editingAddOn) && (
                <AddOnModal
                    categories={categories}
                    addOn={editingAddOn || undefined}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingAddOn(null);
                    }}
                    onSuccess={() => {
                        setShowAddModal(false);
                        setEditingAddOn(null);
                        fetchMenuAndAddOns();
                    }}
                />
            )}
        </div>
    );
}

function AddOnModal({
    categories,
    addOn,
    onClose,
    onSuccess,
}: {
    categories: Category[];
    addOn?: AddOn;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [name, setName] = useState(addOn?.name || "");
    const [price, setPrice] = useState(addOn?.price.toString() || "0");
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        addOn?.assigned_categories || []
    );
    const [loading, setLoading] = useState(false);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const toggleCategory = (catId: string) => {
        setSelectedCategories((prev) =>
            prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation?.id || !name.trim()) return;

        setLoading(true);
        try {
            let addOnId = addOn?.id;

            if (addOnId) {
                // Update
                const { error } = await (supabase.from("add_ons") as any)
                    .update({
                        name: name.trim(),
                        price: parseFloat(price),
                    })
                    .eq("id", addOnId);
                if (error) throw error;

                // Simple reconcile for assignments: delete all and re-insert
                await (supabase.from("add_on_category_assignments") as any)
                    .delete()
                    .eq("add_on_id", addOnId);
            } else {
                // Insert
                const { data, error } = await (supabase.from("add_ons") as any)
                    .insert({
                        location_id: currentLocation.id,
                        name: name.trim(),
                        price: parseFloat(price),
                    })
                    .select("id")
                    .single();
                if (error) throw error;
                addOnId = data.id;
            }

            // Insert assignments
            if (selectedCategories.length > 0 && addOnId) {
                const assignments = selectedCategories.map((catId) => ({
                    add_on_id: addOnId,
                    category_id: catId,
                }));
                const { error } = await (supabase.from("add_on_category_assignments") as any).insert(
                    assignments
                );
                if (error) throw error;
            }

            toast.success(addOn ? "Add-on updated" : "Add-on created");
            onSuccess();
        } catch (error) {
            console.error("Error saving add-on:", error);
            toast.error("Failed to save add-on");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative card w-full max-w-lg">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">{addOn ? "Edit Add On" : "Create Add On"}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="label">Add On Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                                placeholder='e.g. Extra Cheese'
                                required
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="label">Price Adjustment ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="input"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label mb-2">Assign to Categories</label>
                        <p className="text-xs text-slate-500 mb-4">
                            Select which categories will show this add-on in the customization modal.
                        </p>
                        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleCategory(cat.id)}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all text-left",
                                        selectedCategories.includes(cat.id)
                                            ? "bg-orange-500 border-orange-400 text-white"
                                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                    )}
                                >
                                    {cat.name}
                                    {selectedCategories.includes(cat.id) && (
                                        <Check className="h-4 w-4" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-800">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    {addOn ? "Update Add On" : "Save Add On"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
