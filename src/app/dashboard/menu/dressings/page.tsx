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
type MenuItem = { id: string; name: string };
type KdsScreen = { id: string; name: string };
type Dressing = {
    id: string;
    name: string;
    price: number;
    is_active: boolean;
    assigned_categories: string[];
    assigned_items: string[];
    assigned_kds: string[];
};

export default function DressingsPage() {
    const { t } = useTranslation();
    const [dressings, setDressings] = useState<Dressing[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [kdsScreens, setKdsScreens] = useState<KdsScreen[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingDressing, setEditingDressing] = useState<Dressing | null>(null);

    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const fetchMenuAndDressings = async () => {
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

            // Fetch items
            const { data: items } = await supabase
                .from("menu_items")
                .select("id, name")
                .eq("location_id", currentLocation.id);
            setMenuItems(items || []);

            // Fetch KDS screens
            const { data: screens } = await supabase
                .from("kds_screens")
                .select("id, name")
                .eq("location_id", currentLocation.id)
                .eq("is_active", true);
            setKdsScreens(screens || []);

            // Fetch dressings and their assignments
            const { data: dressingsData, error: dressingsError } = await (supabase
                .from("dressings") as any)
                .select(`
                    id, 
                    name, 
                    price, 
                    is_active,
                    dressing_assignments(category_id, menu_item_id),
                    dressing_kds_assignments(kds_screen_id)
                `)
                .eq("location_id", currentLocation.id)
                .order("created_at", { ascending: false });

            if (dressingsError) throw dressingsError;

            const formattedDressings: Dressing[] = (dressingsData || []).map((d: any) => ({
                id: d.id,
                name: d.name,
                price: parseFloat(d.price),
                is_active: d.is_active,
                assigned_categories: (d.dressing_assignments || []).filter((a: any) => a.category_id).map((a: any) => a.category_id),
                assigned_items: (d.dressing_assignments || []).filter((a: any) => a.menu_item_id).map((a: any) => a.menu_item_id),
                assigned_kds: (d.dressing_kds_assignments || []).map((a: any) => a.kds_screen_id),
            }));

            setDressings(formattedDressings);
        } catch (error) {
            console.error("Error fetching dressings:", error);
            toast.error("Failed to load dressings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuAndDressings();
    }, [currentLocation?.id]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this dressing?")) return;
        try {
            const { error } = await (supabase.from("dressings") as any).delete().eq("id", id);
            if (error) throw error;
            toast.success("Dressing deleted");
            fetchMenuAndDressings();
        } catch (error) {
            console.error("Error deleting dressing:", error);
            toast.error("Failed to delete dressing");
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
                        <h1 className="text-3xl font-bold">Salad Dressings</h1>
                        <p className="text-slate-400 mt-1">
                            Manage dressings mapped to salad categories or individual items
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                >
                    <Plus className="h-4 w-4" />
                    Create Dressing
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <p className="mt-4 text-slate-400">Loading dressings...</p>
                </div>
            ) : dressings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dressings.map((d) => (
                        <div key={d.id} className="card group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{d.name}</h3>
                                    <p className="text-orange-400 font-bold mt-1">
                                        +{formatCurrency(d.price)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingDressing(d)}
                                        className="btn btn-ghost btn-sm p-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(d.id)}
                                        className="btn btn-ghost btn-sm p-2 text-slate-500 hover:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-800">
                                {d.assigned_categories.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Categories:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {d.assigned_categories.map((catId) => {
                                                const cat = categories.find((c) => c.id === catId);
                                                return (
                                                    <span
                                                        key={catId}
                                                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300"
                                                    >
                                                        {cat?.name || "Deleted Category"}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {d.assigned_kds.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                                            KDS Stations:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {d.assigned_kds.map((kdsId) => {
                                                const screen = kdsScreens.find((k) => k.id === kdsId);
                                                return (
                                                    <span
                                                        key={kdsId}
                                                        className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-[10px] text-blue-400 font-bold uppercase"
                                                    >
                                                        {screen?.name || "Deleted KDS"}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {d.assigned_categories.length === 0 && d.assigned_items.length === 0 && d.assigned_kds.length === 0 && (
                                    <span className="text-xs text-slate-500 italic">
                                        No assignments
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card py-20 text-center">
                    <Layers className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold">No Dressings yet</h3>
                    <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                        Create dressings like "Ranch" or "Blue Cheese" and map them to categories or items.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary mt-8"
                    >
                        <Plus className="h-4 w-4" />
                        Create First Dressing
                    </button>
                </div>
            )}

            {/* Modals */}
            {(showAddModal || editingDressing) && (
                <DressingModal
                    categories={categories}
                    menuItems={menuItems}
                    kdsScreens={kdsScreens}
                    dressing={editingDressing || undefined}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingDressing(null);
                    }}
                    onSuccess={() => {
                        setShowAddModal(false);
                        setEditingDressing(null);
                        fetchMenuAndDressings();
                    }}
                />
            )}
        </div>
    );
}

function DressingModal({
    categories,
    menuItems,
    kdsScreens,
    dressing,
    onClose,
    onSuccess,
}: {
    categories: Category[];
    menuItems: MenuItem[];
    kdsScreens: KdsScreen[];
    dressing?: Dressing;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [name, setName] = useState(dressing?.name || "");
    const [price, setPrice] = useState(dressing?.price.toString() || "0");
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        dressing?.assigned_categories || []
    );
    const [selectedItems, setSelectedItems] = useState<string[]>(
        dressing?.assigned_items || []
    );
    const [selectedKds, setSelectedKds] = useState<string[]>(
        dressing?.assigned_kds || []
    );
    const [loading, setLoading] = useState(false);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const toggleCategory = (catId: string) => {
        setSelectedCategories((prev) =>
            prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
        );
    };

    const toggleItem = (itemId: string) => {
        setSelectedItems((prev) =>
            prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
        );
    };

    const toggleKds = (kdsId: string) => {
        setSelectedKds((prev) =>
            prev.includes(kdsId) ? prev.filter((id) => id !== kdsId) : [...prev, kdsId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation?.id || !name.trim()) return;

        setLoading(true);
        try {
            let dressingId = dressing?.id;

            if (dressingId) {
                // Update
                const { error } = await (supabase.from("dressings") as any)
                    .update({
                        name: name.trim(),
                        price: parseFloat(price),
                    })
                    .eq("id", dressingId);
                if (error) throw error;

                // Simple reconcile for assignments: delete all and re-insert
                await (supabase.from("dressing_assignments") as any)
                    .delete()
                    .eq("dressing_id", dressingId);

                await (supabase.from("dressing_kds_assignments") as any)
                    .delete()
                    .eq("dressing_id", dressingId);
            } else {
                // Insert
                const { data, error } = await (supabase.from("dressings") as any)
                    .insert({
                        location_id: currentLocation.id,
                        name: name.trim(),
                        price: parseFloat(price),
                    })
                    .select("id")
                    .single();
                if (error) throw error;
                dressingId = data.id;
            }

            // Insert assignments
            const assignments = [
                ...selectedCategories.map((catId) => ({
                    dressing_id: dressingId,
                    category_id: catId,
                    menu_item_id: null
                })),
                ...selectedItems.map((itemId) => ({
                    dressing_id: dressingId,
                    category_id: null,
                    menu_item_id: itemId
                }))
            ];

            if (assignments.length > 0 && dressingId) {
                const { error } = await (supabase.from("dressing_assignments") as any).insert(
                    assignments
                );
                if (error) throw error;
            }

            // Insert KDS assignments
            if (selectedKds.length > 0 && dressingId) {
                const { error } = await (supabase.from("dressing_kds_assignments") as any).insert(
                    selectedKds.map(kdsId => ({
                        dressing_id: dressingId,
                        kds_screen_id: kdsId
                    }))
                );
                if (error) throw error;
            }

            toast.success(dressing ? "Dressing updated" : "Dressing created");
            onSuccess();
        } catch (error) {
            console.error("Error saving dressing:", error);
            toast.error("Failed to save dressing");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">{dressing ? "Edit Dressing" : "Create Dressing"}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="label">Dressing Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                                placeholder='e.g. Ranch'
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
                        <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-2">
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

                    <div>
                        <label className="label mb-2">Assign to Individual Items</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-2">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => toggleItem(item.id)}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all text-left",
                                        selectedItems.includes(item.id)
                                            ? "bg-orange-500 border-orange-400 text-white"
                                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                    )}
                                >
                                    {item.name}
                                    {selectedItems.includes(item.id) && (
                                        <Check className="h-4 w-4" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="label mb-2 border-t border-slate-700 pt-6">Assign to KDS Stations (Optional)</label>
                        <p className="text-[10px] text-slate-500 mb-2 italic">Mappings here will send the entire main item to these stations if this dressing is selected.</p>
                        <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-2">
                            {kdsScreens.map((screen) => (
                                <button
                                    key={screen.id}
                                    type="button"
                                    onClick={() => toggleKds(screen.id)}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all text-left",
                                        selectedKds.includes(screen.id)
                                            ? "bg-blue-600 border-blue-400 text-white"
                                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                    )}
                                >
                                    {screen.name}
                                    {selectedKds.includes(screen.id) && (
                                        <Check className="h-4 w-4" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-800">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    {dressing ? "Update Dressing" : "Save Dressing"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
