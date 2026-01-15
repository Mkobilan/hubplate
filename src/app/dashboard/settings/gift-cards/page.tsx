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


export default function GiftCardsPage() {
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [giftCards, setGiftCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);


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

    const filteredCards = giftCards.filter(card =>
        card.card_number.includes(searchQuery)
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
                    <p className="text-2xl font-bold">12</p>
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
                <button className="btn btn-secondary">
                    <Download className="h-4 w-4" />
                    Export
                </button>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/50">
                            <th className="px-4 py-3">Card Number</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Balance</th>
                            <th className="px-4 py-3">Original</th>
                            <th className="px-4 py-3">Last Used</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                    Loading gift cards...
                                </td>
                            </tr>
                        ) : filteredCards.length > 0 ? (
                            filteredCards.map((card) => (
                                <tr key={card.id} className="hover:bg-slate-900/40 transition-colors group">
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
                                        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-4 py-20 text-center">
                                    <div className="max-w-xs mx-auto space-y-4">
                                        <CreditCard className="h-12 w-12 text-slate-700 mx-auto" />
                                        <div>
                                            <h3 className="font-bold">No gift cards found</h3>
                                            <p className="text-sm text-slate-500">Issue a new card or migrate existing ones to get started.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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

        </div >
    );
}
