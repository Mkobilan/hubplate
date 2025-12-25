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
    Wand2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Type definitions for Supabase integration
type StaffMember = { id: string; first_name: string; last_name: string; role: string; color: string };
type Shift = { id: string; staffId: string; day: number; start: string; end: string; role: string };

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { startOfWeek, endOfWeek, addDays, format, parseISO } from "date-fns";
import { Modal } from "@/components/ui/modal";

export default function SchedulePage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const [selectedWeek, setSelectedWeek] = useState(new Date());
    const [staff, setStaff] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Roles that have management access (same as sidebar)
    const MANAGEMENT_ROLES = ["owner", "manager"];
    const isManagerOrOwner = (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role)) || isOrgOwner;
    const ROLES = ["server", "bartender", "cook", "host", "busser", "dishwasher"];

    // Add Shift Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addingShift, setAddingShift] = useState(false);
    const [newShift, setNewShift] = useState({
        employee_id: "",
        date: format(new Date(), "yyyy-MM-dd"),
        start_time: "09:00",
        end_time: "17:00",
        role: "server"
    });
    const [addStatus, setAddStatus] = useState<"idle" | "success" | "error">("idle");
    const [addMessage, setAddMessage] = useState("");

    // Edit Shift Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(false);
    const [selectedShift, setSelectedShift] = useState<any>(null);
    const [editStatus, setEditStatus] = useState<"idle" | "success" | "error">("idle");
    const [editMessage, setEditMessage] = useState("");

    const fetchData = async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            // 1. Fetch Staff
            const { data: staffData, error: staffError } = await supabase
                .from("employees")
                .select("*")
                .eq("location_id", currentLocation.id);

            if (staffError) throw staffError;

            // 2. Fetch Shifts for the week
            const { data: shiftData, error: shiftError } = await supabase
                .from("shifts")
                .select("*")
                .eq("location_id", currentLocation.id)
                .gte("date", format(startOfWeek(selectedWeek), "yyyy-MM-dd"))
                .lte("date", format(endOfWeek(selectedWeek), "yyyy-MM-dd"));

            if (shiftError) throw shiftError;

            setStaff(staffData || []);
            setShifts(shiftData || []);
        } catch (err) {
            console.error("Error fetching schedule:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentLocation?.id, selectedWeek]);

    const handleAddShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation || !newShift.employee_id) return;

        try {
            setAddingShift(true);
            setAddStatus("idle");
            const supabase = createClient();

            const orgId = currentEmployee?.organization_id || (currentLocation as any)?.organization_id;

            const { error } = await (supabase as any)
                .from("shifts")
                .insert({
                    location_id: currentLocation.id,
                    organization_id: orgId,
                    employee_id: newShift.employee_id,
                    date: newShift.date,
                    start_time: newShift.start_time + ":00",
                    end_time: newShift.end_time + ":00",
                    role: newShift.role,
                    is_published: true // Manually added shifts are published by default
                });

            if (error) throw error;

            setAddStatus("success");
            setAddMessage("Shift added successfully!");
            await fetchData();

            setTimeout(() => {
                setIsAddModalOpen(false);
                setAddStatus("idle");
                setNewShift({
                    ...newShift,
                    employee_id: ""
                });
            }, 1500);
        } catch (err) {
            console.error("Error adding shift:", err);
            setAddStatus("error");
            setAddMessage("Failed to add shift. Please try again.");
        } finally {
            setAddingShift(false);
        }
    };

    const handleUpdateShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedShift) return;

        try {
            setEditingShift(true);
            setEditStatus("idle");
            const supabase = createClient();

            const { error } = await (supabase as any)
                .from("shifts")
                .update({
                    role: selectedShift.role,
                    date: selectedShift.date,
                    start_time: selectedShift.start_time.includes(':00') ? selectedShift.start_time : selectedShift.start_time + ":00",
                    end_time: selectedShift.end_time.includes(':00') ? selectedShift.end_time : selectedShift.end_time + ":00",
                })
                .eq("id", selectedShift.id);

            if (error) throw error;

            setEditStatus("success");
            setEditMessage("Shift updated successfully!");
            await fetchData();

            setTimeout(() => {
                setIsEditModalOpen(false);
                setEditStatus("idle");
            }, 1500);
        } catch (err) {
            console.error("Error updating shift:", err);
            setEditStatus("error");
            setEditMessage("Failed to update shift.");
        } finally {
            setEditingShift(false);
        }
    };

    const handleDeleteShift = async () => {
        if (!selectedShift || !confirm("Are you sure you want to delete this shift?")) return;

        try {
            setEditingShift(true);
            const supabase = createClient();

            const { error } = await supabase
                .from("shifts")
                .delete()
                .eq("id", selectedShift.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            await fetchData();
        } catch (err) {
            console.error("Error deleting shift:", err);
            alert("Failed to delete shift.");
        } finally {
            setEditingShift(false);
        }
    };

    const weekStart = startOfWeek(selectedWeek);
    const weekEnd = endOfWeek(selectedWeek);

    const totalHours = shifts.reduce((sum, s) => {
        if (!s.start_time || !s.end_time) return sum;
        const start = new Date(`1970-01-01T${s.start_time}`);
        const end = new Date(`1970-01-01T${s.end_time}`);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return sum;
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);

    const estLaborCost = shifts.reduce((sum, s) => {
        const emp = staff.find(e => e.id === s.employee_id);
        const rate = Number(emp?.hourly_rate || 0);
        if (!s.start_time || !s.end_time) return sum;
        const start = new Date(`1970-01-01T${s.start_time}`);
        const end = new Date(`1970-01-01T${s.end_time}`);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return sum;
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return sum + (hours * rate);
    }, 0);

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <CalendarIcon className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view schedule.</p>
                <button onClick={() => window.location.href = "/dashboard/locations"} className="btn-primary">
                    Go to Locations
                </button>
            </div>
        );
    }

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Shift Schedule</h1>
                    <p className="text-slate-400 mt-1">Manage weekly shifts and labor costs</p>
                </div>
                <div className="flex gap-2">
                    {isManagerOrOwner && (
                        <button
                            onClick={() => window.location.href = '/dashboard/schedule/builder'}
                            className="btn btn-primary gap-2"
                        >
                            <Wand2 className="h-4 w-4" />
                            Make Schedule
                        </button>
                    )}
                    {isManagerOrOwner && (
                        <>
                            <button className="btn btn-secondary">
                                <Copy className="h-4 w-4" />
                                Copy Last Week
                            </button>
                            <button
                                onClick={() => {
                                    setNewShift({
                                        ...newShift,
                                        date: format(new Date(), "yyyy-MM-dd"),
                                        employee_id: ""
                                    });
                                    setIsAddModalOpen(true);
                                }}
                                className="btn btn-secondary"
                            >
                                <Plus className="h-4 w-4" />
                                Add Shift
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Week Navigation & Quick Stats */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex items-center gap-4 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors" onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}>
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2 px-2">
                        <CalendarIcon className="h-4 w-4 text-orange-400" />
                        <span className="font-semibold whitespace-nowrap">
                            {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors" onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}>
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
                            <p className="font-bold">{Math.round(totalHours)}h</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                            <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">Est. Labor Cost</p>
                            <p className="font-bold">{formatCurrency(estLaborCost)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                            <Clock className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs">Labor %</p>
                            <p className="font-bold">0%</p>
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
                                    <p className="text-lg">{format(addDays(weekStart, i), 'd')}</p>
                                </div>
                            ))}
                        </div>

                        {/* Calendar Rows */}
                        <div className="divide-y divide-slate-800">
                            {staff.map((person) => (
                                <div key={person.id} className="grid grid-cols-8 group">
                                    <div className="p-4 border-r border-slate-800 bg-slate-900/20">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", person.color || "bg-orange-500")} />
                                            <span className="font-medium text-sm">{person.first_name} {person.last_name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 uppercase">{person.role}</span>
                                    </div>

                                    {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                                        const currentDay = addDays(weekStart, dayIdx);
                                        const currentDayStr = format(currentDay, 'yyyy-MM-dd');
                                        const shift = shifts.find(s =>
                                            s.employee_id === person.id &&
                                            s.date === currentDayStr
                                        );
                                        return (
                                            <div key={dayIdx} className="p-2 border-r border-slate-800 last:border-0 relative min-h-[100px] hover:bg-slate-800/20 transition-colors">
                                                {shift ? (
                                                    <div className={cn(
                                                        "p-2 rounded-lg text-[10px] h-full flex flex-col justify-between border",
                                                        (person.color || "bg-orange-500").replace('bg-', 'border-').replace('-500', '-500/30'),
                                                        (person.color || "bg-orange-500").replace('bg-', 'bg-').replace('-500', '-500/10')
                                                    )}>
                                                        <div className="font-bold flex items-center justify-between">
                                                            <span>{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</span>
                                                        </div>
                                                        <div className="text-slate-400 mt-1">{shift.role}</div>
                                                        {isManagerOrOwner && (
                                                            <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Edit2
                                                                    onClick={(e: any) => {
                                                                        e.stopPropagation();
                                                                        setSelectedShift(shift);
                                                                        setIsEditModalOpen(true);
                                                                    }}
                                                                    className="w-3 h-3 text-slate-500 hover:text-white cursor-pointer"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : isManagerOrOwner ? (
                                                    <button
                                                        onClick={() => {
                                                            setNewShift({
                                                                ...newShift,
                                                                employee_id: person.id,
                                                                date: currentDayStr,
                                                                role: person.role
                                                            });
                                                            setIsAddModalOpen(true);
                                                        }}
                                                        className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 flex items-center justify-center"
                                                    >
                                                        <Plus className="w-4 h-4 text-slate-600" />
                                                    </button>
                                                ) : null}
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
            <div className="card border-slate-800 bg-slate-900/20">
                <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-slate-500 shrink-0" />
                    <div>
                        <h4 className="font-semibold text-slate-300">Scheduling Alerts</h4>
                        <p className="text-sm text-slate-500 mt-1">No alerts for this week.</p>
                    </div>
                </div>
            </div>

            {/* Add Shift Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add New Shift"
            >
                <form onSubmit={handleAddShift} className="space-y-4">
                    <div className="space-y-2">
                        <label className="label">Staff Member</label>
                        <select
                            className="input"
                            value={newShift.employee_id}
                            onChange={(e) => {
                                const emp = staff.find(s => s.id === e.target.value);
                                setNewShift({
                                    ...newShift,
                                    employee_id: e.target.value,
                                    role: emp?.role || newShift.role
                                });
                            }}
                            required
                        >
                            <option value="">Select Staff...</option>
                            {staff.map(member => (
                                <option key={member.id} value={member.id}>
                                    {member.first_name} {member.last_name} ({member.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="label">Role</label>
                            <select
                                className="input capitalize"
                                value={newShift.role}
                                onChange={(e) => setNewShift({ ...newShift, role: e.target.value })}
                                required
                            >
                                {ROLES.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="label">Date</label>
                            <input
                                type="date"
                                className="input"
                                value={newShift.date}
                                onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="label">Start Time</label>
                            <input
                                type="time"
                                className="input"
                                value={newShift.start_time}
                                onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="label">End Time</label>
                            <input
                                type="time"
                                className="input"
                                value={newShift.end_time}
                                onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {addStatus !== "idle" && (
                        <div className={cn(
                            "p-3 rounded-lg text-sm flex items-center gap-2",
                            addStatus === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        )}>
                            <AlertCircle className="h-4 w-4" />
                            {addMessage}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="btn btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={addingShift}
                            className="btn btn-primary flex-1 gap-2"
                        >
                            {addingShift && <Plus className="h-4 w-4 animate-spin" />}
                            Add Shift
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Shift Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Shift"
            >
                {selectedShift && (
                    <form onSubmit={handleUpdateShift} className="space-y-4">
                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                            <p className="text-sm text-slate-400">Editing shift for</p>
                            <p className="font-bold text-lg">
                                {staff.find(s => s.id === selectedShift.employee_id)?.first_name} {staff.find(s => s.id === selectedShift.employee_id)?.last_name}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="label">Role</label>
                                <select
                                    className="input capitalize"
                                    value={selectedShift.role}
                                    onChange={(e) => setSelectedShift({ ...selectedShift, role: e.target.value })}
                                    required
                                >
                                    {ROLES.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="label">Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={selectedShift.date}
                                    onChange={(e) => setSelectedShift({ ...selectedShift, date: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="label">Start Time</label>
                                <input
                                    type="time"
                                    className="input"
                                    value={selectedShift.start_time.slice(0, 5)}
                                    onChange={(e) => setSelectedShift({ ...selectedShift, start_time: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="label">End Time</label>
                                <input
                                    type="time"
                                    className="input"
                                    value={selectedShift.end_time.slice(0, 5)}
                                    onChange={(e) => setSelectedShift({ ...selectedShift, end_time: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {editStatus !== "idle" && (
                            <div className={cn(
                                "p-3 rounded-lg text-sm flex items-center gap-2",
                                editStatus === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                            )}>
                                <AlertCircle className="h-4 w-4" />
                                {editMessage}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-4">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editingShift}
                                    className="btn btn-primary flex-1 gap-2"
                                >
                                    {editingShift && <Clock className="h-4 w-4 animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleDeleteShift}
                                disabled={editingShift}
                                className="w-full p-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                            >
                                Delete Shift
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
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
