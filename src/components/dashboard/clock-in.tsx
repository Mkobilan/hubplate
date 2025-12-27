"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    Clock,
    LogIn,
    LogOut,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Coffee,
    Utensils,
    Sun,
    CalendarCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";

export function ClockInOut() {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [actionStage, setActionStage] = useState<"pin" | "role" | "actions">("pin");
    const [selectedRole, setSelectedRole] = useState<{ role: string; hourly_rate: number } | null>(null);
    const [employeeRoles, setEmployeeRoles] = useState<Array<{ role: string; rank: number; hourly_rate: number | null }> | null>(null);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const isClockedIn = useAppStore((state) => state.isClockedIn);
    const activeEntry = useAppStore((state) => state.activeEntry);
    const isOnBreak = useAppStore((state) => state.isOnBreak);
    const breakType = useAppStore((state) => state.breakType);
    const refreshClockStatus = useAppStore((state) => state.refreshClockStatus);

    const supabase = createClient();

    const checkStatus = async () => {
        if (!currentEmployee) return;
        await refreshClockStatus(supabase, currentEmployee.id);
    };

    useEffect(() => {
        checkStatus();
    }, [currentEmployee?.id]);

    const handlePinInput = (num: string) => {
        if (pin.length < 4) setPin(prev => prev + num);
    };

    const clearPin = () => setPin("");

    useEffect(() => {
        if (pin.length === 4) {
            handleSubmit();
        }
    }, [pin]);

    const handleSubmit = async () => {
        if (pin.length !== 4 || !currentEmployee) return;

        setLoading(true);
        setStatus("idle");

        try {
            // 1. Verify PIN
            let isCorrect = pin === (currentEmployee as any).pin_code;

            // Fallback: If it doesn't match, double check with latest data from DB
            if (!isCorrect) {
                const { data: latestEmp } = await (supabase as any)
                    .from("employees")
                    .select("pin_code")
                    .eq("id", currentEmployee.id)
                    .single();

                if (latestEmp && pin === (latestEmp as any).pin_code) {
                    isCorrect = true;
                    // Update store for next time
                    useAppStore.getState().setCurrentEmployee({ ...currentEmployee, pin_code: latestEmp.pin_code });
                }
            }

            if (!isCorrect) {
                setStatus("error");
                setMessage("Invalid PIN. Please try again.");
                setPin("");
                setLoading(false);
                return;
            }

            // PIN verified, check for multiple roles
            // Fetch roles for this employee - fetching FRESH data
            console.log("Fetching roles for:", currentEmployee.id);
            const { data: roles, error: roleError } = await (supabase as any)
                .from("employee_roles")
                .select("role, rank, hourly_rate")
                .eq("employee_id", currentEmployee.id)
                .order("rank");

            if (roleError) console.error("Error fetching roles:", roleError);
            console.log("Fetched roles:", roles);

            // Get the primary role from the FRESH employee fetch we did earlier or current store
            // Ideally we re-fetch the employee to be safe about their primary role/rate
            const { data: primaryEmp } = await (supabase as any)
                .from("employees")
                .select("role, hourly_rate")
                .eq("id", currentEmployee.id)
                .single();

            const allRoles = [
                { role: primaryEmp?.role || (currentEmployee as any).role, rank: 1, hourly_rate: primaryEmp?.hourly_rate ?? (currentEmployee as any).hourly_rate },
                ...(roles || [])
            ];

            console.log("All combined roles:", allRoles);

            if (isClockedIn) {
                setActionStage("actions");
            } else if (allRoles.length > 1) {
                setEmployeeRoles(allRoles);
                setActionStage("role");
            } else {
                setSelectedRole(allRoles[0]);
                setActionStage("actions");
            }

            setPin("");
            setStatus("idle");
            setMessage("");
        } catch (err) {
            console.error("PIN verification error:", err);
            setStatus("error");
            setMessage("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: 'clock_in' | 'clock_out' | 'start_break' | 'end_break', type?: 'lunch' | 'break') => {
        if (!currentEmployee || !currentLocation) return;
        setLoading(true);
        setStatus("idle");

        try {
            if (action === 'clock_in') {
                if (!selectedRole) {
                    setStatus("error");
                    setMessage("Please select a role.");
                    setLoading(false);
                    return;
                }
                const { error } = await (supabase as any)
                    .from("time_entries")
                    .insert([{
                        employee_id: currentEmployee.id,
                        location_id: currentLocation.id,
                        organization_id: currentEmployee.organization_id,
                        clock_in: new Date().toISOString(),
                        hourly_rate: selectedRole.hourly_rate || 0,
                        role: selectedRole.role
                    }]);
                if (error) throw error;

                // Let's refine the query to be precise:
                const { data: recipients } = await (supabase as any)
                    .from("employees")
                    .select("id, role, location_id")
                    .eq("organization_id", currentEmployee.organization_id)
                    .or(`role.eq.owner,and(role.in.(manager),location_id.eq.${currentLocation.id})`);

                if (recipients && recipients.length > 0) {
                    const notis = recipients.map((m: any) => ({
                        recipient_id: m.id,
                        location_id: currentLocation.id,
                        type: 'clock_in',
                        title: 'Staff Clock In',
                        message: `${currentEmployee.first_name} ${currentEmployee.last_name} clocked in.`,
                        is_read: false
                    }));
                    await (supabase.from("notifications") as any).insert(notis);
                }

                setStatus("success");
                setMessage("Clocked in successfully!");
            } else if (action === 'clock_out') {
                const clockOutTime = new Date();
                const clockInTime = new Date(activeEntry.clock_in);

                // Calculate total hours (excluding breaks already recorded)
                let breakMinutes = activeEntry.break_minutes || 0;

                // If they are currently on break, end it now
                if (activeEntry.current_break_start) {
                    const breakStart = new Date(activeEntry.current_break_start);
                    breakMinutes += Math.round((clockOutTime.getTime() - breakStart.getTime()) / 60000);
                }

                const totalMs = clockOutTime.getTime() - clockInTime.getTime();
                const totalHours = (totalMs / 3600000) - (breakMinutes / 60);

                const { error } = await (supabase as any)
                    .from("time_entries")
                    .update({
                        clock_out: clockOutTime.toISOString(),
                        break_minutes: breakMinutes,
                        total_hours: Number(totalHours.toFixed(2)),
                        total_pay: Number((totalHours * (activeEntry.hourly_rate || 0)).toFixed(2)),
                        current_break_start: null,
                        current_break_type: null
                    })
                    .eq("id", activeEntry.id);
                if (error) throw error;

                // Notify GMs/Owners
                const { data: recipients } = await (supabase as any)
                    .from("employees")
                    .select("id, role, location_id")
                    .eq("organization_id", currentEmployee.organization_id)
                    .or(`role.eq.owner,and(role.in.(manager),location_id.eq.${currentLocation.id})`);

                if (recipients && recipients.length > 0) {
                    const notis = recipients.map((m: any) => ({
                        recipient_id: m.id,
                        location_id: currentLocation.id,
                        type: 'clock_out',
                        title: 'Staff Clock Out',
                        message: `${currentEmployee.first_name} ${currentEmployee.last_name} clocked out.`,
                        is_read: false
                    }));
                    await (supabase.from("notifications") as any).insert(notis);
                }

                setStatus("success");
                setMessage("Clocked out successfully!");
            } else if (action === 'start_break') {
                const { error } = await (supabase as any)
                    .from("time_entries")
                    .update({
                        current_break_start: new Date().toISOString(),
                        current_break_type: type
                    })
                    .eq("id", activeEntry.id);
                if (error) throw error;
                setStatus("success");
                setMessage(`Started ${type}!`);
            } else if (action === 'end_break') {
                const breakEnd = new Date();
                const breakStart = new Date(activeEntry.current_break_start);
                const diffMinutes = Math.round((breakEnd.getTime() - breakStart.getTime()) / 60000);

                const { error } = await (supabase as any)
                    .from("time_entries")
                    .update({
                        break_minutes: (activeEntry.break_minutes || 0) + diffMinutes,
                        current_break_start: null,
                        current_break_type: null
                    })
                    .eq("id", activeEntry.id);
                if (error) throw error;
                setStatus("success");
                setMessage(`Ended ${activeEntry.current_break_type}!`);
            }

            await refreshClockStatus(supabase, currentEmployee.id);
            setTimeout(() => {
                setShowModal(false);
                setActionStage("pin");
                setStatus("idle");
            }, 2000);
        } catch (err) {
            console.error("Action error:", err);
            setStatus("error");
            setMessage("Action failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (pin.length === 4) {
            handleSubmit();
        }
    }, [pin]);

    return (
        <>
            {/* Floating Button / Header Item */}
            <button
                onClick={() => setShowModal(true)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300",
                    isClockedIn
                        ? "bg-green-500/10 border-green-500/50 text-green-400"
                        : "bg-orange-500/10 border-orange-500/50 text-orange-400"
                )}
            >
                <Clock className={cn("h-4 w-4", isClockedIn && !isOnBreak && "animate-pulse")} />
                <span className="text-sm font-bold">
                    {isClockedIn ? (isOnBreak ? `On ${breakType}` : "In") : "Clock In"}
                </span>
            </button>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
                        setShowModal(false);
                        setActionStage("pin");
                        setPin("");
                        setStatus("idle");
                        setSelectedRole(null);
                        setEmployeeRoles(null);
                    }} />
                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-sm animate-slide-up shadow-2xl">
                        {actionStage === "pin" ? (
                            <>
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-bold mb-2">Staff Access</h2>
                                    <p className="text-slate-400 text-sm">Enter your 4-digit PIN</p>
                                </div>

                                {/* PIN Display */}
                                <div className="flex justify-center gap-4 mb-8">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-4 h-4 rounded-full border-2 border-slate-700 transition-all",
                                                pin.length > i ? "bg-orange-500 border-orange-500 scale-110" : "bg-transparent"
                                            )}
                                        />
                                    ))}
                                </div>

                                {/* Status Message */}
                                {status !== "idle" && (
                                    <div className={cn(
                                        "mb-6 p-3 rounded-xl flex items-center gap-2 text-sm justify-center animate-pulse",
                                        status === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                    )}>
                                        {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                        {message}
                                    </div>
                                )}

                                {/* Keypad */}
                                <div className="grid grid-cols-3 gap-4">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                        <button
                                            key={num}
                                            onClick={() => handlePinInput(num.toString())}
                                            disabled={loading}
                                            className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold hover:bg-slate-700 active:bg-orange-500/20 transition-colors disabled:opacity-50"
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <button
                                        onClick={clearPin}
                                        disabled={loading}
                                        className="w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold text-slate-500 hover:text-slate-100"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={() => handlePinInput("0")}
                                        disabled={loading}
                                        className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold hover:bg-slate-700 active:bg-orange-500/20 transition-colors disabled:opacity-50"
                                    >
                                        0
                                    </button>
                                    <div />
                                </div>
                            </>
                        ) : actionStage === "role" ? (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-white">Select Role</h2>
                                    <p className="text-slate-400 text-sm">Which role are you working as?</p>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {employeeRoles?.map((r) => (
                                        <button
                                            key={r.role}
                                            onClick={() => {
                                                setSelectedRole(r as any);
                                                setActionStage("actions");
                                            }}
                                            className="p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition-all hover:scale-[1.02]"
                                        >
                                            <p className="font-bold text-white capitalize">{r.role}</p>
                                            <p className="text-xs text-slate-400">Rate: ${r.hourly_rate?.toFixed(2) || "0.00"}/hr</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
                                        <Clock className="h-8 w-8 text-orange-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Attendance</h2>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {isClockedIn ? (
                                            isOnBreak ? `Currently on ${breakType}` : "Currently Clocked In"
                                        ) : (
                                            "Currently Clocked Out"
                                        )}
                                    </p>
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

                                <div className="grid grid-cols-1 gap-3">
                                    {!isClockedIn ? (
                                        <button
                                            onClick={() => handleAction('clock_in')}
                                            disabled={loading}
                                            className="flex items-center gap-4 p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-2xl transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <LogIn className="h-6 w-6 text-green-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-white text-lg text-green-400">Clock In</p>
                                                <p className="text-xs text-green-400/70">Start your shift</p>
                                            </div>
                                        </button>
                                    ) : (
                                        <>
                                            {isOnBreak ? (
                                                <button
                                                    onClick={() => handleAction('end_break')}
                                                    disabled={loading}
                                                    className="flex items-center gap-4 p-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-2xl transition-all group"
                                                >
                                                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Sun className="h-6 w-6 text-orange-400" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-bold text-white text-lg text-orange-400">End {breakType}</p>
                                                        <p className="text-xs text-orange-400/70">Return to work</p>
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => handleAction('start_break', 'lunch')}
                                                        disabled={loading}
                                                        className="flex flex-col items-center gap-2 p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-2xl transition-all group"
                                                    >
                                                        <Utensils className="h-6 w-6 text-blue-400 group-hover:scale-110 transition-transform" />
                                                        <span className="font-bold text-white">Lunch</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction('start_break', 'break')}
                                                        disabled={loading}
                                                        className="flex flex-col items-center gap-2 p-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-2xl transition-all group"
                                                    >
                                                        <Coffee className="h-6 w-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                                                        <span className="font-bold text-white">Break</span>
                                                    </button>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleAction('clock_out')}
                                                disabled={loading}
                                                className="flex items-center gap-4 p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl transition-all group mt-2"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <LogOut className="h-6 w-6 text-red-400" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-white text-lg text-red-400">Clock Out</p>
                                                    <p className="text-xs text-red-400/70">End your shift</p>
                                                </div>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center rounded-3xl">
                                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
