"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { WaitlistEntry } from "@/types/database";
import {
    Users,
    Check,
    Loader2,
    Armchair,
    User
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export interface Table {
    id: string;
    label: string;
    capacity: number;
    is_active: boolean;
}

interface SeatWaitlistModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: WaitlistEntry | null;
    onSuccess: () => void;
    tables: Table[];
    occupiedTableLabels: string[];
}

export function SeatWaitlistModal({ isOpen, onClose, entry, onSuccess, tables, occupiedTableLabels }: SeatWaitlistModalProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);

    const handleSeatGuest = async () => {
        if (!entry || !selectedTable) return;

        setLoading(true);
        try {
            const supabase = createClient();
            const { error } = await (supabase
                .from("waitlist") as any)
                .update({
                    status: 'seated',
                    table_id: selectedTable.id,
                    table_label: selectedTable.label,
                    seated_at: new Date().toISOString()
                })
                .eq("id", entry.id);

            if (error) throw error;
            toast.success(`${entry.customer_name} seated at Table ${selectedTable.label}`);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error seating guest:", err);
            const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err));
            toast.error(`Failed to seat guest: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    if (!entry) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t("waitlist.seatGuest")}
            className="max-w-md"
        >
            <div className="space-y-6">
                {/* Guest Info */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <User className="h-4 w-4 text-orange-500" />
                            {entry.customer_name}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Party of {entry.party_size}
                        </p>
                    </div>
                </div>

                {/* Table Selection */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-400 block px-1">
                        {t("waitlist.chooseTable")}
                    </label>
                    {tables.length === 0 ? (
                        <div className="text-center py-8 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                            <Armchair className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">No tables available</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {tables.map((table) => {
                                const isOccupied = occupiedTableLabels.includes(table.label);
                                return (
                                    <button
                                        key={table.id}
                                        onClick={() => !isOccupied && setSelectedTable(table)}
                                        disabled={isOccupied}
                                        className={cn(
                                            "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 relative overflow-hidden",
                                            selectedTable?.id === table.id
                                                ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20"
                                                : isOccupied
                                                    ? "bg-red-500/10 border-red-500/30 text-red-400 cursor-not-allowed opacity-70"
                                                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                                        )}
                                    >
                                        <span className="font-bold text-sm">{table.label}</span>
                                        <span className={cn(
                                            "text-[10px] flex items-center gap-0.5",
                                            isOccupied ? "text-red-400" : "opacity-70"
                                        )}>
                                            {isOccupied ? "Occupied" : (
                                                <>
                                                    <Users className="h-2 w-2" />
                                                    {table.capacity}
                                                </>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!selectedTable || loading}
                        onClick={handleSeatGuest}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {t("waitlist.sitPerson")}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
