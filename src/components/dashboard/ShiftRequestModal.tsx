"use client";

import { useState, useEffect } from "react";
import {
    RefreshCw,
    UserPlus,
    AlertCircle,
    Loader2,
    Clock,
    Calendar,
    User,
    Check,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { format } from "date-fns";

interface Shift {
    id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    role: string;
}

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    secondary_roles?: string[];
}

interface ShiftRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetEmployee: Employee | null;
    targetDate: string;
    targetShift: Shift | null;
    allShifts: Shift[];
    onSuccess?: () => void;
}

export function ShiftRequestModal({
    isOpen,
    onClose,
    targetEmployee,
    targetDate,
    targetShift,
    allShifts,
    onSuccess,
}: ShiftRequestModalProps) {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const currentLocation = useAppStore((state) => state.currentLocation);

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [requestType, setRequestType] = useState<"swap" | "cover">("cover");
    const [note, setNote] = useState("");

    // Get current user's shifts for the target date
    const myShiftsOnDate = allShifts.filter(
        (s) => s.employee_id === currentEmployee?.id && s.date === targetDate
    );

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStatus("idle");
            setMessage("");
            setNote("");
            setSelectedShift(myShiftsOnDate[0] || null);
            setRequestType(targetShift ? "swap" : "cover");
        }
    }, [isOpen, targetDate]);

    if (!isOpen || !targetEmployee || !currentEmployee) return null;

    const validateRequest = (): { valid: boolean; error?: string } => {
        if (!selectedShift) {
            return { valid: false, error: "Please select a shift to offer" };
        }

        // Check role compatibility
        const targetRoles = [
            targetEmployee.role,
            ...(targetEmployee.secondary_roles || []),
        ];
        if (!targetRoles.includes(selectedShift.role)) {
            return {
                valid: false,
                error: `${targetEmployee.first_name} cannot cover a ${selectedShift.role} shift. They are a ${targetEmployee.role}.`,
            };
        }

        // Check for time conflicts - does target have overlapping shifts?
        const shiftStart = selectedShift.start_time;
        const shiftEnd = selectedShift.end_time;

        const targetShiftsOnDate = allShifts.filter(
            (s) => s.employee_id === targetEmployee.id && s.date === targetDate
        );

        for (const s of targetShiftsOnDate) {
            // Simple overlap check
            if (
                (shiftStart >= s.start_time && shiftStart < s.end_time) ||
                (shiftEnd > s.start_time && shiftEnd <= s.end_time) ||
                (shiftStart <= s.start_time && shiftEnd >= s.end_time)
            ) {
                return {
                    valid: false,
                    error: `${targetEmployee.first_name} is already working ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)} on this day.`,
                };
            }
        }

        return { valid: true };
    };

    const handleSubmit = async () => {
        const validation = validateRequest();
        if (!validation.valid) {
            setStatus("error");
            setMessage(validation.error || "Validation failed");
            return;
        }

        try {
            setLoading(true);
            setStatus("idle");
            const supabase = createClient();

            const orgId = (currentEmployee as any)?.organization_id;

            const { error } = await (supabase as any).from("shift_swap_requests").insert({
                organization_id: orgId,
                location_id: currentLocation!.id,
                shift_id: selectedShift!.id,
                requester_id: currentEmployee.id,
                target_employee_id: targetEmployee.id,
                request_type: requestType,
                swap_shift_id: requestType === "swap" ? targetShift?.id : null,
                status: "pending",
                requester_note: note || null,
            });

            if (error) throw error;

            // Notify target employee
            await (supabase.from("notifications") as any).insert({
                recipient_id: targetEmployee.id,
                location_id: currentLocation!.id,
                type: 'shift_request',
                title: requestType === 'swap' ? 'Shift Swap Request' : 'Shift Cover Request',
                message: `${currentEmployee.first_name} ${currentEmployee.last_name} requested a ${requestType === 'swap' ? 'shift swap' : 'cover'} for ${format(new Date(targetDate), "MMM d")}.`,
                is_read: false
            });

            setStatus("success");
            setMessage("Request sent successfully!");

            setTimeout(() => {
                onClose();
                onSuccess?.();
            }, 1500);
        } catch (err) {
            console.error("Error sending request:", err);
            setStatus("error");
            setMessage("Failed to send request. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const validation = validateRequest();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md animate-slide-up shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <RefreshCw className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Request Shift Coverage</h2>
                            <p className="text-xs text-slate-400">
                                Ask {targetEmployee.first_name} to cover your shift
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Target Employee Info */}
                <div className="p-4 bg-slate-800/50 rounded-xl mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                            {targetEmployee.first_name[0]}
                            {targetEmployee.last_name[0]}
                        </div>
                        <div>
                            <p className="font-medium text-white">
                                {targetEmployee.first_name} {targetEmployee.last_name}
                            </p>
                            <p className="text-xs text-slate-400 capitalize flex items-center gap-2">
                                <span className="badge badge-secondary text-[10px]">
                                    {targetEmployee.role}
                                </span>
                                <span>•</span>
                                <span>{format(new Date(targetDate), "EEEE, MMM d")}</span>
                            </p>
                        </div>
                    </div>
                    {targetShift && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-xs text-slate-500 mb-1">Their shift:</p>
                            <p className="text-sm text-white font-medium">
                                {targetShift.start_time.slice(0, 5)} - {targetShift.end_time.slice(0, 5)}
                            </p>
                        </div>
                    )}
                </div>

                {/* Request Type Selection */}
                {targetShift && (
                    <div className="mb-6">
                        <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">
                            Request Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setRequestType("cover")}
                                className={cn(
                                    "p-3 rounded-xl border text-left transition-all",
                                    requestType === "cover"
                                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                                )}
                            >
                                <UserPlus className="h-4 w-4 mb-1" />
                                <p className="font-medium text-sm">Ask to Cover</p>
                                <p className="text-[10px] opacity-70">They work your shift</p>
                            </button>
                            <button
                                onClick={() => setRequestType("swap")}
                                className={cn(
                                    "p-3 rounded-xl border text-left transition-all",
                                    requestType === "swap"
                                        ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                                )}
                            >
                                <RefreshCw className="h-4 w-4 mb-1" />
                                <p className="font-medium text-sm">Shift Swap</p>
                                <p className="text-[10px] opacity-70">Exchange shifts</p>
                            </button>
                        </div>
                    </div>
                )}

                {/* Select Your Shift */}
                {myShiftsOnDate.length > 0 ? (
                    <div className="mb-6">
                        <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">
                            Your Shift to {requestType === "swap" ? "Swap" : "Offer"}
                        </label>
                        <div className="space-y-2">
                            {myShiftsOnDate.map((shift) => (
                                <button
                                    key={shift.id}
                                    onClick={() => setSelectedShift(shift)}
                                    className={cn(
                                        "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between",
                                        selectedShift?.id === shift.id
                                            ? "bg-green-500/10 border-green-500/30"
                                            : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <div>
                                            <p className="font-medium text-white">
                                                {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                            </p>
                                            <p className="text-xs text-slate-400 capitalize">{shift.role}</p>
                                        </div>
                                    </div>
                                    {selectedShift?.id === shift.id && (
                                        <Check className="h-4 w-4 text-green-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <div className="flex items-center gap-2 text-yellow-400">
                            <AlertCircle className="h-4 w-4" />
                            <p className="text-sm font-medium">You have no shifts on this day</p>
                        </div>
                        <p className="text-xs text-yellow-400/70 mt-1">
                            You can only request coverage for shifts you're scheduled to work.
                        </p>
                    </div>
                )}

                {/* Note */}
                <div className="mb-6">
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">
                        Note (Optional)
                    </label>
                    <textarea
                        className="input min-h-[80px] resize-none"
                        placeholder="Add a message to your request..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </div>

                {/* Validation Error */}
                {!validation.valid && selectedShift && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p className="text-sm">{validation.error}</p>
                        </div>
                    </div>
                )}

                {/* Status Message */}
                {status !== "idle" && (
                    <div
                        className={cn(
                            "mb-4 p-3 rounded-xl flex items-center gap-2 text-sm",
                            status === "success"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                        )}
                    >
                        {status === "success" ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <AlertCircle className="h-4 w-4" />
                        )}
                        {message}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary flex-1"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !validation.valid || myShiftsOnDate.length === 0}
                        className="btn btn-primary flex-1 gap-2"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Send Request
                    </button>
                </div>
            </div>
        </div>
    );
}
