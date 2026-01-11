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
    Sparkles
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { toast } from "react-hot-toast";
import CSVUploadModal from "@/components/dashboard/inventory/CSVUploadModal";
import { VendorImportModal } from "@/components/dashboard/inventory/VendorImportModal";
import CreatePOModal from "@/components/dashboard/inventory/CreatePOModal";



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




    // Default visible columns: Simplified set as requested
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['category', 'stock', 'stock_unit', 'recipe_unit', 'total_usage', 'par', 'cost']);


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

            const { data, error } = await supabase
                .from("inventory_items")
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

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

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

    const getStatus = (stock: number, par: number) => {
        if (stock <= (par || 0) * 0.2) return "critical";
        if (stock <= (par || 0)) return "low";
        return "good";
    };

    const handleUpdateItem = async (id: string, updates: any) => {
        try {
            const supabase = createClient();
            // Remove synthetic fields
            const { status, ...cleanUpdates } = updates;

            const { error } = await (supabase as any)
                .from("inventory_items")
                .update(cleanUpdates)
                .eq("id", id);



            if (error) throw error;
            toast.success("Item updated successfully");
            fetchInventory();
            setEditingId(null);
            setEditData(null);
        } catch (err: any) {
            toast.error("Failed to update: " + err.message);
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





    const filtered = inventory.filter(i =>

        i.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).map(i => ({
        ...i,
        status: getStatus(Number(i.stock_quantity || 0), Number(i.par_level || 0))
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
                                    { key: 'stock', label: 'Stock Unit (Qty)' },
                                    { key: 'stock_unit', label: 'Stock Meas (e.g. 5lbs)' },
                                    { key: 'recipe_unit', label: 'Recipe Unit (e.g. oz)' },
                                    { key: 'total_usage', label: 'Total Stock' },
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
                    {selectedItems.size > 0 && (
                        <button
                            className="btn btn-secondary bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete ({selectedItems.size})
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowPOModal(true)}>
                        <ShoppingCart className="h-4 w-4" />
                        Create PO
                    </button>
                </div>



            </div>

            {/* Low Stock Alert Banner */}
            {filtered.some(i => i.status !== 'good') && (
                <div className="card border-orange-500/30 bg-orange-500/5 p-4 lg:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex gap-4">
                        <div className="p-3 bg-orange-500/20 rounded-2xl h-fit">
                            <TrendingDown className="h-6 w-6 text-orange-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-orange-100">Low Stock Alert</h3>
                            <p className="text-sm text-orange-200/60 max-w-lg mt-1">
                                {filtered.filter(i => i.status !== 'good').length} items are below par level.
                                Reorder these essentials to maintain service standards.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPOModal(true)}
                        className="btn btn-primary whitespace-nowrap bg-orange-500 hover:bg-orange-600 border-none shadow-lg shadow-orange-500/20"
                    >
                        Create PO
                        <ArrowRight className="h-4 w-4" />
                    </button>

                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inventory List */}
                <div className="lg:col-span-2 space-y-4">
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
                                        {visibleColumns.includes('supplier') && <th className="px-4 py-4 bg-slate-900">Supplier</th>}

                                        {visibleColumns.includes('stock') && <th className="px-4 py-4 bg-slate-900 font-bold">Stock Unit</th>}
                                        {visibleColumns.includes('stock_unit') && <th className="px-4 py-4 bg-slate-900 font-bold text-orange-400">Stock Meas</th>}
                                        {visibleColumns.includes('recipe_unit') && <th className="px-4 py-4 bg-slate-900 font-bold">Recipe Unit</th>}
                                        {visibleColumns.includes('total_usage') && <th className="px-4 py-4 bg-slate-900 text-pink-400 font-bold">Total Stock</th>}
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
                                                                <span className="text-sm font-mono font-bold text-pink-400">
                                                                    {(() => {
                                                                        const stock = Number(item.stock_quantity || 0);

                                                                        // Smart parsing for existing data where multiplier might be in 'unit' string
                                                                        let multiplier = Number(item.units_per_stock || 1);
                                                                        let unitLabel = item.unit || '';

                                                                        if (multiplier === 1) {
                                                                            const match = unitLabel.match(/^(\d*\.?\d+)\s*(.*)$/);
                                                                            if (match) {
                                                                                multiplier = parseFloat(match[1]);
                                                                                unitLabel = match[2];
                                                                            }
                                                                        }

                                                                        // Automatic lb to oz conversion
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
                                                                    Total {item.recipe_unit || item.unit}
                                                                </span>
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
                                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
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

                {/* Categories & Actions */}
                <div className="space-y-4">
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
                        <div className="space-y-2">
                            <Link
                                href="/dashboard/inventory/pours"
                                className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-pink-400" />
                                    <span>Inventory Logs</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                            </Link>
                            <Link
                                href="/dashboard/inventory/waste"
                                className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                    <span>Waste Logs</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                            </Link>
                            <Link
                                href="/dashboard/menu/suggestions"
                                className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm text-orange-400 font-medium"
                            >
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    <span>AI Menu Suggestions</span>
                                </div>
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>
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
        </div>
    );
}


