"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import {
    Clock,
    Users,
    X,
    Loader2,
    Hourglass,
    Check,
    ChevronRight,
    Plus,
    Minus
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { AddWaitlistModal } from "./AddWaitlistModal";
import { SeatWaitlistModal } from "./SeatWaitlistModal";

interface WaitlistEntry {
    id: string;
    customer_name: string;
    party_size: number;
    status: 'waiting' | 'seated' | 'cancelled';
    estimated_wait_minutes: number;
    created_at: string;
}

interface WaitlistSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WaitlistSidebar({ isOpen, onClose }: WaitlistSidebarProps) {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);

    const fetchWaitlist = async () => {
        if (!currentLocation?.id) return;

        try {
            const supabase = createClient();
            const { data, error } = await (supabase
                .from("waitlist") as any)
                .select("id, customer_name, party_size, status, estimated_wait_minutes, created_at")
                .eq("location_id", currentLocation.id)
                .eq("status", "waiting")
                .order("created_at", { ascending: true });

            if (error) throw error;
            setEntries(data || []);
        } catch (err) {
            console.error("Error fetching waitlist:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchWaitlist();

            const supabase = createClient();
            const channel = supabase
                .channel('waitlist-sidebar')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'waitlist',
                        filter: `location_id=eq.${currentLocation?.id}`
                    },
                    () => fetchWaitlist()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isOpen, currentLocation?.id]);

    const handleSeat = async (id: string) => {
        try {
            const supabase = createClient();
            const { error } = await (supabase
                .from("waitlist") as any)
                .update({
                    status: 'seated',
                    seated_at: new Date().toISOString()
                })
                .eq("id", id);

            if (error) throw error;
            toast.success("Guest seated!");
            fetchWaitlist();
        } catch (err) {
            toast.error("Failed to seat guest");
        }
    };

    return (
        <div className={cn(
            "fixed top-0 right-0 h-full bg-slate-900 border-l border-slate-800 shadow-2xl transition-all duration-300 z-50 flex flex-col",
            isOpen ? "w-80 translate-x-0" : "w-0 translate-x-full"
        )}>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <Hourglass className="h-5 w-5 text-orange-500" />
                    <h2 className="font-bold text-white tracking-tight">{t("waitlist.title")}</h2>
                    <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {entries.length}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Actions */}
            <div className="p-3 border-b border-slate-800">
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    {t("waitlist.addCustomer")}
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                        <span className="text-xs text-slate-500">Updating...</span>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="bg-slate-800/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Users className="h-6 w-6 text-slate-600" />
                        </div>
                        <p className="text-slate-400 text-sm">Waitlist is empty</p>
                    </div>
                ) : (
                    entries.map((entry, index) => (
                        <div
                            key={entry.id}
                            onClick={() => {
                                setSelectedEntry(entry);
                                setIsSeatModalOpen(true);
                            }}
                            className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors group cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h3 className="text-white font-semibold text-sm leading-tight truncate w-32">
                                        {entry.customer_name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <Users className="h-3 w-3" />
                                            {entry.party_size}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-orange-400">
                                            <Clock className="h-3 w-3" />
                                            {entry.estimated_wait_minutes}m
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                    #{index + 1}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                                <span className="text-[10px] text-slate-500">
                                    {formatDistanceToNow(new Date(entry.created_at))} ago
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEntry(entry);
                                        setIsSeatModalOpen(true);
                                    }}
                                    className="bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 border border-green-500/20"
                                >
                                    <Check className="h-3 w-3" />
                                    SEAT
                                </button>
                            </div>
                        </div>
                    ))
                )}
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
