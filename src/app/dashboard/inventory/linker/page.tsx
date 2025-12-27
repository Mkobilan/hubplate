"use client";

import { useEffect, useState } from "react";
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
    AlertCircle,
    RefreshCw,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";

export default function IngredientLinkerPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [links, setLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [linking, setLinking] = useState<string | null>(null);

    const fetchData = async () => {
        if (!currentLocation) return;
        setLoading(true);
        const supabase = createClient();

        try {
            // Fetch inventory items
            const { data: invData } = await supabase
                .from("inventory_items")
                .select("*")
                .eq("location_id", currentLocation.id)
                .order("name");

            // Fetch menu items
            const { data: menuData } = await supabase
                .from("menu_items")
                .select("*")
                .eq("location_id", currentLocation.id)
                .order("name");

            // Fetch existing links
            const { data: linkData } = await supabase
                .from("ingredient_links")
                .select("*");

            setInventory(invData || []);
            setMenuItems(menuData || []);
            setLinks(linkData || []);
        } catch (err) {
            console.error("Error fetching linker data:", err);
            toast.error("Failed to load linker data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentLocation?.id]);

    const handleLink = async (menuItemId: string) => {
        if (!selectedItemId || !currentLocation) return;

        const isLinked = links.some(l => l.menu_item_id === menuItemId && l.inventory_item_id === selectedItemId);
        setLinking(menuItemId);
        const supabase = createClient();

        try {
            if (isLinked) {
                // Unlink
                const { error } = await (supabase
                    .from("ingredient_links" as any) as any)
                    .delete()

                    .eq("menu_item_id", menuItemId)
                    .eq("inventory_item_id", selectedItemId);
                if (error) throw error;
                setLinks(prev => prev.filter(l => !(l.menu_item_id === menuItemId && l.inventory_item_id === selectedItemId)));
                toast.success("Unlinked successfully");
            } else {
                // Link (default quantity 1)
                const { data, error } = await (supabase
                    .from("ingredient_links" as any) as any)
                    .insert({

                        menu_item_id: menuItemId,
                        inventory_item_id: selectedItemId,
                        quantity_used: 1,
                        unit: inventory.find(i => i.id === selectedItemId)?.unit || "unit"
                    })
                    .select()
                    .single();
                if (error) throw error;
                setLinks(prev => [...prev, data]);
                toast.success("Linked successfully");
            }
        } catch (err: any) {
            console.error("Linking error:", err);
            toast.error("Action failed: " + err.message);
        } finally {
            setLinking(null);
        }
    };

    const getLinkedNames = (inventoryItemId: string) => {
        const itemLinks = links.filter(l => l.inventory_item_id === inventoryItemId);
        return itemLinks.map(l => menuItems.find(m => m.id === l.menu_item_id)?.name).filter(Boolean);
    };

    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <Link href="/dashboard/locations" className="btn btn-primary">Go to Locations</Link>
            </div>
        );
    }

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
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={fetchData}>
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Refresh
                    </button>
                    <Link href="/dashboard/inventory" className="btn btn-secondary">
                        ← Back to Inventory
                    </Link>
                </div>
            </div>

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
                            className="input !pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                            </div>
                        ) : filteredInventory.map((item) => {
                            const linkedNames = getLinkedNames(item.id);
                            const isSelected = selectedItemId === item.id;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItemId(isSelected ? null : item.id)}
                                    className={cn(
                                        "card cursor-pointer transition-all",
                                        isSelected
                                            ? "border-orange-500 bg-orange-500/5 ring-1 ring-orange-500/50"
                                            : "hover:border-slate-700"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-xl transition-colors",
                                                isSelected ? "bg-orange-500/20 text-orange-400" : "bg-slate-800 text-slate-500"
                                            )}>
                                                <Package className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {linkedNames.length > 0
                                                        ? `Linked to ${linkedNames.length} dish${linkedNames.length > 1 ? "es" : ""}`
                                                        : "Not linked"}
                                                </p>
                                            </div>
                                        </div>
                                        {linkedNames.length > 0 && (
                                            <Check className="h-5 w-5 text-green-400" />
                                        )}
                                    </div>

                                    {isSelected && linkedNames.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-800">
                                            <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Linked Menu Items:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {linkedNames.map((name) => (
                                                    <span key={name} className="badge badge-success text-[10px] py-1 px-2">
                                                        {name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <ChefHat className="h-5 w-5 text-orange-400" />
                        Menu Items
                    </h3>
                    <p className="text-sm text-slate-500 -mt-2">
                        {selectedItemId
                            ? "Click 'Link' to connect the selected ingredient to a dish"
                            : "Select an inventory item on the left to manage links"}
                    </p>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {menuItems.map((item) => {
                            const isLinked = links.some(l => l.menu_item_id === item.id && l.inventory_item_id === selectedItemId);
                            const isProcessing = linking === item.id;

                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "card transition-all",
                                        selectedItemId ? "hover:border-slate-600" : "opacity-60 cursor-not-allowed"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <p className="font-medium truncate">{item.name}</p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {item.category || "Uncategorized"}
                                            </p>
                                        </div>
                                        {selectedItemId && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleLink(item.id);
                                                }}
                                                disabled={isProcessing}
                                                className={cn(
                                                    "btn min-w-[80px] text-xs py-1 px-3 flex items-center justify-center gap-2",
                                                    isLinked
                                                        ? "btn-secondary text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                                                        : "btn-primary bg-orange-500 hover:bg-orange-600 border-none"
                                                )}
                                            >
                                                {isProcessing ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : isLinked ? (
                                                    <>
                                                        <X className="h-3 w-3" />
                                                        Unlink
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="h-3 w-3" />
                                                        Link
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

