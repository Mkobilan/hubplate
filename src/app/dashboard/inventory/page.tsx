"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    Package,
    Activity,
    AlertCircle,
    Plus,
    Search,
    ArrowRight,
    RefreshCw,
    TrendingDown,
    Trash2,
    ArrowUpDown,
    ChevronDown,
    ChevronRight,
    MoreVertical,
    Edit,
    Download,
    Upload,
    Filter,
    Check,
    X,
    CheckSquare,
    Square,
    Loader2,
    Info,
    Settings2,
    Truck,
    ShoppingCart,
    Sparkles,
    FileText
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { toast } from "react-hot-toast";
import CSVUploadModal from "@/components/dashboard/inventory/CSVUploadModal";
import { VendorImportModal } from "@/components/dashboard/inventory/VendorImportModal";
import CreatePOModal from "@/components/dashboard/inventory/CreatePOModal";
import TakeInventoryModal from "@/components/dashboard/inventory/TakeInventoryModal";
import InventoryHistoryModal from "@/components/dashboard/inventory/InventoryHistoryModal";
import ExportInventoryModal from "@/components/dashboard/inventory/ExportInventoryModal";



export default function InventoryPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showPOModal, setShowPOModal] = useState(false);
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [isSyncingRunningStock, setIsSyncingRunningStock] = useState(false);
    const [showRunningStockDropdown, setShowRunningStockDropdown] = useState(false);
    const [storageAreas, setStorageAreas] = useState<any[]>([]);
    const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
    const [isAddingArea, setIsAddingArea] = useState(false);
    const [newAreaName, setNewAreaName] = useState("");
    const [isCreatingArea, setIsCreatingArea] = useState(false);

    const [showTakeInventoryModal, setShowTakeInventoryModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);




    // Default visible columns: Simplified set as requested
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['category', 'storage_area', 'stock', 'stock_unit', 'recipe_unit', 'total_usage', 'running_stock', 'par', 'cost']);


    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('inventory_column_prefs');
        if (saved) {
            try {
                setVisibleColumns(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse column prefs", e);
            }
        }
    }, []);

    const toggleColumn = (col: string) => {
        const next = visibleColumns.includes(col)
            ? visibleColumns.filter(c => c !== col)
            : [...visibleColumns, col];
        setVisibleColumns(next);
        localStorage.setItem('inventory_column_prefs', JSON.stringify(next));
    };

    const fetchInventory = useCallback(async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error } = await (supabase.from("inventory_items") as any)
                .select("*")
                .eq("location_id", currentLocation.id)
                .order("name");

            if (error) throw error;
            setInventory(data || []);
        } catch (err) {
            console.error("Error fetching inventory:", err);
        } finally {
            setLoading(false);
        }
    }, [currentLocation?.id]);

    const fetchStorageAreas = useCallback(async () => {
        if (!currentLocation) return;
        try {
            const supabase = createClient();
            const { data, error } = await (supabase.from("inventory_storage_areas") as any)
                .select("*")
                .eq("location_id", currentLocation.id)
                .order("name");

            if (error) throw error;
            setStorageAreas(data || []);
        } catch (err) {
            console.error("Error fetching storage areas:", err);
        }
    }, [currentLocation?.id]);

    useEffect(() => {
        fetchInventory();
        fetchStorageAreas();
    }, [fetchInventory, fetchStorageAreas]);

    const handleCreateArea = async () => {
        if (!newAreaName.trim() || !currentLocation) return;
        setIsCreatingArea(true);
        try {
            const supabase = createClient();
            const { data, error } = await (supabase.from("inventory_storage_areas") as any)
                .insert({
                    location_id: currentLocation.id,
                    name: newAreaName.trim()
                })
                .select()
                .single();

            if (error) throw error;
            setStorageAreas([...storageAreas, data]);
            setNewAreaName("");
            setIsAddingArea(false);
            toast.success("Storage area created");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsCreatingArea(false);
        }
    };

    const handleDeleteArea = async (areaId: string, areaName: string) => {
        if (!confirm(`Are you sure you want to delete "${areaName}"? Items in this area will be unassigned.`)) return;

        try {
            const supabase = createClient();

            // 1. Unassign items
            await (supabase.from("inventory_items") as any)
                .update({ storage_area_id: null, storage_area_name: null })
                .eq("storage_area_id", areaId);

            // 2. Delete area
            const { error } = await (supabase.from("inventory_storage_areas") as any)
                .delete()
                .eq("id", areaId);

            if (error) throw error;

            setStorageAreas(storageAreas.filter(a => a.id !== areaId));
            if (selectedAreaId === areaId) setSelectedAreaId("all");
            toast.success("Storage area deleted");
            fetchInventory();
        } catch (err: any) {
            toast.error("Failed to delete area: " + err.message);
        }
    };

    const handleBulkUpdateArea = async (areaId: string) => {
        if (selectedItems.size === 0) return;
        const area = storageAreas.find(a => a.id === areaId);

        const loadingToast = toast.loading(`Moving ${selectedItems.size} items to ${area?.name || 'No Area'}...`);
        try {
            const supabase = createClient();
            const { error } = await (supabase.from("inventory_items") as any)
                .update({
                    storage_area_id: areaId || null,
                    storage_area_name: area ? area.name : null
                })
                .in("id", Array.from(selectedItems));

            if (error) throw error;

            toast.success(`Moved ${selectedItems.size} items to ${area?.name || 'No Area'}`, { id: loadingToast });
            setSelectedItems(new Set());
            setIsSelectMode(false);
            fetchInventory();
        } catch (err: any) {
            toast.error("Failed to move items: " + err.message, { id: loadingToast });
        }
    };

    const toggleSelectItem = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
            setIsSelectMode(true);
        }
        setSelectedItems(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === filtered.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filtered.map(i => i.id)));
            setIsSelectMode(true);
        }
    };

    const handleDeleteItem = (item: any) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    const handleBulkDelete = () => {
        if (selectedItems.size === 0) return;
        setItemToDelete(null); // null means bulk
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        const supabase = createClient();
        try {
            const idsToDelete = itemToDelete ? [itemToDelete.id] : Array.from(selectedItems);

            // Delete associated records if any (e.g. waste logs, reorder history)
            // But usually the DB has cascade delete. 
            // We'll just delete from inventory_items
            const { error } = await (supabase.from("inventory_items") as any)
                .delete()
                .in("id", idsToDelete);

            if (error) throw error;

            toast.success(itemToDelete ? `Deleted ${itemToDelete.name}` : `Deleted ${idsToDelete.length} items`);
            setSelectedItems(new Set());
            setIsSelectMode(false);
            fetchInventory();
            setShowDeleteModal(false);
        } catch (err: any) {
            console.error("Delete error:", err);
            toast.error("Failed to delete: " + err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatus = (item: any) => {
        const running = Number(item.running_stock || 0);

        // Calculate par in atomic units
        let multiplier = Number(item.units_per_stock || 1);
        let conversion = 1;
        const combinedUnit = (item.unit || '').toLowerCase();
        const recipeUnit = (item.recipe_unit || '').toLowerCase();

        if (combinedUnit.includes('lb') && recipeUnit.includes('oz')) conversion = 16;
        else if (combinedUnit.includes('gal') && recipeUnit.includes('oz')) conversion = 128;

        const parAtomic = Number(item.par_level || 0) * multiplier * conversion;

        if (running <= parAtomic * 0.2) return "critical";
        if (running <= parAtomic) return "low";
        return "good";
    };

    const handleUpdateItem = async (id: string, updates: any) => {
        try {
            const supabase = createClient();
            // Remove synthetic fields and fields that should ONLY be updated by triggers or specific manual stock resets
            const { status, running_stock, ...cleanUpdates } = updates;

            // IF running_stock is explicitly provided in a direct update call (like our new sync button), we allow it.
            // Otherwise, we strip it to protect the bucket.
            const finalUpdates = updates.hasOwnProperty('running_stock') ? { ...cleanUpdates, running_stock: updates.running_stock } : cleanUpdates;

            const { error } = await (supabase as any)
                .from("inventory_items")
                .update(finalUpdates)
                .eq("id", id);

            if (error) throw error;
            fetchInventory();
            setEditingId(null);
            setEditData(null);
            toast.success("Item updated");
        } catch (err: any) {
            console.error("Update error:", err);
            toast.error("Failed to update item: " + err.message);
        }
    };

    const handleSyncAllRunningStock = async () => {
        if (!confirm("Are you sure you want to update all Running Stock values based on your Stock Unit and Stock Meas.? This will overwrite any live deductions.")) return;

        setIsSyncingRunningStock(true);
        try {
            const supabase = createClient();

            // Process each item to calculate its theoretical stock
            const updates = inventory.map(item => {
                const stock = Number(item.stock_quantity || 0);
                let multiplier = Number(item.units_per_stock || 1);
                let unitLabel = item.unit || '';

                let conversion = 1;
                const combinedUnit = unitLabel.toLowerCase();
                const recipeUnit = (item.recipe_unit || '').toLowerCase();

                if (combinedUnit.includes('lb') && recipeUnit.includes('oz')) {
                    conversion = 16;
                } else if (combinedUnit.includes('gal') && recipeUnit.includes('oz')) {
                    conversion = 128;
                }

                return {
                    id: item.id,
                    running_stock: stock * multiplier * conversion
                };
            });

            // Update them one by one (Supabase doesn't support bulk update with different values easily in a single call without RPC)
            for (const update of updates) {
                await (supabase as any)
                    .from("inventory_items")
                    .update({ running_stock: update.running_stock })
                    .eq("id", update.id);
            }

            fetchInventory();
            toast.success("All Running Stock values have been updated.");
        } catch (err) {
            console.error("Sync error:", err);
            toast.error("Failed to sync inventory.");
        } finally {
            setIsSyncingRunningStock(false);
            setShowRunningStockDropdown(false);
        }
    };

    const startEditing = (item: any) => {
        setEditingId(item.id);
        setEditData({ ...item });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditData(null);
    };





    const filtered = inventory.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesArea = selectedAreaId === "all" || i.storage_area_id === selectedAreaId;
        return matchesSearch && matchesArea;
    }).map(i => ({
        ...i,
        status: getStatus(i)
    }));


    const totalAssetValue = inventory.reduce((sum, i) =>
        sum + (Number(i.stock_quantity || 0) * Number(i.cost_per_unit || 0)), 0
    );



    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view inventory.</p>
                <Link href="/dashboard/locations" className="btn btn-primary">
                    Go to Locations
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Inventory Tracking</h1>
                    <p className="text-slate-400 mt-1">
                        {currentLocation.name} - Manage stock levels and unit costs
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                        >
                            <Settings2 className="h-4 w-4" />
                            Columns
                            <ChevronDown className="h-3 w-3 ml-1" />
                        </button>

                        {showColumnDropdown && (
                            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-20 p-2 animate-in fade-in zoom-in-95">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 py-2">Visible Columns</p>
                                {[
                                    { key: 'category', label: 'Category' },
                                    { key: 'storage_area', label: 'Storage Area' },
                                    { key: 'stock', label: 'Stock Unit' },
                                    { key: 'stock_unit', label: 'Stock Meas.' },
                                    { key: 'recipe_unit', label: 'Recipe Unit' },
                                    { key: 'total_usage', label: 'Stock Total' },
                                    { key: 'running_stock', label: 'Running Stock' },
                                    { key: 'par', label: 'Par Level' },
                                    { key: 'cost', label: 'Unit Cost' },
                                    { key: 'last_ordered', label: 'Last Ordered' },
                                    { key: 'created', label: 'Added Date' },
                                ].map(col => (
                                    <button
                                        key={col.key}
                                        onClick={() => toggleColumn(col.key)}
                                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800 rounded-lg transition-colors text-sm"
                                    >
                                        <span className={visibleColumns.includes(col.key) ? "text-white" : "text-slate-500"}>
                                            {col.label}
                                        </span>
                                        {visibleColumns.includes(col.key) && <Check className="h-4 w-4 text-orange-500" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>


                    <button className="btn btn-secondary" onClick={fetchInventory}>
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Refresh
                    </button>
                    <Link href="/dashboard/vendors" className="btn btn-secondary">
                        <Truck className="h-4 w-4" />
                        Vendors
                    </Link>
                    <button className="btn btn-secondary" onClick={() => setShowUploadModal(true)}>
                        <Upload className="h-4 w-4 text-orange-500" />
                        Inventory CSV
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowVendorModal(true)}>
                        <Upload className="h-4 w-4" />
                        Vendor CSV
                    </button>
                    {filtered.some(i => i.status !== 'good') && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-500 animate-pulse">
                            <TrendingDown className="h-4 w-4" />
                            <span className="text-xs font-bold">{filtered.filter(i => i.status !== 'good').length} Low Stock</span>
                        </div>
                    )}

                    <button className="btn btn-primary" onClick={() => setShowPOModal(true)}>
                        <ShoppingCart className="h-4 w-4" />
                        Create PO
                    </button>
                    <button className="btn btn-primary bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/20" onClick={() => setShowTakeInventoryModal(true)}>
                        <CheckSquare className="h-4 w-4" />
                        Take Inventory
                    </button>
                </div>
            </div>

            {/* Metrics & Links Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                    <h3 className="font-bold mb-4">Stock Value</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Total Asset Value</span>
                            <span className="font-bold text-lg">{formatCurrency(totalAssetValue)}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-orange-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, (totalAssetValue / 10000) * 100)}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-500">
                            Calculated from {inventory.length} items across all categories.
                        </p>
                    </div>
                </div>

                <div className="card">
                    <h3 className="font-bold mb-4">Quick Links</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Link
                            href="/dashboard/inventory/pours"
                            className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                        >
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-pink-400" />
                                <span>Inventory Logs</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-600" />
                        </Link>
                        <Link
                            href="/dashboard/inventory/waste"
                            className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                        >
                            <div className="flex items-center gap-2">
                                <Trash2 className="h-4 w-4 text-red-400" />
                                <span>Waste Logs</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-600" />
                        </Link>
                        <Link
                            href="/dashboard/menu/suggestions"
                            className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm text-orange-400 font-medium sm:col-span-2"
                        >
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                <span>AI Menu Suggestions</span>
                            </div>
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm text-orange-400 font-medium sm:col-span-1"
                        >
                            <div className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                <span>Export</span>
                            </div>
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setShowHistoryModal(true)}
                            className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm text-blue-400 font-medium sm:col-span-1"
                        >
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>Variance & Recorded History</span>
                            </div>
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setSelectedAreaId("all")}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                            selectedAreaId === "all"
                                ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                        )}
                    >
                        All Items
                    </button>
                    {storageAreas.map((area) => (
                        <div
                            key={area.id}
                            onClick={() => setSelectedAreaId(area.id)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2 cursor-pointer",
                                selectedAreaId === area.id
                                    ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                                    : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                            )}
                        >
                            <span>{area.name}</span>
                            {selectedAreaId === area.id && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteArea(area.id, area.name);
                                    }}
                                    className="p-0.5 hover:bg-black/20 rounded-md transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                    {isAddingArea ? (
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                            <input
                                autoFocus
                                type="text"
                                value={newAreaName}
                                onChange={(e) => setNewAreaName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateArea()}
                                placeholder="Area name..."
                                className="bg-transparent border-none focus:outline-none text-sm px-2 w-32"
                            />
                            <button
                                onClick={handleCreateArea}
                                disabled={isCreatingArea}
                                className="p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                {isCreatingArea ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button
                                onClick={() => setIsAddingArea(false)}
                                className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingArea(true)}
                            className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 rounded-xl transition-all"
                            title="Add Custom Area"
                        >
                            <Plus size={18} />
                        </button>
                    )}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search inventory..."
                        className="input !pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {selectedItems.size > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl animate-in slide-in-from-top-2">
                        <span className="text-sm font-bold text-slate-400 ml-2">
                            {selectedItems.size} items selected
                        </span>
                        <div className="h-4 w-px bg-slate-800 mx-2" />

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Add To:</span>
                            <select
                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
                                onChange={(e) => handleBulkUpdateArea(e.target.value)}
                                value=""
                            >
                                <option value="" disabled>Select Storage Area...</option>
                                <option value="">No Area</option>
                                {storageAreas.map(area => (
                                    <option key={area.id} value={area.id}>{area.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <button
                                className="btn btn-secondary bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 py-1.5"
                                onClick={handleBulkDelete}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                            <button
                                onClick={() => setSelectedItems(new Set())}
                                className="btn btn-secondary py-1.5"
                            >
                                <X className="h-4 w-4" />
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                <div className="card overflow-hidden flex flex-col h-[750px]">
                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="sticky top-0 z-20 bg-slate-900 shadow-md">
                                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <th className="px-4 py-4 bg-slate-900 first:rounded-tl-xl w-10">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="p-1 hover:bg-slate-800 rounded transition-colors"
                                        >
                                            {selectedItems.size === filtered.length && filtered.length > 0 ? (
                                                <CheckSquare className="h-4 w-4 text-orange-500" />
                                            ) : (
                                                <Square className="h-4 w-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 bg-slate-900">Item Name</th>
                                    {visibleColumns.includes('category') && <th className="px-4 py-4 bg-slate-900">Category</th>}
                                    {visibleColumns.includes('storage_area') && <th className="px-4 py-4 bg-slate-900">Storage Area</th>}
                                    {visibleColumns.includes('supplier') && <th className="px-4 py-4 bg-slate-900">Supplier</th>}

                                    {visibleColumns.includes('stock') && <th className="px-4 py-4 bg-slate-900 font-bold">Stock Unit</th>}
                                    {visibleColumns.includes('stock_unit') && <th className="px-4 py-4 bg-slate-900 font-bold text-orange-400">Stock Meas.</th>}
                                    {visibleColumns.includes('recipe_unit') && <th className="px-4 py-4 bg-slate-900 font-bold">Recipe Unit</th>}
                                    {visibleColumns.includes('total_usage') && <th className="px-4 py-4 bg-slate-900 text-pink-400 font-bold text-orange-400">Stock Total</th>}
                                    {visibleColumns.includes('running_stock') && (
                                        <th className="px-4 py-4 bg-slate-900 text-pink-400 font-bold relative group">
                                            <div className="flex items-center gap-2">
                                                Running Stock
                                                <div className="relative inline-block text-left">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowRunningStockDropdown(!showRunningStockDropdown);
                                                        }}
                                                        className="p-1 hover:bg-slate-800 rounded transition-colors"
                                                        disabled={isSyncingRunningStock}
                                                    >
                                                        {isSyncingRunningStock ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <ChevronDown size={14} />
                                                        )}
                                                    </button>

                                                    {showRunningStockDropdown && (
                                                        <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-30 p-1 animate-in fade-in zoom-in-95">
                                                            <button
                                                                onClick={handleSyncAllRunningStock}
                                                                className="flex items-center w-full px-3 py-2 text-xs font-bold text-pink-400 hover:bg-pink-500/10 rounded-lg text-left gap-2 transition-all"
                                                            >
                                                                <RefreshCw size={12} className={isSyncingRunningStock ? "animate-spin" : ""} />
                                                                Update All
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.includes('par') && <th className="px-4 py-4 bg-slate-900 font-bold">Par</th>}
                                    {visibleColumns.includes('cost') && <th className="px-4 py-4 bg-slate-900 font-bold">Cost</th>}

                                    {visibleColumns.includes('reorder') && <th className="px-4 py-4 bg-slate-900">Reorder</th>}
                                    {visibleColumns.includes('usage') && <th className="px-4 py-4 bg-slate-900">Usage</th>}
                                    {visibleColumns.includes('last_ordered') && <th className="px-4 py-4 bg-slate-900">Last Ordered</th>}
                                    {visibleColumns.includes('created') && <th className="px-4 py-4 bg-slate-900 last:rounded-tr-xl">Added</th>}
                                    <th className="px-4 py-4 bg-slate-900 text-center">Status</th>
                                    <th className="px-4 py-4 bg-slate-900 text-right">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={visibleColumns.length + 2} className="px-4 py-12 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : filtered.length > 0 ? (
                                    filtered.map((item) => {
                                        const isEditing = editingId === item.id;

                                        return (
                                            <tr
                                                key={item.id}
                                                className={cn(
                                                    "border-b border-slate-800/50 transition-colors group",
                                                    isEditing ? "bg-orange-500/5" : "hover:bg-slate-900/40 cursor-default",
                                                    selectedItems.has(item.id) && "bg-orange-500/10"
                                                )}
                                                onDoubleClick={() => !isEditing && startEditing(item)}
                                            >
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleSelectItem(item.id);
                                                        }}
                                                        className="p-1 hover:bg-slate-800 rounded transition-colors"
                                                    >
                                                        {selectedItems.has(item.id) ? (
                                                            <CheckSquare className="h-4 w-4 text-orange-500" />
                                                        ) : (
                                                            <Square className="h-4 w-4 text-slate-700" />
                                                        )}
                                                    </button>
                                                </td>

                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <input
                                                            className="input !py-1 !px-2 text-sm w-full"
                                                            value={editData.name}
                                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                        />
                                                    ) : (
                                                        <span className="font-medium text-sm">{item.name}</span>
                                                    )}
                                                </td>

                                                {visibleColumns.includes('category') && (
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <input
                                                                className="input !py-1 !px-2 text-sm w-full"
                                                                value={editData.category || ""}
                                                                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                                            />
                                                        ) : (
                                                            <span className="text-sm text-slate-400">{item.category || '-'}</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleColumns.includes('storage_area') && (
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <select
                                                                className="input !py-1 !px-2 text-sm w-full bg-slate-900"
                                                                value={editData.storage_area_id || ""}
                                                                onChange={(e) => {
                                                                    const area = storageAreas.find(a => a.id === e.target.value);
                                                                    setEditData({
                                                                        ...editData,
                                                                        storage_area_id: e.target.value || null,
                                                                        storage_area_name: area ? area.name : null
                                                                    });
                                                                }}
                                                            >
                                                                <option value="">No Area</option>
                                                                {storageAreas.map(area => (
                                                                    <option key={area.id} value={area.id}>{area.name}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <span className="text-sm text-slate-400">{item.storage_area_name || '-'}</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleColumns.includes('supplier') && (
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <input
                                                                className="input !py-1 !px-2 text-sm w-full"
                                                                value={editData.supplier || ""}
                                                                onChange={(e) => setEditData({ ...editData, supplier: e.target.value })}
                                                            />
                                                        ) : (
                                                            <span className="text-sm text-slate-400">{item.supplier || '-'}</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleColumns.includes('stock') && (
                                                    <td className="px-4 py-3 font-mono font-bold text-white">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className="input !py-1 !px-2 text-sm w-full"
                                                                value={editData.stock_quantity}
                                                                onChange={(e) => setEditData({ ...editData, stock_quantity: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        ) : (
                                                            item.stock_quantity
                                                        )}
                                                    </td>
                                                )}

                                                {visibleColumns.includes('stock_unit') && (
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <input
                                                                className="input !py-1 !px-2 text-sm w-full"
                                                                value={`${editData.units_per_stock || 1} ${editData.unit || ''}`.trim()}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    // Match number followed by optional unit label
                                                                    const match = val.match(/^(\d*\.?\d+)\s*(.*)$/i);
                                                                    if (match) {
                                                                        setEditData({
                                                                            ...editData,
                                                                            units_per_stock: parseFloat(match[1]) || 1,
                                                                            unit: match[2].trim() || ''
                                                                        });
                                                                    } else {
                                                                        setEditData({ ...editData, units_per_stock: 1, unit: val.trim() });
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="text-sm">
                                                                {item.units_per_stock && item.units_per_stock !== 1
                                                                    ? `${item.units_per_stock} ${item.unit}`
                                                                    : item.unit}
                                                            </span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleColumns.includes('recipe_unit') && (
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <input
                                                                className="input !py-1 !px-2 text-sm w-full"
                                                                value={editData.recipe_unit || ""}
                                                                onChange={(e) => setEditData({ ...editData, recipe_unit: e.target.value })}
                                                            />
                                                        ) : (
                                                            <span className="text-sm text-slate-400">{item.recipe_unit || item.unit}</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleColumns.includes('total_usage') && (
                                                    <td className="px-4 py-3 bg-pink-500/5">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-mono font-bold text-orange-400">
                                                                {(() => {
                                                                    const stock = Number(item.stock_quantity || 0);
                                                                    let multiplier = Number(item.units_per_stock || 1);
                                                                    let unitLabel = item.unit || '';

                                                                    let conversion = 1;
                                                                    const combinedUnit = unitLabel.toLowerCase();
                                                                    const recipeUnit = (item.recipe_unit || '').toLowerCase();

                                                                    if (combinedUnit.includes('lb') && recipeUnit.includes('oz')) {
                                                                        conversion = 16;
                                                                    } else if (combinedUnit.includes('gal') && recipeUnit.includes('oz')) {
                                                                        conversion = 128;
                                                                    }

                                                                    return (stock * multiplier * conversion).toLocaleString();
                                                                })()}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                                                                TOTAL {item.recipe_unit || item.unit}
                                                            </span>
                                                        </div>
                                                    </td>
                                                )}

                                                {visibleColumns.includes('running_stock') && (
                                                    <td className="px-4 py-3 bg-pink-500/5">
                                                        <div className="flex flex-col">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    className="input !py-1 !px-2 text-sm w-full font-mono font-bold text-pink-400"
                                                                    value={editData.running_stock ?? item.running_stock}
                                                                    onChange={(e) => setEditData({ ...editData, running_stock: parseFloat(e.target.value) })}
                                                                />
                                                            ) : (
                                                                <span className="text-sm font-mono font-bold text-pink-400">
                                                                    {(Number(item.running_stock || 0)).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                {visibleColumns.includes('par') && (
                                                    <td className="px-4 py-3 text-sm font-mono text-slate-500">
                                                        {item.par_level}
                                                    </td>
                                                )}

                                                {visibleColumns.includes('reorder') && (
                                                    <td className="px-4 py-3 text-sm font-mono text-slate-500">
                                                        {item.reorder_quantity || '-'}
                                                    </td>
                                                )}

                                                {visibleColumns.includes('usage') && (
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className="input !py-1 !px-2 text-sm w-full font-mono"
                                                                value={editData.avg_daily_usage || 0}
                                                                onChange={(e) => setEditData({ ...editData, avg_daily_usage: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        ) : (
                                                            <span className="text-sm font-mono text-slate-500">{item.avg_daily_usage || 0}</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleColumns.includes('cost') && (
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className="input !py-1 !px-2 text-sm w-full font-mono"
                                                                value={editData.cost_per_unit || 0}
                                                                onChange={(e) => setEditData({ ...editData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        ) : (
                                                            <span className="text-sm font-mono text-slate-500">{formatCurrency(item.cost_per_unit || 0)}</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleColumns.includes('last_ordered') && (
                                                    <td className="px-4 py-3 text-sm text-slate-500">
                                                        {item.last_ordered_at ? new Date(item.last_ordered_at).toLocaleDateString() : 'Never'}
                                                    </td>
                                                )}

                                                {visibleColumns.includes('created') && (
                                                    <td className="px-4 py-3 text-sm text-slate-500">
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                    </td>
                                                )}

                                                <td className="px-4 py-3">

                                                    <span className={cn(
                                                        "badge text-[10px]",
                                                        item.status === "critical" && "badge-danger",
                                                        item.status === "low" && "badge-warning",
                                                        item.status === "good" && "badge-success"
                                                    )}>
                                                        {item.status}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3 text-right">
                                                    {isEditing ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleUpdateItem(item.id, editData)}
                                                                className="p-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors"
                                                                title="Save Changes"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={cancelEditing}
                                                                className="p-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
                                                                title="Cancel"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-end gap-1 transition-all">
                                                            <button
                                                                onClick={() => startEditing(item)}
                                                                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-orange-500"
                                                                title="Quick Edit"
                                                            >
                                                                <Settings2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteItem(item)}
                                                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500"
                                                                title="Delete Item"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={visibleColumns.length + 2} className="px-4 py-12 text-center text-slate-500">
                                            No inventory items found
                                        </td>
                                    </tr>
                                )}

                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <CSVUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                locationId={currentLocation.id}
                onComplete={fetchInventory}
            />

            <VendorImportModal
                isOpen={showVendorModal}
                onClose={() => setShowVendorModal(false)}
                locationId={currentLocation.id}
                onComplete={fetchInventory}
            />

            <CreatePOModal
                isOpen={showPOModal}
                onClose={() => setShowPOModal(false)}
                locationId={currentLocation.id}
                lowStockItems={inventory.filter(i => i.stock_quantity < (i.par_level || 0))}
                onComplete={() => {
                    fetchInventory();
                }}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="card w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl p-6 animate-in zoom-in-95">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                <Trash2 className="h-6 w-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Confirm Deletion</h3>
                                <p className="text-sm text-slate-400">
                                    {itemToDelete
                                        ? `Are you sure you want to delete "${itemToDelete.name}"?`
                                        : `Are you sure you want to delete ${selectedItems.size} items?`
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/10 mb-6">
                            <p className="text-xs text-red-400">
                                <strong>Warning:</strong> This action cannot be undone. All stock history and links associated with {itemToDelete ? 'this item' : 'these items'} will be permanently removed.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="btn btn-secondary flex-1"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="btn btn-primary bg-red-500 hover:bg-red-600 border-none shadow-lg shadow-red-500/20 flex-1"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete Permanently'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <TakeInventoryModal
                isOpen={showTakeInventoryModal}
                onClose={() => setShowTakeInventoryModal(false)}
                locationId={currentLocation.id}
                storageAreas={storageAreas}
            />

            <InventoryHistoryModal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                locationId={currentLocation.id}
            />

            <ExportInventoryModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                locationId={currentLocation.id}
                storageAreas={storageAreas}
            />
        </div>
    );
}
