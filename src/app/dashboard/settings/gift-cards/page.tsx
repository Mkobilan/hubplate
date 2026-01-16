"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import {
    CreditCard,
    Plus,
    Search,
    Filter,
    Download,
    History,
    MoreVertical,
    CheckCircle2,
    XCircle,
    FileUp,
    Loader2,
    Smartphone
} from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { GiftCardUploadModal } from "@/components/dashboard/settings/GiftCardUploadModal";
import { IssueGiftCardModal } from "@/components/dashboard/settings/IssueGiftCardModal";
import { EmailGiftCardModal } from "@/components/dashboard/settings/EmailGiftCardModal";
import { GiftCardDetailsModal } from "@/components/dashboard/settings/GiftCardDetailsModal";
import { Mail, Trash2 } from "lucide-react";


export default function GiftCardsPage() {
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [giftCards, setGiftCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedCard, setSelectedCard] = useState<any>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [deactivatingId, setDeactivatingId] = useState<string | null>(null);


    const fetchGiftCards = async () => {
        if (!currentLocation) return;
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("gift_cards")
                .select("*")
                .eq("location_id", currentLocation.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setGiftCards(data || []);
        } catch (err: any) {
            toast.error("Failed to fetch gift cards");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGiftCards();
    }, [currentLocation?.id]);

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    const handleDeactivate = async (card: any) => {
        if (!confirm(`Are you sure you want to deactivate card ${card.card_number}? This cannot be undone.`)) return;

        setDeactivatingId(card.id);
        try {
            const supabase = createClient();
            const { error } = await (supabase
                .from("gift_cards") as any)
                .update({ is_active: false })
                .eq("id", card.id);

            if (error) throw error;
            toast.success("Gift card deactivated");
            fetchGiftCards();
        } catch (err) {
            console.error("Deactivation error:", err);
            toast.error("Failed to deactivate card.");
        } finally {
            setDeactivatingId(null);
        }
    };

    const filteredCards = giftCards.filter(card =>
        card.card_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!currentLocation) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <CreditCard className="h-8 w-8 text-orange-500" />
                        Gift Cards
                    </h1>
                    <p className="text-slate-400 mt-1">Manage balances, issue new cards, and migrate existing ones</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="btn btn-secondary"
                    >
                        <FileUp className="h-4 w-4" />
                        Migrate Existing
                    </button>
                    <button
                        onClick={() => setShowIssueModal(true)}
                        className="btn btn-primary"
                    >
                        <Plus className="h-4 w-4" />
                        Issue New Card
                    </button>

                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                    <p className="text-sm text-slate-500">Active Cards</p>
                    <p className="text-2xl font-bold">{giftCards.filter(c => c.is_active).length}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-slate-500">Total Liability</p>
                    <p className="text-2xl font-bold text-orange-500">
                        {formatCurrency(giftCards.reduce((sum, c) => sum + (c.current_balance || 0), 0))}
                    </p>
                </div>
                <div className="card">
                    <p className="text-sm text-slate-500">Cards Issued (MTD)</p>
                    <p className="text-2xl font-bold">
                        {giftCards.filter(c => {
                            const date = new Date(c.created_at);
                            const now = new Date();
                            return date.getMonth() === now.getMonth() &&
                                date.getFullYear() === now.getFullYear();
                        }).length}
                    </p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search card number..."
                        className="input pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="btn btn-secondary">
                    <Filter className="h-4 w-4" />
                    Filters
                </button>
                <button className="btn btn-secondary" onClick={() => {
                    // Export to CSV
                    const headers = ["Card Number", "Status", "Balance", "Original Balance", "Created At"];
                    const csv = [
                        headers.join(","),
                        ...giftCards.map(c => [
                            c.card_number,
                            c.is_active ? "Active" : "Inactive",
                            c.current_balance,
                            c.original_balance,
                            c.created_at
                        ].join(","))
                    ].join("\n");
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.setAttribute('hidden', '');
                    a.setAttribute('href', url);
                    a.setAttribute('download', 'gift_cards.csv');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }}>
                    <Download className="h-4 w-4" />
                    Export
                </button>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/50">
                                <th className="px-4 py-3">Card Number</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Balance</th>
                                <th className="px-4 py-3 text-slate-600">Original</th>
                                <th className="px-4 py-3">Last Used</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                        Loading gift cards...
                                    </td>
                                </tr>
                            ) : filteredCards.length > 0 ? (
                                filteredCards.map((card) => (
                                    filteredCards.map((card) => (
                                        <tr
                                            key={card.id}
                                            onClick={() => {
                                                setSelectedCard(card);
                                                setShowDetailsModal(true);
                                            }}
                                            className="hover:bg-slate-900/40 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-4 py-3 font-mono font-bold tracking-widest text-orange-400">
                                                **** **** **** {card.card_number.slice(-4)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {card.is_active ? (
                                                    <span className="badge bg-green-500/10 text-green-500 border-none flex items-center gap-1 w-fit">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-red-500/10 text-red-500 border-none flex items-center gap-1 w-fit">
                                                        <XCircle className="h-3 w-3" />
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {card.metadata?.is_digital ? (
                                                    <span className="badge bg-purple-500/10 text-purple-400 border-none flex items-center gap-1 w-fit text-[10px] font-bold uppercase">
                                                        <Smartphone className="h-3 w-3" />
                                                        Digital
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-slate-500/10 text-slate-400 border-none flex items-center gap-1 w-fit text-[10px] font-bold uppercase">
                                                        <CreditCard className="h-3 w-3" />
                                                        Physical
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 font-bold">{formatCurrency(card.current_balance)}</td>
                                            <td className="px-4 py-3 text-slate-500">{formatCurrency(card.original_balance)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-400">
                                                {card.last_used_at ? new Date(card.last_used_at).toLocaleDateString() : "Never"}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="relative inline-block text-left">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(openMenuId === card.id ? null : card.id);
                                                        }}
                                                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>

                                                    {openMenuId === card.id && (
                                                        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedCard(card);
                                                                    setShowEmailModal(true);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="flex items-center w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                                            >
                                                                <Mail className="h-4 w-4 mr-3 text-orange-500" />
                                                                Email Customer
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Future implementation
                                                                    toast("Feature coming soon");
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="flex items-center w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                                            >
                                                                <History className="h-4 w-4 mr-3 text-slate-500" />
                                                                View History
                                                            </button>
                                                            <div className="h-px bg-slate-800 mx-2 my-1" />
                                                            <button
                                                                disabled
                                                                className="flex items-center w-full px-4 py-2.5 text-sm text-red-500/50 cursor-not-allowed transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-3" />
                                                                Deactivate Card
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-4">
                                            <CreditCard className="h-12 w-12 text-slate-700 mx-auto" />
                                            <div>
                                                <h3 className="font-bold text-slate-300">No gift cards found</h3>
                                                <p className="text-sm text-slate-500">Issue a new card or migrate existing ones to get started.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <GiftCardUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                locationId={currentLocation.id}
                onComplete={fetchGiftCards}
            />

            <IssueGiftCardModal
                isOpen={showIssueModal}
                onClose={() => setShowIssueModal(false)}
                locationId={currentLocation.id}
                onComplete={fetchGiftCards}
            />

            {selectedCard && (
                <>
                    <EmailGiftCardModal
                        isOpen={showEmailModal}
                        onClose={() => {
                            setShowEmailModal(false);
                            setSelectedCard(null);
                        }}
                        card={selectedCard}
                        locationId={currentLocation.id}
                    />
                    <GiftCardDetailsModal
                        isOpen={showDetailsModal}
                        onClose={() => {
                            setShowDetailsModal(false);
                            setSelectedCard(null);
                        }}
                        card={selectedCard}
                        locationId={currentLocation.id}
                    />
                </>
            )}

        </div >
    );
}
