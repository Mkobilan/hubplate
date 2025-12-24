"use client";

import { useState, useEffect } from "react";
import {
    X,
    Calendar,
    Clock,
    Activity,
    ChevronRight,
    Loader2,
    CalendarDays,
    ArrowRight
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface TimeEntry {
    id: string;
    clock_in: string;
    clock_out: string | null;
    break_minutes: number;
    total_hours: number;
    date?: string; // Derived from clock_in
}

interface HoursWorkedModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
}

export function HoursWorkedModal({ isOpen, onClose, employeeId }: HoursWorkedModalProps) {
    const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd"));
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalHours, setTotalHours] = useState(0);

    const supabase = createClient();

    const fetchEntries = async () => {
        if (!isOpen || !employeeId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("time_entries")
                .select("*")
                .eq("employee_id", employeeId)
                .gte("clock_in", `${startDate}T00:00:00`)
                .lte("clock_in", `${endDate}T23:59:59`)
                .order("clock_in", { ascending: false }) as { data: TimeEntry[] | null, error: any };

            if (error) throw error;

            setEntries(data || []);
            const total = (data || []).reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
            setTotalHours(total);
        } catch (err) {
            console.error("Error fetching time entries:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchEntries();
        }
    }, [isOpen, startDate, endDate, employeeId]);

    const handleQuickFilter = (type: "this-week" | "last-week" | "this-month") => {
        const now = new Date();
        let start, end;

        switch (type) {
            case "this-week":
                start = startOfWeek(now, { weekStartsOn: 0 });
                end = endOfWeek(now, { weekStartsOn: 0 });
                break;
            case "last-week":
                const lastWeek = subWeeks(now, 1);
                start = startOfWeek(lastWeek, { weekStartsOn: 0 });
                end = endOfWeek(lastWeek, { weekStartsOn: 0 });
                break;
            case "this-month":
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
        }

        setStartDate(format(start, "yyyy-MM-dd"));
        setEndDate(format(end, "yyyy-MM-dd"));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-lg animate-slide-up shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
                            <Activity className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white leading-none">Hours Worked</h2>
                            <p className="text-slate-400 text-sm mt-1">View your time records</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Date Range Selection */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-500 font-medium ml-1">Start</span>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all hover:bg-slate-800/80"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-500 font-medium ml-1">End</span>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all hover:bg-slate-800/80"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Quick Filters */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleQuickFilter("this-week")}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-700"
                            >
                                This Week
                            </button>
                            <button
                                onClick={() => handleQuickFilter("last-week")}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-700"
                            >
                                Last Week
                            </button>
                            <button
                                onClick={() => handleQuickFilter("this-month")}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-700"
                            >
                                This Month
                            </button>
                        </div>
                    </div>

                    {/* Total Hours Card */}
                    <div className="bg-orange-600/10 border border-orange-600/20 rounded-2xl p-6 flex items-center justify-between">
                        <span className="text-slate-300 font-medium">Total Hours</span>
                        <div className="text-right">
                            <span className="text-4xl font-black text-orange-500">{totalHours.toFixed(2)}h</span>
                        </div>
                    </div>

                    {/* Entries List */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            Time Entries
                        </h3>

                        {loading ? (
                            <div className="py-10 flex flex-col items-center justify-center text-slate-500">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-2" />
                                <p className="text-xs">Fetching records...</p>
                            </div>
                        ) : entries.length > 0 ? (
                            <div className="space-y-3">
                                {entries.map((entry) => (
                                    <div key={entry.id} className="bg-slate-900/40 border border-slate-800 px-4 py-3 rounded-xl flex items-center justify-between group hover:border-slate-700 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex flex-col items-center justify-center">
                                                <span className="text-[10px] font-bold text-slate-500 leading-none">{format(parseISO(entry.clock_in), "MMM")}</span>
                                                <span className="text-sm font-black text-white">{format(parseISO(entry.clock_in), "d")}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-white font-bold">{format(parseISO(entry.clock_in), "h:mm a")}</span>
                                                    <ArrowRight className="h-3 w-3 text-slate-600" />
                                                    <span className="text-white font-bold">
                                                        {entry.clock_out ? format(parseISO(entry.clock_out), "h:mm a") : "Active"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <p className="text-[10px] text-slate-500 font-medium uppercase">
                                                        {format(parseISO(entry.clock_in), "EEEE")}
                                                    </p>
                                                    {entry.break_minutes > 0 && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                                                            <p className="text-[10px] text-orange-400 font-bold">
                                                                {entry.break_minutes}m Break
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-white">{entry.total_hours?.toFixed(1)}h</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500">
                                <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                    <Clock className="h-6 w-6 opacity-20" />
                                </div>
                                <p className="text-sm font-medium">No time entries in this range</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800/50 bg-slate-900/20">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-600/20 transition-all active:scale-[0.98]"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
