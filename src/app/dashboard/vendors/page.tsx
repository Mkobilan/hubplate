"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Building2,
    Plus,
    Search,
    Edit2,
    Trash2,
    Phone,
    Mail,
    MapPin,
    DollarSign,
    FileText,
    X,
    Check,
    Loader2,
    ChevronRight
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/stores";
import Link from "next/link";
import { toast } from "react-hot-toast";

interface Vendor {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    account_number: string | null;
    payment_terms: string | null;
    notes: string | null;
    is_active: boolean;
    created_at: string;
}

interface VendorStats {
    totalInvoices: number;
    totalSpend: number;
    pendingInvoices: number;
    lastInvoiceDate: string | null;
}

export default function VendorsPage() {
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [vendorStats, setVendorStats] = useState<VendorStats | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        accountNumber: "",
        paymentTerms: "NET30",
        notes: "",
    });

    const fetchVendors = useCallback(async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/vendors?locationId=${currentLocation.id}`);
            const data = await response.json();

            if (data.vendors) {
                setVendors(data.vendors);
            }
        } catch (err) {
            console.error("Error fetching vendors:", err);
            toast.error("Failed to load vendors");
        } finally {
            setLoading(false);
        }
    }, [currentLocation]);

    const fetchVendorStats = async (vendorId: string) => {
        try {
            const response = await fetch(`/api/vendors?id=${vendorId}&includeStats=true`);
            const data = await response.json();

            if (data.stats) {
                setVendorStats(data.stats);
            }
        } catch (err) {
            console.error("Error fetching vendor stats:", err);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, [fetchVendors]);

    useEffect(() => {
        if (selectedVendor) {
            fetchVendorStats(selectedVendor.id);
        } else {
            setVendorStats(null);
        }
    }, [selectedVendor]);

    const openAddModal = () => {
        setEditingVendor(null);
        setFormData({
            name: "",
            email: "",
            phone: "",
            address: "",
            accountNumber: "",
            paymentTerms: "NET30",
            notes: "",
        });
        setShowModal(true);
    };

    const openEditModal = (vendor: Vendor) => {
        setEditingVendor(vendor);
        setFormData({
            name: vendor.name,
            email: vendor.email || "",
            phone: vendor.phone || "",
            address: vendor.address || "",
            accountNumber: vendor.account_number || "",
            paymentTerms: vendor.payment_terms || "NET30",
            notes: vendor.notes || "",
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation || !formData.name.trim()) return;

        try {
            setSaving(true);

            const endpoint = "/api/vendors";
            const method = editingVendor ? "PATCH" : "POST";
            const body = editingVendor
                ? { vendorId: editingVendor.id, ...formData }
                : { locationId: currentLocation.id, ...formData };

            const response = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const result = await response.json();

            if (response.ok) {
                toast.success(editingVendor ? "Vendor updated" : "Vendor created");
                setShowModal(false);
                fetchVendors();
            } else {
                toast.error(result.error || "Failed to save vendor");
            }
        } catch (err) {
            toast.error("Failed to save vendor");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (vendorId: string) => {
        if (!confirm("Are you sure you want to deactivate this vendor?")) return;

        try {
            const response = await fetch(`/api/vendors?id=${vendorId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("Vendor deactivated");
                fetchVendors();
                if (selectedVendor?.id === vendorId) {
                    setSelectedVendor(null);
                }
            } else {
                toast.error("Failed to deactivate vendor");
            }
        } catch (err) {
            toast.error("Failed to deactivate vendor");
        }
    };

    const filtered = vendors.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
    );

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Building2 className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to manage vendors.</p>
                <Link href="/dashboard/locations" className="btn btn-primary">
                    Go to Locations
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Vendors</h1>
                    <p className="text-slate-400 mt-1">
                        {currentLocation.name} - Manage your suppliers
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <Plus className="h-4 w-4" />
                    Add Vendor
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search vendors..."
                    className="input !pl-10 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vendor List */}
                <div className="lg:col-span-2">
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="px-4 py-3">Vendor Name</th>
                                        <th className="px-4 py-3">Contact</th>
                                        <th className="px-4 py-3">Payment Terms</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center">
                                                <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                                            </td>
                                        </tr>
                                    ) : filtered.length > 0 ? (
                                        filtered.map((vendor) => (
                                            <tr
                                                key={vendor.id}
                                                className={cn(
                                                    "hover:bg-slate-900/40 transition-colors cursor-pointer",
                                                    selectedVendor?.id === vendor.id && "bg-orange-500/5"
                                                )}
                                                onClick={() => setSelectedVendor(vendor)}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                                            <Building2 className="h-4 w-4 text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{vendor.name}</p>
                                                            {vendor.account_number && (
                                                                <p className="text-[10px] text-slate-500">
                                                                    Acct: {vendor.account_number}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {vendor.phone && (
                                                        <p className="text-slate-400">{vendor.phone}</p>
                                                    )}
                                                    {vendor.email && (
                                                        <p className="text-slate-500 text-[11px]">{vendor.email}</p>
                                                    )}
                                                    {!vendor.phone && !vendor.email && (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="badge">{vendor.payment_terms || "NET30"}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openEditModal(vendor);
                                                            }}
                                                            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-orange-500"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(vendor.id);
                                                            }}
                                                            className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-slate-500 hover:text-red-500"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                                                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                                <p>No vendors found</p>
                                                <button onClick={openAddModal} className="btn btn-primary mt-4">
                                                    Add Your First Vendor
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Vendor Detail Sidebar */}
                <div>
                    {selectedVendor ? (
                        <div className="card space-y-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-500/10 rounded-xl">
                                        <Building2 className="h-6 w-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{selectedVendor.name}</h3>
                                        <span className="badge text-[10px]">{selectedVendor.payment_terms || "NET30"}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedVendor(null)}
                                    className="p-1 hover:bg-slate-800 rounded-lg"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Stats */}
                            {vendorStats && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold">{vendorStats.totalInvoices}</p>
                                        <p className="text-[10px] text-slate-500">Total Invoices</p>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                                        <p className="text-xl font-bold text-green-400">{formatCurrency(vendorStats.totalSpend)}</p>
                                        <p className="text-[10px] text-slate-500">Total Spend</p>
                                    </div>
                                </div>
                            )}

                            {/* Contact Info */}
                            <div className="space-y-3">
                                {selectedVendor.phone && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone className="h-4 w-4 text-slate-500" />
                                        <span>{selectedVendor.phone}</span>
                                    </div>
                                )}
                                {selectedVendor.email && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <Mail className="h-4 w-4 text-slate-500" />
                                        <span>{selectedVendor.email}</span>
                                    </div>
                                )}
                                {selectedVendor.address && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <MapPin className="h-4 w-4 text-slate-500" />
                                        <span>{selectedVendor.address}</span>
                                    </div>
                                )}
                                {selectedVendor.account_number && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <FileText className="h-4 w-4 text-slate-500" />
                                        <span>Account: {selectedVendor.account_number}</span>
                                    </div>
                                )}
                            </div>

                            {selectedVendor.notes && (
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Notes</p>
                                    <p className="text-sm text-slate-400">{selectedVendor.notes}</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEditModal(selectedVendor)}
                                    className="btn btn-secondary flex-1"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Edit
                                </button>
                                <Link
                                    href={`/dashboard/invoices?vendorId=${selectedVendor.id}`}
                                    className="btn btn-primary flex-1"
                                >
                                    View Invoices
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="card text-center py-12">
                            <Building2 className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500">Select a vendor to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
                    <div className="relative card w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">
                                {editingVendor ? "Edit Vendor" : "Add Vendor"}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                disabled={saving}
                                className="p-2 hover:bg-slate-800 rounded-lg"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Vendor Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Sysco, US Foods"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    disabled={saving}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Phone</label>
                                    <input
                                        type="tel"
                                        className="input"
                                        placeholder="(555) 123-4567"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        disabled={saving}
                                    />
                                </div>
                                <div>
                                    <label className="label">Email</label>
                                    <input
                                        type="email"
                                        className="input"
                                        placeholder="orders@vendor.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Address</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="123 Main St, City, State"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    disabled={saving}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Account Number</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Your customer #"
                                        value={formData.accountNumber}
                                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                        disabled={saving}
                                    />
                                </div>
                                <div>
                                    <label className="label">Payment Terms</label>
                                    <select
                                        className="input"
                                        value={formData.paymentTerms}
                                        onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                                        disabled={saving}
                                    >
                                        <option value="COD">COD</option>
                                        <option value="NET15">Net 15</option>
                                        <option value="NET30">Net 30</option>
                                        <option value="NET45">Net 45</option>
                                        <option value="NET60">Net 60</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="label">Notes</label>
                                <textarea
                                    className="input min-h-[80px] py-2"
                                    placeholder="Any additional notes..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    disabled={saving}
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    disabled={saving}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !formData.name.trim()}
                                    className="btn btn-primary flex-1"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />
                                            {editingVendor ? "Save Changes" : "Add Vendor"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
