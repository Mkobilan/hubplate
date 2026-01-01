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

interface Table {
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
}

export function SeatWaitlistModal({ isOpen, onClose, entry, onSuccess }: SeatWaitlistModalProps) {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [tables, setTables] = useState<Table[]>([]);
    const [occupiedTableLabels, setOccupiedTableLabels] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingTables, setFetchingTables] = useState(false);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);

    useEffect(() => {
        if (isOpen && currentLocation?.id) {
            fetchTables();
            fetchOccupiedTables();
        }
    }, [isOpen, currentLocation?.id]);

    const fetchTables = async () => {
        if (!currentLocation?.id) return;
        setFetchingTables(true);
        try {
            const supabase = createClient();
            // Fetch all active maps for this location
            const { data: maps, error: mapsError } = await (supabase
                .from("seating_maps") as any)
                .select("id")
                .eq("location_id", currentLocation.id)
                .eq("is_active", true);

            if (mapsError) throw mapsError;

            if (maps && maps.length > 0) {
                const mapIds = maps.map((m: any) => m.id);
                const { data, error } = await (supabase
                    .from("seating_tables") as any)
                    .select("id, label, capacity, is_active, object_type")
                    .in("map_id", mapIds)
                    .eq("object_type", "table")
                    .eq("is_active", true)
                    .order("label", { ascending: true });

                if (error) throw error;
                setTables(data || []);
            } else {
                setTables([]);
            }
        } catch (err) {
            console.error("Error fetching tables:", err);
            toast.error("Failed to load tables");
        } finally {
            setFetchingTables(false);
        }
    };

    const fetchOccupiedTables = async () => {
        if (!currentLocation?.id) return;
        try {
            const supabase = createClient();
            const { data, error } = await (supabase
                .from("orders") as any)
                .select("table_number")
                .eq("location_id", currentLocation.id)
                .in("status", ["pending", "in_progress", "ready", "served"]);

            if (error) throw error;
            const labels = (data || []).map((o: any) => o.table_number).filter(Boolean) as string[];
            setOccupiedTableLabels(labels);
        } catch (err) {
            console.error("Error fetching active orders:", err);
        }
    };

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

    const availableTables = tables.filter(t => !occupiedTableLabels.includes(t.label));

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
                    {fetchingTables ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        </div>
                    ) : availableTables.length === 0 ? (
                        <div className="text-center py-8 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                            <Armchair className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">No tables available</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {availableTables.map((table) => (
                                <button
                                    key={table.id}
                                    onClick={() => setSelectedTable(table)}
                                    className={cn(
                                        "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1",
                                        selectedTable?.id === table.id
                                            ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20"
                                            : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                                    )}
                                >
                                    <span className="font-bold text-sm">{table.label}</span>
                                    <span className="text-[10px] opacity-70 flex items-center gap-0.5">
                                        <Users className="h-2 w-2" />
                                        {table.capacity}
                                    </span>
                                </button>
                            ))}
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
