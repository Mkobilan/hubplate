"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    FileText,
    Upload,
    Camera,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    DollarSign,
    TrendingUp,
    Building2,
    ChevronRight,
    Loader2,
    X,
    Eye,
    Check,
    MoreHorizontal,
    RefreshCw,
    Download,
    Sparkles,
    Trash2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { toast } from "react-hot-toast";

interface Invoice {
    id: string;
    vendor_id: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    due_date: string | null;
    subtotal: number;
    tax: number;
    total: number;
    status: "pending" | "approved" | "paid" | "disputed" | "cancelled";
    processing_status: "processing" | "completed" | "needs_review" | "failed";
    original_file_url: string | null;
    original_file_name: string | null;
    created_at: string;
    vendors?: { id: string; name: string } | null;
}

export default function InvoicesPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const fetchInvoices = useCallback(async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const response = await fetch(
                `/api/invoices?locationId=${currentLocation.id}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`
            );
            const data = await response.json();

            if (data.invoices) {
                setInvoices(data.invoices);
            }
        } catch (err) {
            console.error("Error fetching invoices:", err);
            toast.error("Failed to load invoices");
        } finally {
            setLoading(false);
        }
    }, [currentLocation, statusFilter]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleFileUpload = async (files: FileList | null, source: "upload" | "scan") => {
        if (!files || files.length === 0 || !currentLocation) return;

        setUploading(true);
        setShowUploadModal(false);
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setUploadProgress(`Processing ${i + 1} of ${files.length}: ${file.name}`);

            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("locationId", currentLocation.id);
                formData.append("source", source);

                const response = await fetch("/api/invoices/upload", {
                    method: "POST",
                    body: formData,
                });

                const result = await response.json();

                if (result.success) {
                    successCount++;
                    if (result.processingStatus === "needs_review") {
                        toast.success(`${file.name}: Processed - needs review`, { icon: "⚠️" });
                    } else {
                        toast.success(`${file.name}: Processed successfully`);
                    }
                } else {
                    errorCount++;
                    toast.error(`${file.name}: ${result.error || "Processing failed"}`);
                }
            } catch (err) {
                errorCount++;
                toast.error(`${file.name}: Upload failed`);
            }
        }

        setUploading(false);
        setUploadProgress("");
        fetchInvoices();

        if (successCount > 0) {
            toast.success(`${successCount} invoice(s) processed successfully`);
        }
    };

    const handleApproveInvoice = async (invoiceId: string) => {
        try {
            const response = await fetch("/api/invoices", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId, action: "approve" }),
            });

            if (response.ok) {
                toast.success("Invoice approved");
                fetchInvoices();
                setShowReviewModal(false);
            } else {
                toast.error("Failed to approve invoice");
            }
        } catch (err) {
            toast.error("Failed to approve invoice");
        }
    };

    const handleRejectInvoice = async (invoiceId: string) => {
        try {
            const response = await fetch("/api/invoices", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoiceId,
                    action: "reject",
                    updates: { notes: "Rejected by manager" }
                }),
            });

            if (response.ok) {
                toast.success("Invoice rejected");
                fetchInvoices();
                setShowReviewModal(false);
            } else {
                toast.error("Failed to reject invoice");
            }
        } catch (err) {
            toast.error("Failed to reject invoice");
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
            case "cancelled":
                return <span className="badge" style={{ background: "rgba(100,100,100,0.3)" }}>Cancelled</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    const filtered = invoices.filter(inv => {
        if (!searchQuery) return true;
        const matchesSearch =
            (inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
            (inv.vendors?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
        return matchesSearch;
    });

    // Stats
    const stats = {
        total: invoices.length,
        pending: invoices.filter(i => i.status === "pending" && i.processing_status === "completed").length,
        needsReview: invoices.filter(i => i.processing_status === "needs_review").length,
        failed: invoices.filter(i => i.processing_status === "failed").length,
        thisMonth: invoices
            .filter(i => {
                const date = new Date(i.invoice_date || i.created_at);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            })
            .reduce((sum, i) => sum + Number(i.total), 0),
    };

    const handleDeleteInvoice = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this invoice?")) return;

        try {
            const response = await fetch(`/api/invoices?id=${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("Invoice deleted");
                fetchInvoices();
            } else {
                toast.error("Failed to delete invoice");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Error deleting invoice");
        }
    };

    const handleStatClick = (filter: string) => {
        if (filter === "all") {
            setStatusFilter("all");
        } else if (filter === "pending") {
            setStatusFilter("pending");
        } else if (filter === "needs_review") {
            setStatusFilter("needs_review");
        } else if (filter === "failed") {
            setStatusFilter("failed");
        }
    };

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to manage invoices.</p>
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
                    <h1 className="text-3xl font-bold">Invoice Management</h1>
                    <p className="text-slate-400 mt-1">
                        {currentLocation.name} - Upload, process, and track supplier invoices
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn btn-secondary"
                        onClick={fetchInvoices}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Refresh
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowUploadModal(true)}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                Upload Invoice
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Upload Progress Banner */}
            {uploading && uploadProgress && (
                <div className="card border-orange-500/30 bg-orange-500/5 p-4 flex items-center gap-4">
                    <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
                    <div>
                        <p className="font-medium text-orange-100">Processing Invoice...</p>
                        <p className="text-sm text-orange-200/60">{uploadProgress}</p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div
                    className={cn("card text-center cursor-pointer hover:bg-slate-800/50 transition-all", statusFilter === "all" && "ring-2 ring-orange-500")}
                    onClick={() => handleStatClick("all")}
                >
                    <FileText className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.total}</p>
                    <p className="text-sm text-slate-500">Total Invoices</p>
                </div>
                <div
                    className={cn("card text-center cursor-pointer hover:bg-slate-800/50 transition-all", statusFilter === "pending" && "ring-2 ring-amber-500")}
                    onClick={() => handleStatClick("pending")}
                >
                    <Clock className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-amber-400">{stats.pending}</p>
                    <p className="text-sm text-slate-500">Pending Approval</p>
                </div>
                <div
                    className={cn("card text-center cursor-pointer hover:bg-slate-800/50 transition-all", statusFilter === "needs_review" && "ring-2 ring-orange-500")}
                    onClick={() => handleStatClick("needs_review")}
                >
                    <AlertCircle className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-orange-400">{stats.needsReview}</p>
                    <p className="text-sm text-slate-500">Needs Review</p>
                </div>
                <div
                    className={cn("card text-center cursor-pointer hover:bg-slate-800/50 transition-all", statusFilter === "failed" && "ring-2 ring-red-500")}
                    onClick={() => handleStatClick("failed")}
                >
                    <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-red-400">{stats.failed}</p>
                    <p className="text-sm text-slate-500">Failed</p>
                </div>
                <div className="card text-center">
                    <DollarSign className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.thisMonth)}</p>
                    <p className="text-sm text-slate-500">This Month</p>
                </div>
            </div>

            {/* AI Banner */}
            <div className="card border-purple-500/30 bg-purple-500/5 p-4 lg:p-6">
                <div className="flex gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-2xl h-fit">
                        <Sparkles className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-purple-100">Powered by Gemini AI</h3>
                        <p className="text-sm text-purple-200/60 max-w-2xl mt-1">
                            Upload invoices and our AI automatically extracts vendor info, line items, and costs.
                            Items are matched to your inventory for real-time cost tracking.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div id="invoice-filters" className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by invoice # or vendor..."
                        className="input !pl-10 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    className="input w-48"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending Approval</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="failed">Failed Processing</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="disputed">Disputed</option>
                </select>
            </div>

            {/* Invoice List */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th className="px-4 py-3">Vendor</th>
                                <th className="px-4 py-3">Invoice #</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Total</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filtered.length > 0 ? (
                                filtered.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className={cn(
                                            "hover:bg-slate-900/40 transition-colors cursor-pointer",
                                            invoice.processing_status === "failed" && "bg-red-500/5"
                                        )}
                                        onClick={() => {
                                            setSelectedInvoice(invoice);
                                            setShowReviewModal(true);
                                        }}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-slate-500" />
                                                <span className="font-medium">
                                                    {invoice.vendors?.name || "Unknown Vendor"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-sm">
                                            {invoice.invoice_number || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {invoice.invoice_date
                                                ? new Date(invoice.invoice_date).toLocaleDateString()
                                                : new Date(invoice.created_at).toLocaleDateString()
                                            }
                                        </td>
                                        <td className="px-4 py-3 font-mono font-medium">
                                            {formatCurrency(invoice.total)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(invoice.status, invoice.processing_status)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button
                                                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedInvoice(invoice);
                                                        setShowReviewModal(true);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="p-1 hover:bg-red-900/40 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                    onClick={(e) => handleDeleteInvoice(e, invoice.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                        <p>No invoices found</p>
                                        <p className="text-sm mt-2">Upload your first invoice to get started</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    href="/dashboard/invoices/vendors"
                    className="card p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Building2 className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="font-medium">Manage Vendors</p>
                            <p className="text-sm text-slate-500">View and edit suppliers</p>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-orange-500 transition-colors" />
                </Link>
                <Link
                    href="/dashboard/invoices/analytics"
                    className="card p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-xl">
                            <TrendingUp className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                            <p className="font-medium">Cost Analytics</p>
                            <p className="text-sm text-slate-500">Track spending trends</p>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-orange-500 transition-colors" />
                </Link>
                <Link
                    href="/dashboard/inventory"
                    className="card p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-xl">
                            <DollarSign className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="font-medium">Inventory</p>
                            <p className="text-sm text-slate-500">View updated costs</p>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-orange-500 transition-colors" />
                </Link>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
                    <div className="relative card w-full max-w-lg animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Upload Invoice</h2>
                            <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Drag & Drop Zone */}
                            <div
                                className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center hover:border-orange-500/50 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add("border-orange-500");
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.classList.remove("border-orange-500");
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove("border-orange-500");
                                    handleFileUpload(e.dataTransfer.files, "upload");
                                }}
                            >
                                <Upload className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                                <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
                                <p className="text-sm text-slate-500">
                                    Supports PDF, JPEG, PNG, WebP (max 50MB)
                                </p>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => handleFileUpload(e.target.files, "upload")}
                            />

                            {/* Camera Option */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-800"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-slate-900 text-slate-500">or</span>
                                </div>
                            </div>

                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="w-full btn btn-secondary py-4"
                            >
                                <Camera className="h-5 w-5" />
                                Take Photo with Camera
                            </button>

                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e.target.files, "scan")}
                            />

                            <p className="text-xs text-slate-500 text-center">
                                Our AI will automatically extract vendor info, line items, and totals
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {showReviewModal && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
                    <div className="relative card w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div>
                                <h2 className="text-xl font-bold">Invoice Review</h2>
                                <p className="text-sm text-slate-500">
                                    {selectedInvoice.vendors?.name || "Unknown Vendor"} - {selectedInvoice.invoice_number || "No Invoice #"}
                                </p>
                            </div>
                            <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                            {/* Original Document */}
                            <div>
                                <h3 className="font-bold mb-4">Original Document</h3>
                                {selectedInvoice.processing_status === "failed" && (
                                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-3 text-sm text-red-200">
                                        <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                                        <p>AI processing failed for this document. You can still see the original file below and enter data manually.</p>
                                    </div>
                                )}
                                {selectedInvoice.original_file_url ? (
                                    <div className="bg-slate-900 rounded-xl overflow-hidden">
                                        {selectedInvoice.original_file_name?.toLowerCase().endsWith('.pdf') ? (
                                            <iframe
                                                src={selectedInvoice.original_file_url}
                                                className="w-full h-96"
                                                title="Invoice PDF"
                                            />
                                        ) : (
                                            <img
                                                src={selectedInvoice.original_file_url}
                                                alt="Invoice"
                                                className="w-full h-auto max-h-96 object-contain"
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-slate-900 rounded-xl h-96 flex items-center justify-center">
                                        <p className="text-slate-500">No document available</p>
                                    </div>
                                )}
                            </div>

                            {/* Extracted Data */}
                            <div className="space-y-4">
                                <h3 className="font-bold">Extracted Data</h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-500">Vendor</span>
                                        <span className="font-medium">{selectedInvoice.vendors?.name || "Unknown"}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-500">Invoice Number</span>
                                        <span className="font-mono">{selectedInvoice.invoice_number || "-"}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-500">Invoice Date</span>
                                        <span>{selectedInvoice.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString() : "-"}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-500">Due Date</span>
                                        <span>{selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : "-"}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-500">Subtotal</span>
                                        <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-800">
                                        <span className="text-slate-500">Tax</span>
                                        <span className="font-mono">{formatCurrency(selectedInvoice.tax)}</span>
                                    </div>
                                    <div className="flex justify-between py-2 text-lg">
                                        <span className="font-bold">Total</span>
                                        <span className="font-bold font-mono text-green-400">{formatCurrency(selectedInvoice.total)}</span>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <p className="text-sm text-slate-500 mb-2">Status</p>
                                    {getStatusBadge(selectedInvoice.status, selectedInvoice.processing_status)}
                                </div>

                                <Link
                                    href={`/dashboard/invoices/${selectedInvoice.id}`}
                                    className="btn btn-secondary w-full mt-4"
                                >
                                    View Full Details & Line Items
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {selectedInvoice.status === "pending" && selectedInvoice.processing_status !== "processing" && (
                            <div className="p-6 border-t border-slate-800 flex gap-3 justify-end">
                                <button
                                    className="btn bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
                                    onClick={(e) => {
                                        handleDeleteInvoice(e, selectedInvoice.id);
                                        setShowReviewModal(false);
                                    }}
                                    title="Delete Invoice"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleRejectInvoice(selectedInvoice.id)}
                                >
                                    <XCircle className="h-4 w-4" />
                                    Reject
                                </button>
                                <button
                                    className="btn btn-primary bg-green-600 hover:bg-green-700 border-green-600"
                                    onClick={() => handleApproveInvoice(selectedInvoice.id)}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Approve Invoice
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
