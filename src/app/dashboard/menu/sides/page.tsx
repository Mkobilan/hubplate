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
type Side = {
    id: string;
    name: string;
    price: number;
    is_active: boolean;
    assigned_categories: string[];
    assigned_items: string[];
    assigned_kds: string[];
};

export default function SidesPage() {
    const { t } = useTranslation();
    const [sides, setSides] = useState<Side[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [kdsScreens, setKdsScreens] = useState<KdsScreen[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSide, setEditingSide] = useState<Side | null>(null);

    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const fetchMenuAndSides = async () => {
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

            // Fetch sides and their assignments
            const { data: sidesData, error: sidesError } = await (supabase
                .from("sides") as any)
                .select(`
                    id, 
                    name, 
                    price, 
                    is_active,
                    side_assignments(category_id, menu_item_id),
                    side_kds_assignments(kds_screen_id)
                `)
                .eq("location_id", currentLocation.id)
                .order("created_at", { ascending: false });

            if (sidesError) throw sidesError;

            const formattedSides: Side[] = (sidesData || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                price: parseFloat(s.price),
                is_active: s.is_active,
                assigned_categories: (s.side_assignments || []).filter((a: any) => a.category_id).map((a: any) => a.category_id),
                assigned_items: (s.side_assignments || []).filter((a: any) => a.menu_item_id).map((a: any) => a.menu_item_id),
                assigned_kds: (s.side_kds_assignments || []).map((a: any) => a.kds_screen_id),
            }));

            setSides(formattedSides);
        } catch (error) {
            console.error("Error fetching sides:", error);
            toast.error("Failed to load sides");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuAndSides();
    }, [currentLocation?.id]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this side?")) return;
        try {
            const { error } = await (supabase.from("sides") as any).delete().eq("id", id);
            if (error) throw error;
            toast.success("Side deleted");
            fetchMenuAndSides();
        } catch (error) {
            console.error("Error deleting side:", error);
            toast.error("Failed to delete side");
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
                        <h1 className="text-3xl font-bold">Sides</h1>
                        <p className="text-slate-400 mt-1">
                            Manage sides like fries or salad mapped to categories or items
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                >
                    <Plus className="h-4 w-4" />
                    Create Side
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <p className="mt-4 text-slate-400">Loading sides...</p>
                </div>
            ) : sides.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sides.map((s) => (
                        <div key={s.id} className="card group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{s.name}</h3>
                                    <p className="text-orange-400 font-bold mt-1">
                                        +{formatCurrency(s.price)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingSide(s)}
                                        className="btn btn-ghost btn-sm p-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        className="btn btn-ghost btn-sm p-2 text-slate-500 hover:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-800">
                                {s.assigned_categories.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Categories:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {s.assigned_categories.map((catId) => {
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
                                {s.assigned_kds.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                                            KDS Stations:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {s.assigned_kds.map((kdsId) => {
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
                                {s.assigned_categories.length === 0 && s.assigned_items.length === 0 && s.assigned_kds.length === 0 && (
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
                    <h3 className="text-xl font-bold">No Sides yet</h3>
                    <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                        Create sides like "French Fries" or "Garden Salad" and map them to categories or items.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary mt-8"
                    >
                        <Plus className="h-4 w-4" />
                        Create First Side
                    </button>
                </div>
            )}

            {/* Modals */}
            {(showAddModal || editingSide) && (
                <SideModal
                    categories={categories}
                    menuItems={menuItems}
                    kdsScreens={kdsScreens}
                    side={editingSide || undefined}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingSide(null);
                    }}
                    onSuccess={() => {
                        setShowAddModal(false);
                        setEditingSide(null);
                        fetchMenuAndSides();
                    }}
                />
            )}
        </div>
    );
}

function SideModal({
    categories,
    menuItems,
    kdsScreens,
    side,
    onClose,
    onSuccess,
}: {
    categories: Category[];
    menuItems: MenuItem[];
    kdsScreens: KdsScreen[];
    side?: Side;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [name, setName] = useState(side?.name || "");
    const [price, setPrice] = useState(side?.price.toString() || "0");
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        side?.assigned_categories || []
    );
    const [selectedItems, setSelectedItems] = useState<string[]>(
        side?.assigned_items || []
    );
    const [selectedKds, setSelectedKds] = useState<string[]>(
        side?.assigned_kds || []
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
            let sideId = side?.id;

            if (sideId) {
                // Update
                const { error } = await (supabase.from("sides") as any)
                    .update({
                        name: name.trim(),
                        price: parseFloat(price),
                    })
                    .eq("id", sideId);
                if (error) throw error;

                // Simple reconcile for assignments: delete all and re-insert
                await (supabase.from("side_assignments") as any)
                    .delete()
                    .eq("side_id", sideId);

                await (supabase.from("side_kds_assignments") as any)
                    .delete()
                    .eq("side_id", sideId);
            } else {
                // Insert
                const { data, error } = await (supabase.from("sides") as any)
                    .insert({
                        location_id: currentLocation.id,
                        name: name.trim(),
                        price: parseFloat(price),
                    })
                    .select("id")
                    .single();
                if (error) throw error;
                sideId = data.id;
            }

            // Insert assignments
            const assignments = [
                ...selectedCategories.map((catId) => ({
                    side_id: sideId,
                    category_id: catId,
                    menu_item_id: null
                })),
                ...selectedItems.map((itemId) => ({
                    side_id: sideId,
                    category_id: null,
                    menu_item_id: itemId
                }))
            ];

            if (assignments.length > 0 && sideId) {
                const { error } = await (supabase.from("side_assignments") as any).insert(
                    assignments
                );
                if (error) throw error;
            }

            // Insert KDS assignments
            if (selectedKds.length > 0 && sideId) {
                const { error } = await (supabase.from("side_kds_assignments") as any).insert(
                    selectedKds.map(kdsId => ({
                        side_id: sideId,
                        kds_screen_id: kdsId
                    }))
                );
                if (error) throw error;
            }

            toast.success(side ? "Side updated" : "Side created");
            onSuccess();
        } catch (error) {
            console.error("Error saving side:", error);
            toast.error("Failed to save side");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">{side ? "Edit Side" : "Create Side"}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="label">Side Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                                placeholder='e.g. French Fries'
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
                        <p className="text-[10px] text-slate-500 mb-2 italic">Mappings here will send the entire main item to these stations if this side is selected.</p>
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
                                    {side ? "Update Side" : "Save Side"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
