"use client";

import React, { useState } from "react";
import {
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
} from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarProps {
    onDateClick?: (date: Date) => void;
    renderDay?: (date: Date) => React.ReactNode;
    className?: string;
    dayClassName?: (date: Date) => string;
}

export function Calendar({
    onDateClick,
    renderDay,
    className,
    dayClassName
}: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <div className={cn("bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl", className)}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                <h2 className="text-2xl font-bold text-white">
                    {format(currentMonth, "MMMM yyyy")}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all border border-slate-800"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all border border-slate-800"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 bg-slate-900/30">
                {weekDays.map((day) => (
                    <div
                        key={day}
                        className="py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800/50"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7">
                {days.map((day, i) => (
                    <div
                        key={day.toString()}
                        onClick={() => onDateClick?.(day)}
                        className={cn(
                            "min-h-[120px] p-2 border-r border-b border-slate-800 transition-all cursor-pointer group hover:bg-slate-800/30",
                            !isSameMonth(day, monthStart) && "bg-slate-950/50 opacity-30",
                            i % 7 === 6 && "border-r-0",
                            dayClassName?.(day)
                        )}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={cn(
                                "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                                isSameDay(day, new Date())
                                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                    : "text-slate-400 group-hover:text-slate-200"
                            )}>
                                {format(day, "d")}
                            </span>
                        </div>
                        <div className="space-y-1 overflow-hidden">
                            {renderDay?.(day)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
