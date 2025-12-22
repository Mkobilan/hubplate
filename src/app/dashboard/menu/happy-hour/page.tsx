"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Plus,
    Trash2,
    Clock,
    Calendar,
    Percent,
    Tag,
    ChevronLeft,
    Save,
} from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";

// Mock data
const mockHappyHours = [
    {
        id: "1",
        name: "Happy Hour Drinks",
        day_of_week: [1, 2, 3, 4, 5], // Mon-Fri
        start_time: "16:00",
        end_time: "18:00",
        discount_type: "percentage",
        discount_value: 20,
        category: "Drinks",
        is_active: true,
    },
    {
        id: "2",
        name: "Late Night Apps",
        day_of_week: [0, 5, 6], // Sun, Fri, Sat
        start_time: "21:00",
        end_time: "23:00",
        discount_type: "fixed",
        discount_value: 5,
        category: "Appetizers",
        is_active: true,
    },
];

const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

export default function HappyHourPage() {
    const { t } = useTranslation();
    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/menu"
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Happy Hour Automation</h1>
                        <p className="text-slate-400 mt-1">
                            Configure time-based pricing discounts
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary"
                >
                    <Plus className="h-4 w-4" />
                    Create Rule
                </button>
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockHappyHours.map((rule) => (
                    <div key={rule.id} className="card relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold">{rule.name}</h2>
                                <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                                    <Tag className="h-3 w-3" />
                                    <span>{rule.category} • {rule.discount_type === 'percentage' ? `${rule.discount_value}% Off` : `${formatCurrency(rule.discount_value)} Off`}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                                <div className={cn(
                                    "w-12 h-6 rounded-full relative transition-colors cursor-pointer",
                                    rule.is_active ? "bg-orange-500" : "bg-slate-700"
                                )}>
                                    <div className={cn(
                                        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                                        rule.is_active ? "translate-x-6" : ""
                                    )} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-800">
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <Calendar className="h-4 w-4 text-orange-500" />
                                <span>{rule.day_of_week.map(d => days[d].substring(0, 3)).join(", ")}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <Clock className="h-4 w-4 text-orange-500" />
                                <span>{rule.start_time} - {rule.end_time}</span>
                            </div>
                        </div>

                        {/* Status indicator */}
                        <div className="absolute top-0 right-0 p-1">
                            <span className={cn(
                                "w-2 h-2 rounded-full inline-block",
                                rule.is_active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-slate-500"
                            )} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {mockHappyHours.length === 0 && (
                <div className="card py-12 text-center">
                    <Clock className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold">No Happy Hour Rules</h3>
                    <p className="text-slate-400 mt-1 max-w-sm mx-auto">
                        Create automated discount rules that activate during specific times of the day.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary mt-6"
                    >
                        <Plus className="h-4 w-4" />
                        Create First Rule
                    </button>
                </div>
            )}

            {/* Add Modal Placeholder */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
                    <div className="relative card w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-6">Create Happy Hour Rule</h2>
                        <form className="space-y-4">
                            <div>
                                <label className="label">Rule Name</label>
                                <input type="text" className="input" placeholder="e.g. Taco Tuesday" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Discount Type</label>
                                    <select className="input">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Value</label>
                                    <div className="relative">
                                        <input type="number" className="input pr-8" placeholder="0" />
                                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="label">Applies To</label>
                                <select className="input">
                                    <option value="all">Entire Menu</option>
                                    <option value="drinks">Drinks</option>
                                    <option value="apps">Appetizers</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Start Time</label>
                                    <input type="time" className="input" />
                                </div>
                                <div>
                                    <label className="label">End Time</label>
                                    <input type="time" className="input" />
                                </div>
                            </div>

                            <div>
                                <label className="label">Repeat On</label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {days.map((day, i) => (
                                        <button
                                            key={day}
                                            type="button"
                                            className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-900 text-sm font-medium hover:border-orange-500 transition-colors"
                                        >
                                            {day.charAt(0)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    <Save className="h-4 w-4" />
                                    Save Rule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
