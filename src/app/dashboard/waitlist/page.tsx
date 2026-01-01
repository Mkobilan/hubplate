"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import {
    Clock,
    Users,
    Search,
    Plus,
    MoreVertical,
    Check,
    X,
    Loader2,
    Hourglass,
    Phone,
    Calendar,
    ChevronRight
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { AddWaitlistModal } from "@/components/waitlist/AddWaitlistModal";
import { SeatWaitlistModal } from "@/components/waitlist/SeatWaitlistModal";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface WaitlistEntry {
    id: string;
    customer_name: string;
    customer_phone: string;
    party_size: number;
    status: 'waiting' | 'seated' | 'cancelled' | 'no_show';
    notes: string;
    estimated_wait_minutes: number;
    created_at: string;
    seated_at: string | null;
}

export default function WaitlistPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("waiting");

    const fetchWaitlist = async () => {
        if (!currentLocation?.id) return;

        try {
            const supabase = createClient();
            const { data, error } = await (supabase
                .from("waitlist") as any)
                .select("*")
                .eq("location_id", currentLocation.id)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setEntries(data || []);
        } catch (err) {
            console.error("Error fetching waitlist:", err);
            toast.error("Failed to load waitlist");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWaitlist();

        // Subscribe to real-time updates
        if (currentLocation?.id) {
            const supabase = createClient();
            const channel = supabase
                .channel('waitlist-updates')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'waitlist',
                        filter: `location_id=eq.${currentLocation.id}`
                    },
                    () => fetchWaitlist()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [currentLocation?.id]);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            const supabase = createClient();
            const updates: any = { status: newStatus };
            if (newStatus === 'seated') {
                updates.seated_at = new Date().toISOString();
            }

            const { error } = await (supabase
                .from("waitlist") as any)
                .update(updates)
                .eq("id", id);

            if (error) throw error;
            toast.success(`Entry marked as ${newStatus}`);
            fetchWaitlist();
        } catch (err) {
            console.error("Error updating waitlist status:", err);
            toast.error("Failed to update status");
        }
    };

    const filteredEntries = entries.filter(entry => {
        const matchesSearch = entry.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.customer_phone.includes(searchQuery);
        const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const activeEntries = entries.filter(e => e.status === 'waiting');
    const avgWait = activeEntries.length > 0
        ? Math.round(activeEntries.reduce((acc, curr) => acc + curr.estimated_wait_minutes, 0) / activeEntries.length)
        : 0;

    return (
        <div className="flex flex-col h-full bg-slate-950 p-6 space-y-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">{t("waitlist.title")}</h1>
                    <p className="text-slate-400 text-sm">Manage your guest queue and wait times</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                >
                    <Plus className="h-4 w-4" />
                    {t("waitlist.addCustomer")}
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="bg-blue-500/20 p-3 rounded-lg">
                        <Users className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Waiting Parties</p>
                        <p className="text-2xl font-bold text-white">{activeEntries.length}</p>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="bg-orange-500/20 p-3 rounded-lg">
                        <Clock className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Avg. Wait Time</p>
                        <p className="text-2xl font-bold text-white">{avgWait} mins</p>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="bg-green-500/20 p-3 rounded-lg">
                        <Check className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Seated Today</p>
                        <p className="text-2xl font-bold text-white">
                            {entries.filter(e => e.status === 'seated').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/30 p-4 rounded-xl border border-slate-800">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-700 w-full md:w-auto overflow-x-auto">
                    {['waiting', 'seated', 'cancelled', 'all'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap capitalize",
                                statusFilter === status
                                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/10"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Waitlist View */}
            <div className="flex-1 bg-slate-900/30 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                            <p className="text-slate-400 text-sm">Loading waitlist...</p>
                        </div>
                    ) : filteredEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center p-6">
                            <div className="bg-slate-800/50 p-4 rounded-full">
                                <Hourglass className="h-8 w-8 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">No entries found</h3>
                                <p className="text-slate-500 text-sm mt-1">{t("waitlist.noEntries")}</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors"
                            >
                                + {t("waitlist.addCustomer")}
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {filteredEntries.map((entry, index) => (
                                <div
                                    key={entry.id}
                                    onClick={() => {
                                        if (entry.status === 'waiting') {
                                            setSelectedEntry(entry);
                                            setIsSeatModalOpen(true);
                                        }
                                    }}
                                    className={cn(
                                        "p-4 hover:bg-slate-800/30 transition-colors group relative",
                                        entry.status === 'waiting' && "cursor-pointer"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="flex-shrink-0 w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-orange-400 font-bold">
                                                {entry.status === 'waiting' ? index + 1 : <Check className="h-5 w-5" />}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                                                <div className="col-span-1">
                                                    <p className="text-white font-semibold text-base truncate">{entry.customer_name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 text-slate-400">
                                                        <Phone className="h-3 w-3" />
                                                        <span className="text-xs truncate">{entry.customer_phone || "No phone"}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-slate-500" />
                                                    <span className="text-slate-300 text-sm font-medium">{entry.party_size} People</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-slate-500" />
                                                    <span className="text-slate-300 text-sm">{entry.estimated_wait_minutes} mins</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-slate-500" />
                                                    <span className="text-slate-400 text-xs">
                                                        Asked at {format(new Date(entry.created_at), "h:mm a")}
                                                        <span className="hidden md:inline"> ({formatDistanceToNow(new Date(entry.created_at))} ago)</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {entry.status === 'waiting' && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedEntry(entry);
                                                            setIsSeatModalOpen(true);
                                                        }}
                                                        className="bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white p-2 rounded-lg transition-all border border-green-500/20"
                                                        title="Seat Now"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpdateStatus(entry.id, 'cancelled');
                                                        }}
                                                        className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white p-2 rounded-lg transition-all border border-red-500/20"
                                                        title="Cancel Entry"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                            {entry.status !== 'waiting' && (
                                                <span className={cn(
                                                    "text-[10px] uppercase font-bold px-2 py-1 rounded-full",
                                                    entry.status === 'seated' ? "bg-green-500/20 text-green-400" :
                                                        entry.status === 'cancelled' ? "bg-red-500/20 text-red-400" :
                                                            "bg-slate-700 text-slate-400"
                                                )}>
                                                    {entry.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {entry.notes && (
                                        <div className="mt-2 ml-14 p-2 bg-slate-900/50 rounded-lg border border-slate-800">
                                            <p className="text-xs text-slate-400 italic">"{entry.notes}"</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AddWaitlistModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchWaitlist}
            />

            <SeatWaitlistModal
                isOpen={isSeatModalOpen}
                onClose={() => {
                    setIsSeatModalOpen(false);
                    setSelectedEntry(null);
                }}
                entry={selectedEntry}
                onSuccess={fetchWaitlist}
            />
        </div>
    );
}
