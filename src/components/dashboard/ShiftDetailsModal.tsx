"use client";

import { useState, useEffect } from "react";
import {
    Clock,
    Calendar,
    Gift,
    X,
    Loader2,
    Check,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { format } from "date-fns";

interface Shift {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    role: string;
}

interface ShiftDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    shift: Shift | null;
    onOfferUp?: () => void;
}

export function ShiftDetailsModal({
    isOpen,
    onClose,
    shift,
    onOfferUp,
}: ShiftDetailsModalProps) {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const currentLocation = useAppStore((state) => state.currentLocation);

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    // Reset state when modal opens or shift changes
    useEffect(() => {
        if (isOpen) {
            setStatus("idle");
            setMessage("");
        }
    }, [isOpen, shift?.id]);

    if (!isOpen || !shift) return null;

    const handleOfferUp = async () => {
        try {
            setLoading(true);
            setStatus("idle");
            const supabase = createClient();

            const orgId = (currentEmployee as any)?.organization_id;

            const { error } = await supabase.from("shift_swap_requests").insert({
                organization_id: orgId,
                location_id: currentLocation?.id,
                shift_id: shift.id,
                requester_id: currentEmployee?.id,
                target_employee_id: null, // Open offer - no specific target
                request_type: "open_offer",
                status: "pending",
            });

            if (error) throw error;

            setStatus("success");
            setMessage("Shift offered up! Anyone qualified can claim it.");

            setTimeout(() => {
                onClose();
                onOfferUp?.();
            }, 1500);
        } catch (err) {
            console.error("Error offering up shift:", err);
            setStatus("error");
            setMessage("Failed to offer up shift. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm animate-slide-up shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Calendar className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Shift Details</h2>
                            <p className="text-xs text-slate-400">
                                {format(new Date(shift.date), "EEEE, MMMM d, yyyy")}
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

                {/* Shift Info */}
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Clock className="h-5 w-5 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                </p>
                                <p className="text-xs text-slate-400 capitalize">{shift.role}</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Duration</span>
                            <span className="text-white font-medium">
                                {(() => {
                                    const start = new Date(`1970-01-01T${shift.start_time}`);
                                    const end = new Date(`1970-01-01T${shift.end_time}`);
                                    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                                    return `${hours.toFixed(1)} hours`;
                                })()}
                            </span>
                        </div>
                    </div>
                </div>

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
                <div className="space-y-3">
                    <button
                        onClick={handleOfferUp}
                        disabled={loading || status === "success"}
                        className="btn btn-primary w-full gap-2"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Gift className="h-4 w-4" />
                        )}
                        Offer Up Shift
                    </button>

                    <p className="text-xs text-slate-500 text-center">
                        Anyone with the same role can claim this shift
                    </p>

                    <button
                        onClick={onClose}
                        className="btn btn-secondary w-full"
                        disabled={loading}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
