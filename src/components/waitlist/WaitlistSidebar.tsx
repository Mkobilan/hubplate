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
    Minus,
    Mail
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { WaitlistEntry } from "@/types/database";
import { AddWaitlistModal } from "./AddWaitlistModal";
import { SeatWaitlistModal } from "./SeatWaitlistModal";

interface Table {
    id: string;
    label: string;
    capacity: number;
    is_active: boolean;
}


interface WaitlistSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    tables: Table[];
    occupiedTableLabels: string[];
}

export function WaitlistSidebar({ isOpen, onClose, tables, occupiedTableLabels }: WaitlistSidebarProps) {
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
                .select("*")
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
            toast.success("Guest marked as seated");
            fetchWaitlist();
        } catch (err) {
            console.error("Error seating guest:", err);
            toast.error("Failed to seat guest");
        }
    };

    return (
        <>
            <div
                className={cn(
                    "fixed inset-y-0 right-0 w-80 bg-slate-950 border-l border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <Hourglass className="h-5 w-5 text-orange-500" />
                        <h2 className="text-lg font-bold text-white">{t("waitlist.title")}</h2>
                        <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {entries.length}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Actions */}
                <div className="p-4">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                    >
                        <Plus className="h-4 w-4" />
                        {t("waitlist.addCustomer")}
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                            <p className="text-slate-500 text-xs">Loading waitlist...</p>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-60 text-center p-6 space-y-3">
                            <div className="bg-slate-900 p-4 rounded-full border border-slate-800">
                                <Users className="h-6 w-6 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">No one waiting</p>
                                <p className="text-slate-500 text-xs mt-1">Add guests to see them here</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/50">
                            {entries.map((entry) => (
                                <div
                                    key={entry.id}
                                    onClick={() => {
                                        setSelectedEntry(entry);
                                        setIsSeatModalOpen(true);
                                    }}
                                    className="p-4 hover:bg-slate-900/50 transition-all group cursor-pointer border-l-2 border-transparent hover:border-orange-600"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <p className="text-white font-bold group-hover:text-orange-500 transition-colors uppercase tracking-tight">
                                                {entry.customer_name}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium">
                                                    <Users className="h-3 w-3 text-blue-400" />
                                                    {entry.party_size}
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium">
                                                    <Clock className="h-3 w-3 text-orange-400" />
                                                    {entry.estimated_wait_minutes} min
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-500 font-mono">
                                                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: false })}
                                            </p>
                                            <div className="flex items-center justify-end gap-2 mt-2">
                                                {entry.customer_email && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const handleSendEmail = async () => {
                                                                const toastId = toast.loading("Sending email...");
                                                                try {
                                                                    const response = await fetch("/api/waitlist/email", {
                                                                        method: "POST",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({ waitlistId: entry.id }),
                                                                    });

                                                                    if (!response.ok) throw new Error("Failed to send email");

                                                                    toast.success("Email sent successfully", { id: toastId });
                                                                } catch (err) {
                                                                    console.error("Error sending email:", err);
                                                                    toast.error("Failed to send email", { id: toastId });
                                                                }
                                                            };
                                                            handleSendEmail();
                                                        }}
                                                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-1 rounded transition-colors"
                                                        title="Send Table Ready Email"
                                                    >
                                                        <Mail className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEntry(entry);
                                                        setIsSeatModalOpen(true);
                                                    }}
                                                    className="bg-slate-800 hover:bg-orange-600 text-slate-300 hover:text-white px-3 py-1 rounded text-[10px] font-black transition-all flex items-center gap-1"
                                                >
                                                    SEAT <ChevronRight className="h-2 w-2" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

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
                tables={tables}
                occupiedTableLabels={occupiedTableLabels}
            />
        </>
    );
}
