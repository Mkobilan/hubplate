"use client";

import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { format, isSameDay, addDays, startOfWeek, endOfWeek, eachDayOfInterval, getDay } from "date-fns";
import {
    Clock,
    Check,
    X as XIcon,
    Loader2,
    Save,
    AlertCircle,
    CheckCircle2,
    CalendarDays,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AvailabilityCalendar() {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const [availability, setAvailability] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal State
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [isAvailable, setIsAvailable] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    // Multi-day selection state
    type MultiDayMode = "single" | "week" | "next7" | "recurring4weeks";
    const [multiDayMode, setMultiDayMode] = useState<MultiDayMode>("single");
    const [showMultiDay, setShowMultiDay] = useState(false);

    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const fetchAvailability = async () => {
        if (!currentEmployee) return;
        try {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from("availability")
                .select("*")
                .eq("employee_id", currentEmployee.id);

            if (error) throw error;
            setAvailability(data || []);
        } catch (err) {
            console.error("Error fetching availability:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAvailability();
    }, [currentEmployee?.id]);

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);

        // Find existing availability for this date
        const existing = availability.find(a => a.date === format(date, "yyyy-MM-dd"));

        if (existing) {
            setStartTime(existing.start_time.slice(0, 5));
            setEndTime(existing.end_time.slice(0, 5));
            setIsAvailable(existing.is_available);
        } else {
            // Check for default weekday availability
            const dayOfWeek = date.getDay();
            const defaultAvail = availability.find(a => a.day_of_week === dayOfWeek && !a.date);

            if (defaultAvail) {
                setStartTime(defaultAvail.start_time.slice(0, 5));
                setEndTime(defaultAvail.end_time.slice(0, 5));
                setIsAvailable(defaultAvail.is_available);
            } else {
                setStartTime("09:00");
                setEndTime("17:00");
                setIsAvailable(true);
            }
        }

        // Reset multi-day selection
        setMultiDayMode("single");
        setShowMultiDay(false);
        setIsModalOpen(true);
        setStatus("idle");
    };

    // Calculate dates based on multi-day mode
    const getTargetDates = (): Date[] => {
        if (!selectedDate) return [];

        switch (multiDayMode) {
            case "single":
                return [selectedDate];

            case "week": {
                // Get all days in the selected date's week (Mon-Sun)
                const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
                const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
                return eachDayOfInterval({ start: weekStart, end: weekEnd });
            }

            case "next7":
                return Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));

            case "recurring4weeks": {
                // Same day of week for next 4 weeks
                return Array.from({ length: 4 }, (_, i) => addDays(selectedDate, i * 7));
            }

            default:
                return [selectedDate];
        }
    };

    const handleSave = async () => {
        if (!currentEmployee || !selectedDate) return;
        try {
            setSaving(true);
            const supabase = createClient();
            const targetDates = getTargetDates();

            // Build array of availability records to upsert
            const records = targetDates.map(date => ({
                employee_id: currentEmployee.id,
                organization_id: (currentEmployee as any).organization_id,
                date: format(date, "yyyy-MM-dd"),
                day_of_week: date.getDay(),
                is_available: isAvailable,
                start_time: startTime + ":00",
                end_time: endTime + ":00"
            }));

            const { error } = await (supabase as any)
                .from("availability")
                .upsert(records, { onConflict: 'employee_id,date' });

            if (error) throw error;

            const dayCount = targetDates.length;
            setStatus("success");
            setMessage(dayCount === 1 ? "Availability updated!" : `Updated ${dayCount} days!`);
            await fetchAvailability();
            setTimeout(() => {
                setIsModalOpen(false);
                setStatus("idle");
            }, 1500);
        } catch (err) {
            console.error("Error saving availability:", err);
            setStatus("error");
            setMessage("Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    const renderDayContent = (date: Date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const specificAvail = availability.find(a => a.date === dateStr);
        const dayOfWeek = date.getDay();
        const defaultAvail = availability.find(a => a.day_of_week === dayOfWeek && !a.date);

        // Specific availability takes precedence
        const avail = specificAvail || defaultAvail;

        if (!avail) return null;

        return (
            <div className={cn(
                "mt-1 p-1.5 rounded-lg text-[10px] border flex flex-col gap-1",
                avail.is_available
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
            )}>
                <div className="flex items-center justify-between">
                    <span className="font-bold whitespace-nowrap">
                        {avail.is_available ? "Available" : "Unavailable"}
                    </span>
                    {specificAvail && (
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" title="Specific Override" />
                    )}
                </div>
                {avail.is_available && (
                    <div className="flex items-center gap-1 opacity-80">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{avail.start_time.slice(0, 5)} - {avail.end_time.slice(0, 5)}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                        <span>Generic</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <span>Specific Override</span>
                    </div>
                </div>
            </div>

            <Calendar
                onDateClick={handleDateClick}
                renderDay={renderDayContent}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Set Availability"}
                className="max-w-md"
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div
                            onClick={() => setIsAvailable(!isAvailable)}
                            className={cn(
                                "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group",
                                isAvailable
                                    ? "bg-green-500/5 border-green-500/20 hover:border-green-500/40"
                                    : "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                                    isAvailable ? "bg-green-500/20" : "bg-red-500/20"
                                )}>
                                    {isAvailable ? <Check className="h-6 w-6 text-green-500" /> : <XIcon className="h-6 w-6 text-red-500" />}
                                </div>
                                <div>
                                    <p className="font-bold text-lg text-white">
                                        {isAvailable ? "Available" : "Not Available"}
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        Click to toggle status for this day
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                                isAvailable ? "border-green-500 bg-green-500" : "border-slate-700"
                            )}>
                                {isAvailable && <Check className="h-3 w-3 text-white" />}
                            </div>
                        </div>

                        {isAvailable && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-1">Start Time</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <input
                                            type="time"
                                            className="input pl-10"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-1">End Time</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <input
                                            type="time"
                                            className="input pl-10"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Multi-day selection */}
                        <div className="border border-slate-800 rounded-2xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowMultiDay(!showMultiDay)}
                                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <CalendarDays className="h-5 w-5 text-orange-500" />
                                    <div className="text-left">
                                        <p className="font-medium text-white">Apply to Multiple Days</p>
                                        <p className="text-xs text-slate-400">
                                            {multiDayMode === "single" && "Just this day"}
                                            {multiDayMode === "week" && "Entire week (Mon-Sun)"}
                                            {multiDayMode === "next7" && "Next 7 days"}
                                            {multiDayMode === "recurring4weeks" && selectedDate && `Every ${DAY_NAMES[getDay(selectedDate)]} for 4 weeks`}
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown className={cn(
                                    "h-5 w-5 text-slate-400 transition-transform",
                                    showMultiDay && "rotate-180"
                                )} />
                            </button>

                            {showMultiDay && (
                                <div className="p-4 pt-0 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {[
                                        { value: "single", label: "Just This Day", desc: "Apply to selected date only" },
                                        { value: "next7", label: "Next 7 Days", desc: "Starting from selected date" },
                                        { value: "week", label: "This Week", desc: "Monday through Sunday" },
                                        { value: "recurring4weeks", label: selectedDate ? `Every ${DAY_NAMES[getDay(selectedDate)]} for 4 Weeks` : "Same Day Weekly", desc: "Repeat for the next 4 weeks" },
                                    ].map((option) => (
                                        <label
                                            key={option.value}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                                                multiDayMode === option.value
                                                    ? "bg-orange-500/10 border border-orange-500/30"
                                                    : "hover:bg-slate-800/50 border border-transparent"
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="multiDayMode"
                                                value={option.value}
                                                checked={multiDayMode === option.value}
                                                onChange={(e) => setMultiDayMode(e.target.value as typeof multiDayMode)}
                                                className="sr-only"
                                            />
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                                multiDayMode === option.value
                                                    ? "border-orange-500 bg-orange-500"
                                                    : "border-slate-600"
                                            )}>
                                                {multiDayMode === option.value && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-white">{option.label}</p>
                                                <p className="text-xs text-slate-500">{option.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {status !== "idle" && (
                        <div className={cn(
                            "p-4 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in zoom-in-95",
                            status === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                        )}>
                            {status === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                            {message}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="btn-secondary flex-1"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary flex-1 gap-2"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
