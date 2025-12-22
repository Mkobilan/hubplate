"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Link2,
    Search,
    Plus,
    X,
    ChefHat,
    Package,
    ArrowRight,
    Check,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Mock data
// Types for Supabase integration
interface MenuItemType {
    id: string;
    name: string;
    ingredients: string[];
}

interface InventoryItemType {
    id: string;
    name: string;
    linkedTo: string[];
}

// TODO: Replace with Supabase queries
const menuItems: MenuItemType[] = [];
const inventoryItems: InventoryItemType[] = [];

export default function IngredientLinkerPage() {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    const filteredInventory = inventoryItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Link2 className="h-8 w-8 text-orange-500" />
                        Ingredient Linker
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Connect inventory items to menu dishes for automatic stock tracking
                    </p>
                </div>
                <Link href="/dashboard/inventory" className="btn-secondary">
                    ← Back to Inventory
                </Link>
            </div>

            {/* Info Banner */}
            <div className="card border-blue-500/30 bg-blue-500/5 p-4">
                <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-400 shrink-0" />
                    <p className="text-sm text-blue-200/80">
                        Linking ingredients to menu items enables **automatic stock deduction** when orders are placed,
                        and powers **AI reorder predictions** based on actual sales velocity.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inventory Items */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search inventory items..."
                            className="input pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        {filteredInventory.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item.id === selectedItem ? null : item.id)}
                                className={cn(
                                    "card cursor-pointer transition-all",
                                    selectedItem === item.id
                                        ? "border-orange-500 bg-orange-500/5"
                                        : "hover:border-slate-700"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Package className="h-5 w-5 text-slate-500" />
                                        <div>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {item.linkedTo.length > 0
                                                    ? `Linked to ${item.linkedTo.length} dish${item.linkedTo.length > 1 ? "es" : ""}`
                                                    : "Not linked"}
                                            </p>
                                        </div>
                                    </div>
                                    {item.linkedTo.length > 0 && (
                                        <Check className="h-5 w-5 text-green-400" />
                                    )}
                                </div>

                                {selectedItem === item.id && item.linkedTo.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-800">
                                        <p className="text-xs text-slate-500 mb-2">Linked Menu Items:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {item.linkedTo.map((dish) => (
                                                <span key={dish} className="badge badge-success text-xs">
                                                    {dish}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <ChefHat className="h-5 w-5 text-orange-400" />
                        Menu Items
                    </h3>
                    <p className="text-sm text-slate-500 -mt-2">
                        {selectedItem
                            ? "Click a menu item to link/unlink the selected inventory item"
                            : "Select an inventory item to manage links"}
                    </p>

                    <div className="space-y-2">
                        {menuItems.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    "card transition-all",
                                    selectedItem ? "cursor-pointer hover:border-orange-500/50" : "opacity-60"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {item.ingredients.join(", ")}
                                        </p>
                                    </div>
                                    {selectedItem && (
                                        <button className="btn-secondary text-xs py-1 px-3">
                                            <Plus className="h-3 w-3" />
                                            Link
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
