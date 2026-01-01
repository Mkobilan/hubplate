"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Building2,
    FileText,
    Calendar,
    DollarSign,
    Package,
    Check,
    X,
    Edit2,
    Save,
    Loader2,
    Link2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    ExternalLink,
    Trash2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import Link from "next/link";
import { toast } from "react-hot-toast";

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unit: string | null;
    unit_price: number;
    extended_price: number;
    category: string | null;
    gl_code: string | null;
    confidence_score: number;
    needs_review: boolean;
    inventory_item_id: string | null;
    inventory_items?: { id: string; name: string; category: string | null; unit: string } | null;
}

interface InvoiceDetail {
    id: string;
    location_id: string;
    vendor_id: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    due_date: string | null;
    subtotal: number;
    tax: number;
    total: number;
    status: string;
    processing_status: string;
    original_file_url: string | null;
    original_file_name: string | null;
    notes: string | null;
    created_at: string;
    vendors?: { id: string; name: string; email: string | null; phone: string | null; address: string | null } | null;
    invoice_line_items: LineItem[];
    invoice_approvals: {
        id: string;
        action: string;
        notes: string | null;
        created_at: string;
        employees?: { id: string; first_name: string; last_name: string } | null;
    }[];
}

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.id as string;
    const currentLocation = useAppStore((state) => state.currentLocation);

    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<LineItem>>({});
    const [inventoryItems, setInventoryItems] = useState<{ id: string; name: string; category: string | null; unit: string }[]>([]);

    const fetchInvoice = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/invoices?id=${invoiceId}`);
            const data = await response.json();

            if (data.invoice) {
                setInvoice(data.invoice);
            } else {
                toast.error("Invoice not found");
                router.push("/dashboard/invoices");
            }
        } catch (err) {
            console.error("Error fetching invoice:", err);
            toast.error("Failed to load invoice");
        } finally {
            setLoading(false);
        }
    }, [invoiceId, router]);

    const fetchInventoryItems = useCallback(async () => {
        if (!currentLocation) return;

        const supabase = createClient();
        const { data } = await supabase
            .from("inventory_items")
            .select("id, name, category, unit")
            .eq("location_id", currentLocation.id)
            .order("name");

        if (data) {
            setInventoryItems(data);
        }
    }, [currentLocation]);

    useEffect(() => {
        fetchInvoice();
        fetchInventoryItems();
    }, [fetchInvoice, fetchInventoryItems]);

    const handleApprove = async () => {
        try {
            setSaving(true);
            const response = await fetch("/api/invoices", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId, action: "approve" }),
            });

            if (response.ok) {
                toast.success("Invoice approved");
                fetchInvoice();
            } else {
                toast.error("Failed to approve invoice");
            }
        } catch (err) {
            toast.error("Failed to approve invoice");
        } finally {
            setSaving(false);
        }
    };

    const handleReject = async () => {
        try {
            setSaving(true);
            const response = await fetch("/api/invoices", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId, action: "reject" }),
            });

            if (response.ok) {
                toast.success("Invoice rejected");
                fetchInvoice();
            } else {
                toast.error("Failed to reject invoice");
            }
        } catch (err) {
            toast.error("Failed to reject invoice");
        } finally {
            setSaving(false);
        }
    };

    const handleMarkPaid = async () => {
        try {
            setSaving(true);
            const response = await fetch("/api/invoices", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId, action: "mark_paid" }),
            });

            if (response.ok) {
                toast.success("Invoice marked as paid");
                fetchInvoice();
            } else {
                toast.error("Failed to update invoice");
            }
        } catch (err) {
            toast.error("Failed to update invoice");
        } finally {
            setSaving(false);
        }
    };

    const startEditingItem = (item: LineItem) => {
        setEditingItem(item.id);
        setEditData({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            inventory_item_id: item.inventory_item_id,
        });
    };

    const saveLineItem = async (itemId: string) => {
        try {
            const extendedPrice = (editData.quantity || 0) * (editData.unit_price || 0);

            const response = await fetch("/api/invoices", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoiceId,
                    lineItems: [{
                        id: itemId,
                        ...editData,
                        extended_price: extendedPrice,
                    }],
                }),
            });

            if (response.ok) {
                toast.success("Line item updated");
                setEditingItem(null);
                setEditData({});
                fetchInvoice();
            } else {
                toast.error("Failed to update line item");
            }
        } catch (err) {
            toast.error("Failed to update line item");
        }
    };

    const getStatusBadge = (status: string, processingStatus: string) => {
        if (processingStatus === "processing") {
            return <span className="badge badge-info flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Processing</span>;
        }
        if (processingStatus === "needs_review") {
            return <span className="badge badge-warning">Needs Review</span>;
        }
        if (processingStatus === "failed") {
            return <span className="badge badge-danger">Failed</span>;
        }

        switch (status) {
            case "pending":
                return <span className="badge badge-warning">Pending</span>;
            case "approved":
                return <span className="badge badge-success">Approved</span>;
            case "paid":
                return <span className="badge badge-info">Paid</span>;
            case "disputed":
                return <span className="badge badge-danger">Disputed</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Invoice Not Found</h2>
                <Link href="/dashboard/invoices" className="btn btn-primary mt-4">
                    Back to Invoices
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/invoices" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            Invoice {invoice.invoice_number || "#" + invoice.id.slice(0, 8)}
                            {getStatusBadge(invoice.status, invoice.processing_status)}
                        </h1>
                        <p className="text-slate-400 mt-1">
                            {invoice.vendors?.name || "Unknown Vendor"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {invoice.original_file_url && (
                        <a
                            href={invoice.original_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                        >
                            <ExternalLink className="h-4 w-4" />
                            View Original
                        </a>
                    )}
                    {invoice.status === "pending" && invoice.processing_status !== "processing" && (
                        <>
                            <button
                                onClick={handleReject}
                                disabled={saving}
                                className="btn btn-secondary"
                            >
                                <XCircle className="h-4 w-4" />
                                Reject
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={saving}
                                className="btn btn-primary bg-green-600 hover:bg-green-700 border-green-600"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Approve
                            </button>
                        </>
                    )}
                    {invoice.status === "approved" && (
                        <button
                            onClick={handleMarkPaid}
                            disabled={saving}
                            className="btn btn-primary"
                        >
                            <DollarSign className="h-4 w-4" />
                            Mark as Paid
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Invoice Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary Card */}
                    <div className="card">
                        <h3 className="font-bold mb-4">Invoice Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-slate-500">Invoice Date</p>
                                <p className="font-medium">
                                    {invoice.invoice_date
                                        ? new Date(invoice.invoice_date).toLocaleDateString()
                                        : "-"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Due Date</p>
                                <p className="font-medium">
                                    {invoice.due_date
                                        ? new Date(invoice.due_date).toLocaleDateString()
                                        : "-"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Subtotal</p>
                                <p className="font-medium font-mono">{formatCurrency(invoice.subtotal)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Tax</p>
                                <p className="font-medium font-mono">{formatCurrency(invoice.tax)}</p>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-lg font-bold">Total</span>
                            <span className="text-2xl font-bold font-mono text-green-400">
                                {formatCurrency(invoice.total)}
                            </span>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="card overflow-hidden">
                        <div className="p-4 border-b border-slate-800">
                            <h3 className="font-bold">Line Items ({invoice.invoice_line_items.length})</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="px-4 py-3">Description</th>
                                        <th className="px-4 py-3">Qty</th>
                                        <th className="px-4 py-3">Unit Price</th>
                                        <th className="px-4 py-3">Total</th>
                                        <th className="px-4 py-3">Linked Item</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {invoice.invoice_line_items.map((item) => {
                                        const isEditing = editingItem === item.id;

                                        return (
                                            <tr key={item.id} className={cn(
                                                "hover:bg-slate-900/40 transition-colors",
                                                item.needs_review && "bg-amber-500/5",
                                                isEditing && "bg-orange-500/5"
                                            )}>
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <input
                                                            className="input !py-1 !px-2 text-sm w-full"
                                                            value={editData.description || ""}
                                                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                                        />
                                                    ) : (
                                                        <div>
                                                            <span className="font-medium text-sm">{item.description}</span>
                                                            {item.needs_review && (
                                                                <span className="ml-2 text-[10px] text-amber-500">Needs review</span>
                                                            )}
                                                            {item.category && (
                                                                <span className="block text-[10px] text-slate-500 capitalize">{item.category}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <div className="flex gap-1">
                                                            <input
                                                                type="number"
                                                                className="input !py-1 !px-2 text-sm w-16 font-mono"
                                                                value={editData.quantity || 0}
                                                                onChange={(e) => setEditData({ ...editData, quantity: parseFloat(e.target.value) || 0 })}
                                                            />
                                                            <input
                                                                className="input !py-1 !px-2 text-sm w-16"
                                                                value={editData.unit || ""}
                                                                onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                                                                placeholder="unit"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="font-mono text-sm">{item.quantity} {item.unit}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="input !py-1 !px-2 text-sm w-24 font-mono"
                                                            value={editData.unit_price || 0}
                                                            onChange={(e) => setEditData({ ...editData, unit_price: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    ) : (
                                                        <span className="font-mono text-sm">{formatCurrency(item.unit_price)}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-medium text-sm">
                                                    {isEditing
                                                        ? formatCurrency((editData.quantity || 0) * (editData.unit_price || 0))
                                                        : formatCurrency(item.extended_price)
                                                    }
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <select
                                                            className="input !py-1 !px-2 text-sm w-40"
                                                            value={editData.inventory_item_id || ""}
                                                            onChange={(e) => setEditData({ ...editData, inventory_item_id: e.target.value || null })}
                                                        >
                                                            <option value="">-- Not linked --</option>
                                                            {inventoryItems.map(inv => (
                                                                <option key={inv.id} value={inv.id}>{inv.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : item.inventory_items ? (
                                                        <div className="flex items-center gap-1 text-sm text-green-400">
                                                            <Link2 className="h-3 w-3" />
                                                            {item.inventory_items.name}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-500">Not linked</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {isEditing ? (
                                                        <div className="flex justify-end gap-1">
                                                            <button
                                                                onClick={() => saveLineItem(item.id)}
                                                                className="p-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors"
                                                            >
                                                                <Save className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => { setEditingItem(null); setEditData({}); }}
                                                                className="p-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => startEditingItem(item)}
                                                            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-orange-500"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Vendor Info */}
                    <div className="card">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-400" />
                            Vendor
                        </h3>
                        {invoice.vendors ? (
                            <div className="space-y-2 text-sm">
                                <p className="font-medium text-lg">{invoice.vendors.name}</p>
                                {invoice.vendors.address && (
                                    <p className="text-slate-400">{invoice.vendors.address}</p>
                                )}
                                {invoice.vendors.phone && (
                                    <p className="text-slate-400">{invoice.vendors.phone}</p>
                                )}
                                {invoice.vendors.email && (
                                    <p className="text-slate-400">{invoice.vendors.email}</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-slate-500">No vendor information</p>
                        )}
                    </div>

                    {/* Activity Log */}
                    <div className="card">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-purple-400" />
                            Activity
                        </h3>
                        <div className="space-y-3">
                            {invoice.invoice_approvals.length > 0 ? (
                                invoice.invoice_approvals.map((approval) => (
                                    <div key={approval.id} className="flex gap-3 text-sm">
                                        <div className={cn(
                                            "p-1.5 rounded-lg h-fit",
                                            approval.action === "approved" && "bg-green-500/10",
                                            approval.action === "rejected" && "bg-red-500/10",
                                            approval.action === "submitted" && "bg-blue-500/10",
                                            approval.action === "edited" && "bg-amber-500/10"
                                        )}>
                                            {approval.action === "approved" && <Check className="h-3 w-3 text-green-500" />}
                                            {approval.action === "rejected" && <X className="h-3 w-3 text-red-500" />}
                                            {approval.action === "submitted" && <FileText className="h-3 w-3 text-blue-500" />}
                                            {approval.action === "edited" && <Edit2 className="h-3 w-3 text-amber-500" />}
                                        </div>
                                        <div>
                                            <p className="capitalize">
                                                {approval.action}
                                                {approval.employees && (
                                                    <span className="text-slate-500">
                                                        {" "}by {approval.employees.first_name} {approval.employees.last_name}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                                {new Date(approval.created_at).toLocaleString()}
                                            </p>
                                            {approval.notes && (
                                                <p className="text-slate-400 mt-1">{approval.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-500 text-sm">No activity yet</p>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    {invoice.notes && (
                        <div className="card">
                            <h3 className="font-bold mb-2">Notes</h3>
                            <p className="text-sm text-slate-400">{invoice.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
