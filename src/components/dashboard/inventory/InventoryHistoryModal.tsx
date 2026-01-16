"use client";

import { useState, useEffect, useMemo } from "react";
import {
    X,
    ChevronRight,
    ChevronDown,
    Loader2,
    Calendar,
    ArrowLeft,
    FileText,
    TrendingDown,
    TrendingUp,
    Minus,
    Download,
    Package,
    AlertTriangle,
    User
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

interface SessionGroup {
    date: string;
    sessions: any[];
    totalItems: number;
    totalVarianceValue: number;
}

export default function InventoryHistoryModal({ isOpen, onClose, locationId }: InventoryHistoryModalProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [counts, setCounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [countsLoading, setCountsLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchSessions();
            setSelectedSession(null);
            setExpandedDates(new Set());
        }
    }, [isOpen]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await (supabase
                .from("physical_inventory_sessions") as any)
                .select("*, storage_area:inventory_storage_areas(name), recorded_by_user:recorded_by(email)")
                .eq("location_id", locationId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setSessions(data || []);

            // Auto-expand the most recent date
            if (data && data.length > 0) {
                const mostRecentDate = format(new Date(data[0].created_at), "yyyy-MM-dd");
                setExpandedDates(new Set([mostRecentDate]));
            }
        } catch (err: any) {
            toast.error("Failed to fetch history: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Group sessions by date
    const groupedSessions = useMemo(() => {
        const groups: Map<string, SessionGroup> = new Map();

        sessions.forEach(session => {
            const dateKey = format(new Date(session.created_at), "yyyy-MM-dd");

            if (!groups.has(dateKey)) {
                groups.set(dateKey, {
                    date: dateKey,
                    sessions: [],
                    totalItems: 0,
                    totalVarianceValue: 0
                });
            }

            groups.get(dateKey)!.sessions.push(session);
        });

        return Array.from(groups.values());
    }, [sessions]);

    const toggleDateExpanded = (date: string) => {
        const newExpanded = new Set(expandedDates);
        if (newExpanded.has(date)) {
            newExpanded.delete(date);
        } else {
            newExpanded.add(date);
        }
        setExpandedDates(newExpanded);
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

    const exportSessionToCSV = () => {
        if (!selectedSession || counts.length === 0) return;

        setExporting(true);
        try {
            const headers = ["Item Name", "Storage Area", "Unit", "Recorded (Actual)", "Theoretical (System)", "Variance", "Value Impact"];

            const rows = counts.map(count => {
                const varAtomic = Number(count.variance_atomic || 0);
                const conv = Number(count.conversion_at_recording || 1);
                const varDisplay = varAtomic / conv;
                const impact = (varAtomic / (Number(count.item?.units_per_stock || 1) * conv)) * Number(count.item?.cost_per_unit || 0);

                return [
                    `"${count.item?.name || 'Unknown'}"`,
                    `"${selectedSession.storage_area?.name || 'Unassigned'}"`,
                    `"${count.item?.unit || ''}"`,
                    Number(count.recorded_quantity).toFixed(2),
                    (Number(count.theoretical_quantity) / conv).toFixed(2),
                    varDisplay.toFixed(2),
                    impact.toFixed(2)
                ];
            });

            const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            const areaName = (selectedSession.storage_area?.name || 'unassigned').replace(/\s+/g, '_').toLowerCase();
            const dateStr = format(new Date(selectedSession.created_at), 'yyyy-MM-dd');

            link.setAttribute("href", url);
            link.setAttribute("download", `inventory_session_${dateStr}_${areaName}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Session exported successfully!");
        } catch (err: any) {
            toast.error("Export failed: " + err.message);
        } finally {
            setExporting(false);
        }
    };

    // Calculate variance severity
    const getVarianceSeverity = (varAtomic: number, theoreticalQty: number) => {
        if (varAtomic === 0 || theoreticalQty === 0) return 'none';
        const percentVariance = Math.abs(varAtomic / theoreticalQty) * 100;
        if (percentVariance >= 10) return 'high';
        if (percentVariance >= 5) return 'medium';
        return 'low';
    };

    // Calculate session summary stats
    const sessionStats = useMemo(() => {
        if (counts.length === 0) return { totalItems: 0, netVariance: 0, highVarianceCount: 0 };

        let netVariance = 0;
        let highVarianceCount = 0;

        counts.forEach(count => {
            const varAtomic = Number(count.variance_atomic || 0);
            const conv = Number(count.conversion_at_recording || 1);
            const impact = (varAtomic / (Number(count.item?.units_per_stock || 1) * conv)) * Number(count.item?.cost_per_unit || 0);
            netVariance += impact;

            const severity = getVarianceSeverity(varAtomic, Number(count.theoretical_quantity || 0));
            if (severity === 'high') highVarianceCount++;
        });

        return {
            totalItems: counts.length,
            netVariance,
            highVarianceCount
        };
    }, [counts]);

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
                                    : "Browse past inventory counts grouped by date"
                                }
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedSession && counts.length > 0 && (
                            <button
                                onClick={exportSessionToCSV}
                                disabled={exporting}
                                className="btn btn-secondary"
                            >
                                {exporting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4" />
                                )}
                                Export Session
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>
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
                            <div className="space-y-4">
                                {groupedSessions.map(group => (
                                    <div key={group.date} className="border border-slate-800 rounded-2xl overflow-hidden">
                                        {/* Date Header - Clickable to expand/collapse */}
                                        <button
                                            onClick={() => toggleDateExpanded(group.date)}
                                            className="w-full p-5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                                    <Calendar className="h-6 w-6 text-orange-500" />
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-bold text-lg">
                                                        {format(new Date(group.date), "EEEE, MMMM d, yyyy")}
                                                    </h4>
                                                    <p className="text-sm text-slate-400 mt-0.5">
                                                        {group.sessions.length} storage area{group.sessions.length !== 1 ? 's' : ''} counted
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <ChevronDown
                                                    className={cn(
                                                        "h-5 w-5 text-slate-400 transition-transform",
                                                        expandedDates.has(group.date) && "rotate-180"
                                                    )}
                                                />
                                            </div>
                                        </button>

                                        {/* Expanded Sessions */}
                                        {expandedDates.has(group.date) && (
                                            <div className="p-4 bg-slate-900/50 border-t border-slate-800 space-y-2">
                                                {group.sessions.map(session => (
                                                    <button
                                                        key={session.id}
                                                        onClick={() => fetchSessionCounts(session)}
                                                        className="w-full p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-orange-500/30 transition-all text-left flex items-center justify-between group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                                                <Package className="h-5 w-5 text-slate-400" />
                                                            </div>
                                                            <div>
                                                                <h5 className="font-bold group-hover:text-orange-500 transition-colors">
                                                                    {session.storage_area?.name || "Unassigned Items"}
                                                                </h5>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <span className="text-xs text-slate-500">
                                                                        {format(new Date(session.created_at), "h:mm a")}
                                                                    </span>
                                                                    {session.recorded_by_user?.email && (
                                                                        <span className="flex items-center gap-1 text-xs text-slate-500">
                                                                            <User size={10} />
                                                                            {session.recorded_by_user.email.split('@')[0]}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
                                                                        {session.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center text-xs font-bold text-orange-500 opacity-0 group-hover:opacity-100 transition-all">
                                                            VIEW VARIANCE <ChevronRight size={14} className="ml-1" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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
                                <>
                                    {/* Session Summary Card */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Items Counted</p>
                                            <p className="text-2xl font-bold mt-1">{sessionStats.totalItems}</p>
                                        </div>
                                        <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Net Variance Value</p>
                                            <p className={cn(
                                                "text-2xl font-bold mt-1",
                                                sessionStats.netVariance < 0 ? "text-red-400" : sessionStats.netVariance > 0 ? "text-emerald-400" : "text-slate-300"
                                            )}>
                                                {sessionStats.netVariance < 0 ? "-" : sessionStats.netVariance > 0 ? "+" : ""}
                                                {formatCurrency(Math.abs(sessionStats.netVariance))}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">High Variance Items</p>
                                            <p className={cn(
                                                "text-2xl font-bold mt-1",
                                                sessionStats.highVarianceCount > 0 ? "text-red-400" : "text-slate-300"
                                            )}>
                                                {sessionStats.highVarianceCount}
                                                {sessionStats.highVarianceCount > 0 && (
                                                    <AlertTriangle className="inline ml-2 h-5 w-5" />
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Variance Table */}
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
                                                    const severity = getVarianceSeverity(varAtomic, Number(count.theoretical_quantity || 0));

                                                    return (
                                                        <tr
                                                            key={count.id}
                                                            className={cn(
                                                                "hover:bg-slate-800/20 transition-colors",
                                                                severity === 'high' && varAtomic < 0 && "bg-red-500/5",
                                                                severity === 'medium' && varAtomic < 0 && "bg-yellow-500/5"
                                                            )}
                                                        >
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    {severity === 'high' && varAtomic < 0 && (
                                                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="High variance (>10%)" />
                                                                    )}
                                                                    {severity === 'medium' && varAtomic < 0 && (
                                                                        <span className="w-2 h-2 rounded-full bg-yellow-500" title="Medium variance (5-10%)" />
                                                                    )}
                                                                    <div>
                                                                        <p className="font-bold text-sm">{count.item?.name}</p>
                                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{count.item?.unit}</p>
                                                                    </div>
                                                                </div>
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
                                                                    {varAtomic < 0 ? "-" : ""}
                                                                    {formatCurrency(Math.abs(impact))}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
