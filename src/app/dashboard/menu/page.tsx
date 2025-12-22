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
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Type definitions for Supabase integration
type Category = { id: string; name: string };
type MenuItemType = { id: string; name: string; category: string; price: number; is_86d: boolean };

// TODO: Replace with Supabase queries
const categories: Category[] = [];
const menuItems: MenuItemType[] = [];

export default function MenuPage() {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);

    const filteredItems = menuItems.filter((item) => {
        const matchesCategory = !selectedCategory || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const itemsByCategory = filteredItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
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
                    <Link
                        href="/dashboard/menu/happy-hour"
                        className="btn-secondary"
                    >
                        <Clock className="h-4 w-4" />
                        {t("menu.happyHour")}
                    </Link>
                    <button
                        onClick={() => setShowScanModal(true)}
                        className="btn-secondary"
                    >
                        <Camera className="h-4 w-4" />
                        {t("menu.scanMenu")}
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary"
                    >
                        <Plus className="h-4 w-4" />
                        {t("menu.addItem")}
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={`${t("common.search")} menu items...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10"
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
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.name)}
                            className={cn(
                                "btn whitespace-nowrap",
                                selectedCategory === cat.name ? "btn-primary" : "btn-secondary"
                            )}
                        >
                            {cat.name}
                        </button>
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
                                <MenuItemCard key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Item Modal */}
            {showAddModal && (
                <AddMenuItemModal onClose={() => setShowAddModal(false)} />
            )}

            {/* Scan Menu Modal */}
            {showScanModal && (
                <ScanMenuModal onClose={() => setShowScanModal(false)} />
            )}
        </div>
    );
}

function MenuItemCard({ item }: { item: typeof menuItems[0] }) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div
            className={cn(
                "card relative group",
                item.is_86d && "opacity-60 border-amber-500/50"
            )}
        >
            {/* 86'd Badge */}
            {item.is_86d && (
                <div className="absolute top-2 right-2 badge badge-warning">
                    86&apos;d
                </div>
            )}

            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-slate-400">{item.category}</p>
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
                    <button className="btn-ghost p-2">
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="btn-ghost p-2 hover:text-red-400">
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
                        <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-800">
                            Edit Item
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-800">
                            {item.is_86d ? "Mark Available" : "Mark 86'd"}
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-800">
                            Manage Upsells
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-800 text-red-400">
                            Delete Item
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function AddMenuItemModal({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // TODO: Submit to Supabase
        setTimeout(() => {
            setLoading(false);
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative card w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{t("menu.addItem")}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">{t("menu.itemName")}</label>
                        <input type="text" className="input" required />
                    </div>
                    <div>
                        <label className="label">{t("menu.description")}</label>
                        <textarea className="input" rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">{t("menu.price")}</label>
                            <input type="number" step="0.01" className="input" required />
                        </div>
                        <div>
                            <label className="label">{t("menu.cost")}</label>
                            <input type="number" step="0.01" className="input" />
                        </div>
                    </div>
                    <div>
                        <label className="label">Category</label>
                        <select className="input">
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            {t("common.cancel")}
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ScanMenuModal({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

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

    const processImage = async (file: File) => {
        setLoading(true);
        // TODO: Convert to base64 and call Gemini API
        // const base64 = await fileToBase64(file);
        // const items = await parseMenuPhoto(base64);
        setTimeout(() => {
            setLoading(false);
            alert("Menu parsed! (Demo - will integrate with Gemini)");
            onClose();
        }, 2000);
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
                        <label className="btn-primary cursor-pointer">
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
                    className="btn-ghost w-full mt-4"
                >
                    {t("common.cancel")}
                </button>
            </div>
        </div>
    );
}
