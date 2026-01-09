"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import {
    Plus,
    Search,
    Camera,
    Edit2,
    Trash2,
    MoreVertical,
    AlertCircle,
    Loader2,
    Clock,
    Check,
    X,
    Layers,
    Sparkles,
    FileUp,
    Monitor
} from "lucide-react";
import AssignToKdsModal from "./AssignToKdsModal";
import { cn, formatCurrency } from "@/lib/utils";

import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";
import { useEffect } from "react";

// Type definitions for Supabase integration
type Category = { id: string; name: string };
type MenuItemType = {
    id: string;
    name: string;
    description?: string | null;
    category_id: string;
    price: number;
    cost?: number | null;
    is_86d: boolean;
    category?: { name: string }
};

export default function MenuPage() {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const [isEditingMenu, setIsEditingMenu] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [showKdsAssignModal, setShowKdsAssignModal] = useState(false);

    const currentLocation = useAppStore((state) => state.currentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const supabase = createClient();

    const isTerminalMode = useAppStore((state) => state.isTerminalMode);
    const canEdit = isTerminalMode
        ? (currentEmployee?.role === "owner" || currentEmployee?.role === "manager")
        : isOrgOwner || currentEmployee?.role === "owner" || currentEmployee?.role === "manager";

    const fetchMenuData = async () => {
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

            // Fetch menu items with category names
            const { data: items } = await supabase
                .from("menu_items")
                .select("*, category:menu_categories(name)")
                .eq("location_id", currentLocation.id)
                .order("name");

            setMenuItems(items || []);
        } catch (error) {
            console.error("Error fetching menu data:", error);
            toast.error("Failed to load menu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuData();
    }, [currentLocation?.id]);

    const filteredItems = menuItems.filter((item) => {
        const itemCategoryName = item.category?.name || "Uncategorized";
        const matchesCategory = !selectedCategory || itemCategoryName === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const itemsByCategory = filteredItems.reduce((acc, item) => {
        const catName = item.category?.name || "Uncategorized";
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(item);
        return acc;
    }, {} as Record<string, typeof menuItems>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{t("nav.menu")}</h1>
                    <p className="text-slate-400 mt-1">
                        Manage your menu items and categories
                    </p>
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <Link
                            href="/dashboard/menu/happy-hour"
                            className="btn btn-secondary"
                        >
                            <Clock className="h-4 w-4" />
                            {t("menu.happyHour")}
                        </Link>
                    )}
                    {canEdit && (
                        <>
                            <Link
                                href="/dashboard/menu/add-ons"
                                className="btn btn-secondary"
                            >
                                <Layers className="h-4 w-4" />
                                Add Ons
                            </Link>
                            <Link
                                href="/dashboard/menu/sides"
                                className="btn btn-secondary"
                            >
                                <Layers className="h-4 w-4" />
                                Sides
                            </Link>
                            <Link
                                href="/dashboard/menu/dressings"
                                className="btn btn-secondary"
                            >
                                <Layers className="h-4 w-4" />
                                Dressings
                            </Link>
                            <button
                                onClick={() => setShowScanModal(true)}
                                className="btn btn-secondary"
                            >
                                <Camera className="h-4 w-4" />
                                {t("menu.scanMenu")}
                            </button>
                        </>
                    )}
                    {canEdit && (
                        <button
                            onClick={() => {
                                setIsEditingMenu(!isEditingMenu);
                                setSelectedItems(new Set());
                            }}
                            className={cn(
                                "btn",
                                isEditingMenu ? "btn-primary" : "btn-secondary"
                            )}
                        >
                            {isEditingMenu ? (
                                <>
                                    <Check className="h-4 w-4" />
                                    Done Editing
                                </>
                            ) : (
                                <>
                                    <Edit2 className="h-4 w-4" />
                                    Edit Menu
                                </>
                            )}
                        </button>
                    )}
                    {canEdit && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn btn-primary"
                        >
                            <Plus className="h-4 w-4" />
                            {t("menu.addItem")}
                        </button>
                    )}
                </div>
            </div>

            {isEditingMenu && (
                <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/50 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-400">
                        <AlertCircle className="h-5 w-5" />
                        <p className="font-medium">Menu Edit Mode Active</p>
                    </div>
                    <button
                        onClick={() => setShowAddCategoryModal(true)}
                        className="btn btn-secondary btn-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Add Category
                    </button>
                </div>
            )}

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={`${t("common.search")} menu items...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input !pl-10"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={cn(
                            "btn whitespace-nowrap",
                            !selectedCategory ? "btn-primary" : "btn-secondary"
                        )}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <div key={cat.id} className="relative flex items-center">
                            <button
                                onClick={() => setSelectedCategory(cat.name)}
                                className={cn(
                                    "btn whitespace-nowrap",
                                    selectedCategory === cat.name ? "btn-primary" : "btn-secondary",
                                    isEditingMenu && "pr-8"
                                )}
                            >
                                {cat.name}
                            </button>
                            {isEditingMenu && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCategory(cat);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white bg-slate-800/50 rounded-md transition-colors"
                                >
                                    <Edit2 className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 86'd Items Alert */}
            {menuItems.some((i) => i.is_86d) && (
                <div className="card border-amber-500/50 bg-amber-500/5">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-400" />
                        <p className="text-amber-400 font-medium">
                            {menuItems.filter((i) => i.is_86d).length} items are currently 86&apos;d
                        </p>
                    </div>
                </div>
            )}

            {/* Menu Items by Category */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <p className="mt-4 text-slate-400">Loading menu...</p>
                </div>
            ) : Object.keys(itemsByCategory).length > 0 ? (
                <div className="space-y-8">
                    {Object.entries(itemsByCategory).map(([category, items]) => (
                        <div key={category}>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                {category}
                                <span className="text-sm text-slate-400 font-normal">
                                    ({items.length} items)
                                </span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {items.map((item) => (
                                    <MenuItemCard
                                        key={item.id}
                                        item={item}
                                        onEdit={() => setEditingItem(item)}
                                        onToggle86d={async () => {
                                            try {
                                                const { error } = await (supabase
                                                    .from("menu_items") as any)
                                                    .update({ is_86d: !item.is_86d })
                                                    .eq("id", item.id);
                                                if (error) throw error;
                                                toast.success(item.is_86d ? "Item marked available" : "Item marked 86'd");
                                                fetchMenuData();
                                            } catch (error) {
                                                console.error("Error toggling 86d:", error);
                                                toast.error("Failed to update item status");
                                            }
                                        }}
                                        isEditing={isEditingMenu}
                                        isSelected={selectedItems.has(item.id)}
                                        onSelect={(id) => {
                                            const newSelected = new Set(selectedItems);
                                            if (newSelected.has(id)) {
                                                newSelected.delete(id);
                                            } else {
                                                newSelected.add(id);
                                            }
                                            setSelectedItems(newSelected);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card py-12 text-center">
                    <p className="text-slate-400">No menu items found. Add one or scan a menu to get started!</p>
                </div>
            )}

            {/* Add Item Modal */}
            {showAddModal && (
                <AddMenuItemModal
                    categories={categories}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchMenuData}
                />
            )}

            {/* Scan Menu Modal */}
            {showScanModal && (
                <ScanMenuModal
                    onClose={() => setShowScanModal(false)}
                    onSuccess={fetchMenuData}
                />
            )}

            {/* Edit Item Modal */}
            {editingItem && (
                <EditMenuItemModal
                    item={editingItem}
                    categories={categories}
                    onClose={() => setEditingItem(null)}
                    onSuccess={fetchMenuData}
                />
            )}

            {/* Add Category Modal */}
            {showAddCategoryModal && (
                <AddCategoryModal
                    onClose={() => setShowAddCategoryModal(false)}
                    onSuccess={fetchMenuData}
                />
            )}

            {/* Manage Category Modal */}
            {editingCategory && (
                <ManageCategoryModal
                    category={editingCategory}
                    onClose={() => setEditingCategory(null)}
                    onSuccess={fetchMenuData}
                />
            )}

            {/* Bulk Action Bar */}
            {isEditingMenu && selectedItems.size > 0 && (
                <BulkActionBar
                    selectedCount={selectedItems.size}
                    categories={categories}
                    onClear={() => setSelectedItems(new Set())}
                    onAssignKds={() => setShowKdsAssignModal(true)}
                    onMove={async (categoryId) => {
                        try {
                            const { error } = await (supabase
                                .from("menu_items") as any)
                                .update({ category_id: categoryId })
                                .in("id", Array.from(selectedItems));

                            if (error) throw error;
                            toast.success(`Moved ${selectedItems.size} items`);
                            setSelectedItems(new Set());
                            fetchMenuData();
                        } catch (error) {
                            console.error("Error moving items:", error);
                            toast.error("Failed to move items");
                        }
                    }}
                />
            )}

            {/* KDS Assign Modal */}
            {showKdsAssignModal && (
                <AssignToKdsModal
                    itemIds={Array.from(selectedItems)}
                    onClose={() => setShowKdsAssignModal(false)}
                    onSuccess={() => {
                        fetchMenuData();
                        setSelectedItems(new Set());
                    }}
                />
            )}
        </div>
    );
}

function MenuItemCard({
    item,
    onEdit,
    onToggle86d,
    isEditing,
    isSelected,
    onSelect
}: {
    item: MenuItemType;
    onEdit?: () => void;
    onToggle86d?: () => void;
    isEditing?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const supabase = createClient();

    return (
        <div
            onClick={() => isEditing && onSelect?.(item.id)}
            className={cn(
                "card relative group transition-all cursor-default",
                item.is_86d && "opacity-60 border-amber-500/50",
                isEditing && isSelected && "ring-2 ring-orange-500 bg-orange-500/5 border-orange-500/50",
                isEditing && !isSelected && "hover:border-slate-600",
                menuOpen && "z-30" // Prevent clipping
            )}
        >
            {/* Selection Checkbox */}
            {isEditing && (
                <div className="absolute top-2 right-2 z-10">
                    <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                        isSelected ? "bg-orange-500 border-orange-500" : "bg-slate-800 border-slate-600"
                    )}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-slate-400">{item.category?.name || "Uncategorized"}</p>
                </div>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-1 text-slate-400 hover:text-slate-100"
                >
                    <MoreVertical className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <span className="text-xl font-bold text-orange-400">
                    {formatCurrency(item.price)}
                </span>
                <div className="flex gap-1">
                    <button
                        onClick={() => onEdit?.()}
                        className="btn btn-ghost p-2"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="btn btn-ghost p-2 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Dropdown Menu */}
            {menuOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-10 z-20 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1">
                        <button
                            onClick={() => {
                                onEdit?.();
                                setMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-800"
                        >
                            Edit Item
                        </button>
                        <button
                            onClick={() => {
                                onToggle86d?.();
                                setMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-800"
                        >
                            {item.is_86d ? "Mark Available" : "Mark 86'd"}
                        </button>
                        <Link
                            href={`/dashboard/menu/add-ons?itemId=${item.id}`}
                            className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-800"
                        >
                            Manage Add Ons
                        </Link>
                        <button
                            onClick={async () => {
                                if (!confirm("Are you sure you want to delete this item?")) return;
                                try {
                                    const { error } = await (supabase
                                        .from("menu_items") as any)
                                        .delete()
                                        .eq("id", item.id);
                                    if (error) throw error;
                                    toast.success("Item deleted");
                                    // We need a way to refresh the parent. Since we don't have it here directly, 
                                    // we should probably pass a onDelete prop or just use window.location.reload()
                                    // but handleToggle86d is already using fetchMenuData in the parent.
                                    // Actually, I should probably pass onDelete too.
                                    window.location.reload();
                                } catch (error) {
                                    console.error("Error deleting item:", error);
                                    toast.error("Failed to delete item");
                                }
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-800 text-red-400"
                        >
                            Delete Item
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function AddMenuItemModal({
    categories,
    onClose,
    onSuccess
}: {
    categories: Category[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [kdsScreens, setKdsScreens] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
    const [selectedKdsScreens, setSelectedKdsScreens] = useState<string[]>([]);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    // Fetch KDS screens on mount
    useEffect(() => {
        const fetchKdsScreens = async () => {
            if (!currentLocation?.id) return;
            const { data } = await supabase
                .from("kds_screens")
                .select("id, name, is_default")
                .eq("location_id", currentLocation.id)
                .eq("is_active", true)
                .order("display_order");
            setKdsScreens(data || []);
        };
        fetchKdsScreens();
    }, [currentLocation?.id]);

    const handleKdsToggle = (screenId: string) => {
        setSelectedKdsScreens(prev =>
            prev.includes(screenId)
                ? prev.filter(id => id !== screenId)
                : [...prev, screenId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation?.id) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        setLoading(true);
        try {
            // Insert menu item
            const { data: newItem, error } = await (supabase
                .from("menu_items") as any)
                .insert({
                    location_id: currentLocation.id,
                    name: formData.get("name") as string,
                    description: formData.get("description") as string,
                    price: parseFloat(formData.get("price") as string),
                    cost: formData.get("cost") ? parseFloat(formData.get("cost") as string) : null,
                    category_id: formData.get("category_id") as string,
                })
                .select("id")
                .single();

            if (error) throw error;

            // Insert KDS assignments if any selected
            if (selectedKdsScreens.length > 0 && newItem?.id) {
                const assignments = selectedKdsScreens.map(kdsScreenId => ({
                    menu_item_id: newItem.id,
                    kds_screen_id: kdsScreenId
                }));

                const { error: assignError } = await (supabase
                    .from("menu_item_kds_assignments") as any)
                    .insert(assignments);

                if (assignError) {
                    console.error("Error saving KDS assignments:", assignError);
                    // Don't fail the whole operation for assignment errors
                }
            }

            toast.success("Item added successfully");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error adding item:", error);
            toast.error("Failed to add item");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative card w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">{t("menu.addItem")}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">{t("menu.itemName")}</label>
                        <input name="name" type="text" className="input" required />
                    </div>
                    <div>
                        <label className="label">{t("menu.description")}</label>
                        <textarea name="description" className="input" rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">{t("menu.price")}</label>
                            <input name="price" type="number" step="0.01" className="input" required />
                        </div>
                        <div>
                            <label className="label">{t("menu.cost")}</label>
                            <input name="cost" type="number" step="0.01" className="input" />
                        </div>
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
                    {/* KDS Screen Selection */}
                    {kdsScreens.length > 0 && (
                        <div>
                            <label className="label flex items-center gap-2">
                                <Layers className="h-4 w-4 text-orange-400" />
                                KDS Screens
                            </label>
                            <p className="text-xs text-slate-400 mb-2">
                                Select which kitchen screens should display this item. Unassigned items go to Main Kitchen.
                            </p>
                            <div className="space-y-2">
                                {kdsScreens.map((screen) => (
                                    <label
                                        key={screen.id}
                                        className={cn(
                                            "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors",
                                            selectedKdsScreens.includes(screen.id)
                                                ? "border-orange-500 bg-orange-500/10"
                                                : "border-slate-700 hover:border-slate-600"
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedKdsScreens.includes(screen.id)}
                                            onChange={() => handleKdsToggle(screen.id)}
                                            className="w-4 h-4 accent-orange-500"
                                        />
                                        <span className="flex-1">{screen.name}</span>
                                        {screen.is_default && (
                                            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">Main</span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                            {t("common.cancel")}
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ScanMenuModal({
    onClose,
    onSuccess
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const currentLocation = useAppStore((state) => state.currentLocation);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            processImage(file);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processImage(file);
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = (reader.result as string).split(",")[1];
                resolve(base64String);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const processImage = async (file: File) => {
        if (!currentLocation?.id) {
            toast.error("Please select a location first");
            return;
        }

        setLoading(true);
        try {
            const base64 = await fileToBase64(file);

            const response = await fetch("/api/ai/parse-menu", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    imageBase64: base64,
                    locationId: currentLocation.id,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to parse menu");
            }

            const result = await response.json();
            toast.success(`Successfully parsed ${result.count} items!`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Menu parsing error:", error);
            toast.error(error.message || "Failed to parse menu. Please try a clearer photo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative card w-full max-w-md">
                <h2 className="text-xl font-bold mb-2">{t("menu.scanMenu")}</h2>
                <p className="text-slate-400 text-sm mb-4">
                    Upload a photo of your menu and AI will extract all items automatically.
                </p>

                {loading ? (
                    <div className="py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
                        <p className="mt-4 text-slate-400">{t("menu.processingMenu")}</p>
                    </div>
                ) : (
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                            dragActive
                                ? "border-orange-500 bg-orange-500/10"
                                : "border-slate-700 hover:border-slate-600"
                        )}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragActive(true);
                        }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                    >
                        <Camera className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                        <p className="text-slate-300 mb-2">
                            Drag & drop a menu photo here
                        </p>
                        <p className="text-sm text-slate-500 mb-4">or</p>
                        <label className="btn btn-primary cursor-pointer">
                            Choose File
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </label>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="btn btn-ghost w-full mt-4"
                >
                    {t("common.cancel")}
                </button>
            </div>
        </div>
    );
}

function EditMenuItemModal({
    item,
    categories,
    onClose,
    onSuccess
}: {
    item: MenuItemType;
    categories: Category[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [kdsScreens, setKdsScreens] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
    const [selectedKdsScreens, setSelectedKdsScreens] = useState<string[]>([]);
    const [loadingKds, setLoadingKds] = useState(true);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    // Fetch KDS screens and current assignments on mount
    useEffect(() => {
        const fetchKdsData = async () => {
            if (!currentLocation?.id) return;

            setLoadingKds(true);
            try {
                // Fetch all KDS screens
                const { data: screens } = await supabase
                    .from("kds_screens")
                    .select("id, name, is_default")
                    .eq("location_id", currentLocation.id)
                    .eq("is_active", true)
                    .order("display_order");

                setKdsScreens(screens || []);

                // Fetch current assignments for this item
                const { data: assignments } = await supabase
                    .from("menu_item_kds_assignments")
                    .select("kds_screen_id")
                    .eq("menu_item_id", item.id);

                const currentScreenIds = (assignments || []).map((a: any) => a.kds_screen_id);
                setSelectedKdsScreens(currentScreenIds);
            } catch (error) {
                console.error("Error fetching KDS data:", error);
            } finally {
                setLoadingKds(false);
            }
        };
        fetchKdsData();
    }, [currentLocation?.id, item.id]);

    const handleKdsToggle = (screenId: string) => {
        setSelectedKdsScreens(prev =>
            prev.includes(screenId)
                ? prev.filter(id => id !== screenId)
                : [...prev, screenId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        setLoading(true);
        try {
            // Update menu item
            const { error } = await (supabase
                .from("menu_items") as any)
                .update({
                    name: formData.get("name") as string,
                    description: formData.get("description") as string,
                    price: parseFloat(formData.get("price") as string),
                    category_id: formData.get("category_id") || null,
                })
                .eq("id", item.id);

            if (error) throw error;

            // Update KDS assignments - delete existing and insert new
            await (supabase
                .from("menu_item_kds_assignments") as any)
                .delete()
                .eq("menu_item_id", item.id);

            if (selectedKdsScreens.length > 0) {
                const assignments = selectedKdsScreens.map(kdsScreenId => ({
                    menu_item_id: item.id,
                    kds_screen_id: kdsScreenId
                }));

                const { error: assignError } = await (supabase
                    .from("menu_item_kds_assignments") as any)
                    .insert(assignments);

                if (assignError) {
                    console.error("Error saving KDS assignments:", assignError);
                }
            }

            toast.success("Item updated successfully");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error updating item:", error);
            toast.error("Failed to update item");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative card w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Edit Item</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">{t("menu.itemName")}</label>
                        <input name="name" type="text" className="input" defaultValue={item.name} required />
                    </div>
                    <div>
                        <label className="label">{t("menu.description")}</label>
                        <textarea name="description" className="input" rows={2} defaultValue={item.description || ""} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">{t("menu.price")}</label>
                            <input name="price" type="number" step="0.01" className="input" defaultValue={item.price} required />
                        </div>
                    </div>
                    <div>
                        <label className="label">Category</label>
                        <select name="category_id" className="input" defaultValue={item.category_id || ""}>
                            <option value="">Uncategorized</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* KDS Screen Selection */}
                    {kdsScreens.length > 0 && (
                        <div>
                            <label className="label flex items-center gap-2">
                                <Layers className="h-4 w-4 text-orange-400" />
                                KDS Screens
                            </label>
                            <p className="text-xs text-slate-400 mb-2">
                                Select which kitchen screens should display this item. Unassigned items go to Main Kitchen.
                            </p>
                            {loadingKds ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {kdsScreens.map((screen) => (
                                        <label
                                            key={screen.id}
                                            className={cn(
                                                "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors",
                                                selectedKdsScreens.includes(screen.id)
                                                    ? "border-orange-500 bg-orange-500/10"
                                                    : "border-slate-700 hover:border-slate-600"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedKdsScreens.includes(screen.id)}
                                                onChange={() => handleKdsToggle(screen.id)}
                                                className="w-4 h-4 accent-orange-500"
                                            />
                                            <span className="flex-1">{screen.name}</span>
                                            {screen.is_default && (
                                                <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">Main</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                            {t("common.cancel")}
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AddCategoryModal({
    onClose,
    onSuccess
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation?.id) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const name = formData.get("name") as string;

        setLoading(true);
        try {
            const { error } = await (supabase
                .from("menu_categories") as any)
                .insert({
                    location_id: currentLocation.id,
                    name,
                    is_active: true
                });

            if (error) throw error;

            toast.success("Category added successfully");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error adding category:", error);
            toast.error("Failed to add category");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative card w-full max-w-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-100 font-display">Add Category</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Category Name</label>
                        <input
                            name="name"
                            type="text"
                            placeholder="e.g. Appetizers, Desserts"
                            className="input"
                            required
                            autoFocus
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            This will appear as a heading in your menu.
                        </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function BulkActionBar({
    selectedCount,
    categories,
    onClear,
    onMove,
    onAssignKds
}: {
    selectedCount: number;
    categories: Category[];
    onClear: () => void;
    onMove: (categoryId: string) => Promise<void>;
    onAssignKds: () => void;
}) {
    const [isMoving, setIsMoving] = useState(false);
    const [showCategoryList, setShowCategoryList] = useState(false);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-slate-900 border border-slate-700 rounded-full py-2 px-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 pr-4 border-r border-slate-700">
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {selectedCount}
                    </span>
                    <span className="text-sm font-medium text-slate-300">Items Selected</span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button
                            onClick={() => setShowCategoryList(!showCategoryList)}
                            className="btn btn-primary btn-sm rounded-full"
                        >
                            <Layers className="h-4 w-4" />
                            Move to Category
                        </button>

                        {showCategoryList && (
                            <div className="absolute bottom-full mb-2 left-0 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1">
                                <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-800">
                                    SELECT CATEGORY
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={async () => {
                                                setIsMoving(true);
                                                await onMove(cat.id);
                                                setIsMoving(false);
                                                setShowCategoryList(false);
                                            }}
                                            disabled={isMoving}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-800 transition-colors flex items-center justify-between"
                                        >
                                            {cat.name}
                                            {isMoving && <Loader2 className="h-3 w-3 animate-spin" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onAssignKds}
                        className="btn btn-secondary btn-sm rounded-full"
                    >
                        <Monitor className="h-4 w-4" />
                        Map to KDS
                    </button>

                    <button
                        onClick={onClear}
                        className="p-2 text-slate-400 hover:text-slate-100 transition-colors"
                        title="Clear selection"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div >
        </div >
    );
}

function ManageCategoryModal({
    category,
    onClose,
    onSuccess
}: {
    category: Category;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const supabase = createClient();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const name = formData.get("name") as string;

        setLoading(true);
        try {
            const { error } = await (supabase
                .from("menu_categories") as any)
                .update({ name })
                .eq("id", category.id);

            if (error) throw error;

            toast.success("Category updated successfully");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error updating category:", error);
            toast.error("Failed to update category");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            // First, set all items in this category to uncategorized
            const { error: updateError } = await (supabase
                .from("menu_items") as any)
                .update({ category_id: null })
                .eq("category_id", category.id);

            if (updateError) throw updateError;

            // Then delete the category
            const { error: deleteError } = await (supabase
                .from("menu_categories") as any)
                .delete()
                .eq("id", category.id);

            if (deleteError) throw deleteError;

            toast.success("Category deleted");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error deleting category:", error);
            toast.error("Failed to delete category");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative card w-full max-w-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Manage Category</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {!showDeleteConfirm ? (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                            <label className="label">Category Name</label>
                            <input
                                name="name"
                                type="text"
                                defaultValue={category.name}
                                className="input"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            <button type="submit" disabled={loading} className="btn btn-primary w-full">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Name"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="btn btn-ghost text-red-400 hover:text-red-300 w-full"
                            >
                                <Trash2 className="h-4 w-4 mr-2 inline" />
                                Delete Category
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-200">
                            <AlertCircle className="h-4 w-4 inline mr-2 mb-1" />
                            Are you sure? Items in this category will become <strong>Uncategorized</strong>. This action cannot be undone.
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="btn btn-secondary flex-1"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="btn btn-primary bg-red-600 hover:bg-red-500 border-red-600 flex-1"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
