"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Copy,
    Calendar as CalendarIcon,
    Users,
    Clock,
    DollarSign,
    AlertCircle,
    Check,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Mock data
const mockStaff = [
    { id: "1", name: "Alex M.", role: "Manager", color: "bg-orange-500" },
    { id: "2", name: "Jordan K.", role: "Server", color: "bg-blue-500" },
    { id: "3", name: "Sam T.", role: "Cook", color: "bg-green-500" },
    { id: "4", name: "Elena R.", role: "Host", color: "bg-purple-500" },
];

const mockShifts = [
    { id: "1", staffId: "1", day: 1, start: "08:00", end: "16:00", role: "Manager" },
    { id: "2", staffId: "2", day: 1, start: "11:00", end: "20:00", role: "Server" },
    { id: "3", staffId: "3", day: 1, start: "09:00", end: "17:00", role: "Cook" },
    { id: "4", staffId: "2", day: 2, start: "11:00", end: "20:00", role: "Server" },
    { id: "5", staffId: "4", day: 2, start: "17:00", end: "22:00", role: "Host" },
];

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulePage() {
    const { t } = useTranslation();
    const [selectedWeek, setSelectedWeek] = useState(new Date());

    const getWeekRange = () => {
        const start = new Date(selectedWeek);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { start, end };
    };

    const { start, end } = getWeekRange();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Shift Schedule</h1>
                    <p className="text-slate-400 mt-1">Manage weekly shifts and labor costs</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary">
                        <Copy className="h-4 w-4" />
                        Copy Last Week
                    </button>
                    <button className="btn-primary">
                        <Plus className="h-4 w-4" />
                        Add Shift
                    </button>
                </div>
            </div>

            {/* Week Navigation & Quick Stats */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex items-center gap-4 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2 px-2">
                        <CalendarIcon className="h-4 w-4 text-orange-400" />
                        <span className="font-semibold whitespace-nowrap">
                            {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-sm">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">Total Hours</p>
                            <p className="font-bold">142h</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                            <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">Est. Labor Cost</p>
                            <p className="font-bold">{formatCurrency(2840)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                            <Clock className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">Labor %</p>
                            <p className="font-bold">18.4%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="card p-0 overflow-hidden border-slate-800">
                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Calendar Header */}
                        <div className="grid grid-cols-8 border-b border-slate-800">
                            <div className="p-4 border-r border-slate-800 bg-slate-900/50 font-semibold text-slate-400">Staff</div>
                            {days.map((day, i) => (
                                <div key={day} className="p-4 text-center font-semibold border-r border-slate-800 last:border-0 bg-slate-900/50">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">{day}</p>
                                    <p className="text-lg">{(start.getDate() + i)}</p>
                                </div>
                            ))}
                        </div>

                        {/* Calendar Rows */}
                        <div className="divide-y divide-slate-800">
                            {mockStaff.map((person) => (
                                <div key={person.id} className="grid grid-cols-8 group">
                                    <div className="p-4 border-r border-slate-800 bg-slate-900/20">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", person.color)} />
                                            <span className="font-medium text-sm">{person.name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 uppercase">{person.role}</span>
                                    </div>

                                    {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                                        const shift = mockShifts.find(s => s.staffId === person.id && s.day === dayIdx);
                                        return (
                                            <div key={dayIdx} className="p-2 border-r border-slate-800 last:border-0 relative min-h-[100px] hover:bg-slate-800/20 transition-colors">
                                                {shift ? (
                                                    <div className={cn(
                                                        "p-2 rounded-lg text-[10px] h-full flex flex-col justify-between border",
                                                        person.color.replace('bg-', 'border-').replace('-500', '-500/30'),
                                                        person.color.replace('bg-', 'bg-').replace('-500', '-500/10')
                                                    )}>
                                                        <div className="font-bold flex items-center justify-between">
                                                            <span>{shift.start} - {shift.end}</span>
                                                        </div>
                                                        <div className="text-slate-400 mt-1">{shift.role}</div>
                                                        <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Edit2 className="w-3 h-3 text-slate-500 hover:text-white cursor-pointer" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 flex items-center justify-center">
                                                        <Plus className="w-4 h-4 text-slate-600" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Warnings / Alerts */}
            <div className="card border-amber-500/30 bg-amber-500/5">
                <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                        <h4 className="font-semibold text-amber-500">Scheduling Alerts</h4>
                        <ul className="text-sm text-slate-400 mt-1 list-disc list-inside space-y-1">
                            <li>Jordan K. is approaching overtime (38h scheduled).</li>
                            <li>Tuesday PM shift is understaffed (only 1 server for projected 40 guests).</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Edit2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
        </svg>
    );
}
