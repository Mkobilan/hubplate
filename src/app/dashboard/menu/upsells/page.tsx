"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    Plus,
    Trash2,
    ChevronLeft,
    Save,
    Sparkles,
    Loader2,
    Check,
    X,
    Search,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";

type Category = { id: string; name: string };
type MenuItem = { id: string; name: string; category_id: string };
type Upsell = {
    id: string;
    name: string;
    price: number;
    is_active: boolean;
    assignments: {
        item_ids: string[];
        category_ids: string[];
    };
};

export default function UpsellsPage() {
    const { t } = useTranslation();
    const [upsells, setUpsells] = useState<Upsell[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUpsell, setEditingUpsell] = useState<Upsell | null>(null);

    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const fetchData = async () => {
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

            // Fetch menu items
            const { data: items } = await supabase
                .from("menu_items")
                .select("id, name, category_id")
                .eq("location_id", currentLocation.id);
            setMenuItems(items || []);

            // Fetch upsells and their assignments
            const { data: upsellsData, error: upsellsError } = await (supabase
                .from("upsells") as any)
                .select(`
                    id, 
                    name, 
                    price, 
                    is_active,
                    upsell_assignments(menu_item_id, category_id)
                `)
                .eq("location_id", currentLocation.id)
                .order("created_at", { ascending: false });

            if (upsellsError) throw upsellsError;

            const formattedUpsells: Upsell[] = (upsellsData || []).map((u: any) => ({
                id: u.id,
                name: u.name,
                price: parseFloat(u.price),
                is_active: u.is_active,
                assignments: {
                    item_ids: u.upsell_assignments.map((a: any) => a.menu_item_id).filter(Boolean),
                    category_ids: u.upsell_assignments.map((a: any) => a.category_id).filter(Boolean),
                },
            }));

            setUpsells(formattedUpsells);
        } catch (error) {
            console.error("Error fetching upsells:", error);
            toast.error("Failed to load upsells");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentLocation?.id]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this upsell?")) return;
        try {
            const { error } = await (supabase.from("upsells") as any).delete().eq("id", id);
            if (error) throw error;
            toast.success("Upsell deleted");
            fetchData();
        } catch (error) {
            console.error("Error deleting upsell:", error);
            toast.error("Failed to delete upsell");
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
                        <h1 className="text-3xl font-bold">Upsells</h1>
                        <p className="text-slate-400 mt-1">
                            Configure suggestions to offer when items are selected
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                >
                    <Plus className="h-4 w-4" />
                    Create Upsell
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <p className="mt-4 text-slate-400">Loading upsells...</p>
                </div>
            ) : upsells.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upsells.map((u) => (
                        <div key={u.id} className="card group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{u.name}</h3>
                                    <p className="text-orange-400 font-bold mt-1">
                                        {formatCurrency(u.price)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingUpsell(u)}
                                        className="btn btn-ghost btn-sm p-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(u.id)}
                                        className="btn btn-ghost btn-sm p-2 text-slate-500 hover:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-800">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <AlertCircle className="h-3 w-3" /> Assignments
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {u.assignments.category_ids.map((catId) => (
                                            <span key={catId} className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-[10px] font-bold text-orange-400">
                                                CAT: {categories.find(c => c.id === catId)?.name || 'Deleted'}
                                            </span>
                                        ))}
                                        {u.assignments.item_ids.map((itemId) => (
                                            <span key={itemId} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-bold text-blue-400">
                                                ITEM: {menuItems.find(i => i.id === itemId)?.name || 'Deleted'}
                                            </span>
                                        ))}
                                        {u.assignments.category_ids.length === 0 && u.assignments.item_ids.length === 0 && (
                                            <span className="text-[10px] text-slate-500 italic">No assignments</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card py-20 text-center">
                    <Sparkles className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold">No Upsells yet</h3>
                    <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                        Create suggestions like "Make it a Meal" or "Add a Side Salad" to increase check totals.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary mt-8"
                    >
                        <Plus className="h-4 w-4" />
                        Create First Upsell
                    </button>
                </div>
            )}

            {/* Modals */}
            {(showAddModal || editingUpsell) && (
                <UpsellModal
                    categories={categories}
                    menuItems={menuItems}
                    upsell={editingUpsell || undefined}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingUpsell(null);
                    }}
                    onSuccess={() => {
                        setShowAddModal(false);
                        setEditingUpsell(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}

function UpsellModal({
    categories,
    menuItems,
    upsell,
    onClose,
    onSuccess,
}: {
    categories: Category[];
    menuItems: MenuItem[];
    upsell?: Upsell;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [name, setName] = useState(upsell?.name || "");
    const [price, setPrice] = useState(upsell?.price.toString() || "0");
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        upsell?.assignments.category_ids || []
    );
    const [selectedItems, setSelectedItems] = useState<string[]>(
        upsell?.assignments.item_ids || []
    );
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const toggleCategory = (id: string) => {
        setSelectedCategories(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleItem = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation?.id || !name.trim()) return;

        setLoading(true);
        try {
            let upsellId = upsell?.id;

            if (upsellId) {
                const { error } = await (supabase.from("upsells") as any)
                    .update({
                        name: name.trim(),
                        price: parseFloat(price),
                    })
                    .eq("id", upsellId);
                if (error) throw error;

                await (supabase.from("upsell_assignments") as any)
                    .delete()
                    .eq("upsell_id", upsellId);
            } else {
                const { data, error } = await (supabase.from("upsells") as any)
                    .insert({
                        location_id: currentLocation.id,
                        name: name.trim(),
                        price: parseFloat(price),
                    })
                    .select("id")
                    .single();
                if (error) throw error;
                upsellId = data.id;
            }

            const assignments = [
                ...selectedCategories.map(catId => ({ upsell_id: upsellId, category_id: catId })),
                ...selectedItems.map(itemId => ({ upsell_id: upsellId, menu_item_id: itemId }))
            ];

            if (assignments.length > 0 && upsellId) {
                const { error } = await (supabase.from("upsell_assignments") as any).insert(assignments);
                if (error) throw error;
            }

            toast.success(upsell ? "Upsell updated" : "Upsell created");
            onSuccess();
        } catch (error) {
            console.error("Error saving upsell:", error);
            toast.error("Failed to save upsell");
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = menuItems.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-900 pb-4 z-10">
                    <h2 className="text-2xl font-bold">{upsell ? "Edit Upsell" : "Create Upsell"}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="label">Upsell Item Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                                placeholder='e.g. Upgrade to Large'
                                required
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="label">Upsell Price ($)</label>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Categories Column */}
                        <div className="space-y-4">
                            <label className="label">Assign to Categories</label>
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
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
                                        {selectedCategories.includes(cat.id) && <Check className="h-4 w-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Items Column */}
                        <div className="space-y-4">
                            <label className="label">Assign to Specific Items</label>
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                <input
                                    className="input !pl-9 btn-sm !text-xs"
                                    placeholder="Search items..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                                {filteredItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleItem(item.id)}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all text-left",
                                            selectedItems.includes(item.id)
                                                ? "bg-blue-500 border-blue-400 text-white"
                                                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                        )}
                                    >
                                        <div className="flex flex-col">
                                            <span>{item.name}</span>
                                            <span className="text-[10px] opacity-70">
                                                {categories.find(c => c.id === item.category_id)?.name}
                                            </span>
                                        </div>
                                        {selectedItems.includes(item.id) && <Check className="h-4 w-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900 pb-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    {upsell ? "Update Upsell" : "Save Upsell"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
