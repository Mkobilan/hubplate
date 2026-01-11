"use client";

import { useState, useEffect } from "react";
import {
    X,
    ChevronRight,
    Loader2,
    Calendar,
    ArrowLeft,
    FileText,
    TrendingDown,
    TrendingUp,
    Minus
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface InventoryHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
}

export default function InventoryHistoryModal({ isOpen, onClose, locationId }: InventoryHistoryModalProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [counts, setCounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [countsLoading, setCountsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSessions();
        }
    }, [isOpen]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await (supabase
                .from("physical_inventory_sessions") as any)
                .select("*, storage_area:inventory_storage_areas(name)")
                .eq("location_id", locationId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setSessions(data || []);
        } catch (err: any) {
            toast.error("Failed to fetch history: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionCounts = async (session: any) => {
        setSelectedSession(session);
        setCountsLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await (supabase
                .from("physical_inventory_counts") as any)
                .select("*, item:inventory_items(name, unit, cost_per_unit, units_per_stock)")
                .eq("session_id", session.id)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setCounts(data || []);
        } catch (err: any) {
            toast.error("Failed to fetch details: " + err.message);
        } finally {
            setCountsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        {selectedSession && (
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold">Inventory Recordings</h2>
                            <p className="text-sm text-slate-400">
                                {selectedSession
                                    ? `Variance for ${selectedSession.storage_area?.name || "Unassigned Items"} on ${format(new Date(selectedSession.created_at), "MMM d, yyyy")}`
                                    : "Browse past inventory counts and view variances"
                                }
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
                    {!selectedSession ? (
                        loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                                <p className="text-slate-500 font-medium">Loading history...</p>
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-3xl bg-slate-800/20">
                                <Calendar className="h-12 w-12 mb-4 opacity-10" />
                                <p className="font-medium">No inventory sessions recorded yet.</p>
                                <p className="text-sm">Click "Take Inventory" to start your first count.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sessions.map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => fetchSessionCounts(session)}
                                        className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-800 hover:border-orange-500/30 transition-all text-left flex items-start justify-between group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                                <FileText className="h-6 w-6 text-orange-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg group-hover:text-orange-500 transition-colors">
                                                    {session.storage_area?.name || "Unassigned Items"}
                                                </h4>
                                                <p className="text-sm text-slate-400 mt-1">
                                                    Recorded on {format(new Date(session.created_at), "MMMM d, yyyy h:mm a")}
                                                </p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
                                                        {session.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="self-center">
                                            <div className="flex items-center text-xs font-bold text-orange-500 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                SEE VARIANCE <ChevronRight size={14} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="space-y-4">
                            {countsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                                    <p className="text-slate-500 font-medium">Calculating variance...</p>
                                </div>
                            ) : (
                                <div className="card overflow-hidden !p-0 border-slate-800">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-800/30">
                                                <th className="px-6 py-4">Item Name</th>
                                                <th className="px-6 py-4 text-center">Recorded (Actual)</th>
                                                <th className="px-6 py-4 text-center">Theoretical (System)</th>
                                                <th className="px-6 py-4 text-right">Variance</th>
                                                <th className="px-6 py-4 text-right">Value Impact</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {counts.map(count => {
                                                const varAtomic = Number(count.variance_atomic || 0);
                                                const conv = Number(count.conversion_at_recording || 1);
                                                const varDisplay = varAtomic / conv;
                                                const impact = (varAtomic / (Number(count.item?.units_per_stock || 1) * conv)) * Number(count.item?.cost_per_unit || 0);

                                                return (
                                                    <tr key={count.id} className="hover:bg-slate-800/20 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <p className="font-bold text-sm">{count.item?.name}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{count.item?.unit}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="font-mono text-sm bg-slate-800 px-2 py-1 rounded border border-slate-700">
                                                                {Number(count.recorded_quantity).toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="font-mono text-sm text-slate-400">
                                                                {(Number(count.theoretical_quantity) / conv).toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className={cn(
                                                                "flex items-center justify-end gap-1 font-bold",
                                                                varAtomic > 0 ? "text-emerald-400" : varAtomic < 0 ? "text-red-400" : "text-slate-500"
                                                            )}>
                                                                {varAtomic > 0 ? <TrendingUp size={14} /> : varAtomic < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                                                                {varDisplay > 0 ? "+" : ""}{varDisplay.toFixed(2)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={cn(
                                                                "text-sm font-medium",
                                                                varAtomic < 0 ? "text-red-400" : "text-slate-300"
                                                            )}>
                                                                {formatCurrency(Math.abs(impact))}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
