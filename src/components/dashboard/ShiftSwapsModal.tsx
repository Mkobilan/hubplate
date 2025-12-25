"use client";

import { useState, useEffect } from "react";
import {
    RefreshCw,
    Inbox,
    Send,
    Gift,
    Check,
    X,
    AlertCircle,
    Loader2,
    Clock,
    Calendar,
    User,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { format } from "date-fns";

interface ShiftSwapRequest {
    id: string;
    request_type: "swap" | "cover" | "open_offer";
    status: string;
    requester_id: string;
    target_employee_id: string | null;
    shift_id: string;
    swap_shift_id: string | null;
    requester_note: string | null;
    created_at: string;
    requester?: {
        id: string;
        first_name: string;
        last_name: string;
        role: string;
    };
    target_employee?: {
        id: string;
        first_name: string;
        last_name: string;
        role: string;
    };
    shift?: {
        id: string;
        date: string;
        start_time: string;
        end_time: string;
        role: string;
    };
}

interface ShiftSwapsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRequestHandled?: () => void;
}

export function ShiftSwapsModal({
    isOpen,
    onClose,
    onRequestHandled,
}: ShiftSwapsModalProps) {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const currentLocation = useAppStore((state) => state.currentLocation);

    const [activeTab, setActiveTab] = useState<"incoming" | "open_offers" | "outgoing">("incoming");
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<ShiftSwapRequest[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [requiresApproval, setRequiresApproval] = useState(false);

    const fetchRequests = async () => {
        if (!currentEmployee) return;

        try {
            setLoading(true);
            const supabase = createClient();

            // Fetch organization settings
            const orgId = (currentEmployee as any)?.organization_id;
            const { data: orgData } = await (supabase as any)
                .from("organizations")
                .select("require_manager_approval_for_swaps")
                .eq("id", orgId)
                .single();

            setRequiresApproval(orgData?.require_manager_approval_for_swaps || false);

            // Fetch all relevant requests
            const { data, error } = await (supabase as any)
                .from("shift_swap_requests")
                .select(`
                    *,
                    requester:requester_id(id, first_name, last_name, role),
                    target_employee:target_employee_id(id, first_name, last_name, role),
                    shift:shift_id(id, date, start_time, end_time, role)
                `)
                .eq("location_id", currentLocation?.id)
                .in("status", ["pending", "manager_pending"])
                .not("dismissed_by_ids", "cs", `{${currentEmployee?.id}}`)
                .order("created_at", { ascending: false });

            if (error) throw error;

            setRequests(data || []);
        } catch (err) {
            console.error("Error fetching shift swap requests:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && currentEmployee) {
            fetchRequests();
        }
    }, [isOpen, currentEmployee?.id]);

    if (!isOpen) return null;

    // Filter requests by tab
    const incomingRequests = requests.filter(
        (r) =>
            r.target_employee_id === currentEmployee?.id &&
            r.request_type !== "open_offer"
    );

    const openOffers = requests.filter(
        (r) =>
            r.request_type === "open_offer" &&
            r.requester_id !== currentEmployee?.id
    );

    const outgoingRequests = requests.filter(
        (r) => r.requester_id === currentEmployee?.id
    );

    const handleAccept = async (request: ShiftSwapRequest) => {
        try {
            setProcessingId(request.id);
            const supabase = createClient();

            // Check for conflicts before accepting
            const shiftDate = request.shift?.date;
            const shiftStart = request.shift?.start_time;
            const shiftEnd = request.shift?.end_time;

            // Get current user's shifts on that date
            const { data: myShifts } = await (supabase as any)
                .from("shifts")
                .select("*")
                .eq("employee_id", currentEmployee?.id)
                .eq("date", shiftDate);

            // Check for overlap
            const hasConflict = (myShifts || []).some((s: any) => {
                return (
                    (shiftStart! >= s.start_time && shiftStart! < s.end_time) ||
                    (shiftEnd! > s.start_time && shiftEnd! <= s.end_time) ||
                    (shiftStart! <= s.start_time && shiftEnd! >= s.end_time)
                );
            });

            if (hasConflict) {
                alert("You have a conflicting shift on this day. Cannot accept.");
                setProcessingId(null);
                return;
            }

            // --- ROLE VALIDATION ---
            const shiftRole = request.shift?.role;
            const myRole = (currentEmployee as any)?.role;
            const mySecondaryRoles = (currentEmployee as any)?.secondary_roles || [];
            const isManager = ["manager", "owner"].includes(myRole);

            const isRoleCompatible = isManager || myRole === shiftRole || mySecondaryRoles.includes(shiftRole as string);

            if (!isRoleCompatible) {
                alert(`Role Mismatch: You do not have the required role (${shiftRole}) to cover this shift. Your role is ${myRole}.`);
                setProcessingId(null);
                return;
            }
            // -----------------------

            // Determine the new status based on organization settings
            const newStatus = requiresApproval ? "manager_pending" : "accepted";

            // Update the request
            const { error: updateError } = await (supabase as any)
                .from("shift_swap_requests")
                .update({
                    status: newStatus,
                    accepted_by: currentEmployee?.id,
                    responded_at: new Date().toISOString(),
                })
                .eq("id", request.id);

            if (updateError) throw updateError;

            // If auto-complete (no manager approval required), call the security definer function to finalize
            if (!requiresApproval) {
                const { error: rpcError } = await (supabase as any).rpc("complete_shift_swap", {
                    request_id: request.id,
                });

                if (rpcError) {
                    console.error("RPC Error completing swap:", rpcError);
                    throw rpcError;
                }
            }

            await fetchRequests();
            onRequestHandled?.();
        } catch (err) {
            console.error("Error accepting request:", err);
            alert("Failed to accept request.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeny = async (request: ShiftSwapRequest) => {
        try {
            setProcessingId(request.id);
            const supabase = createClient();

            if (request.request_type === "open_offer") {
                // For open offers, "Deny" means dismiss for this user only
                const { error } = await (supabase as any).rpc("dismiss_shift_request", {
                    request_id: request.id,
                    employee_id: currentEmployee?.id
                });

                // Fallback if RPC doesn't exist yet (manual update)
                if (error) {
                    const { data: currentReq } = await (supabase as any)
                        .from("shift_swap_requests")
                        .select("dismissed_by_ids")
                        .eq("id", request.id)
                        .single();

                    const dismissed = [...(currentReq?.dismissed_by_ids || []), currentEmployee?.id];

                    await (supabase as any)
                        .from("shift_swap_requests")
                        .update({ dismissed_by_ids: dismissed })
                        .eq("id", request.id);
                }
            } else {
                // For targeted requests, "Deny" is global/final
                const { error } = await (supabase as any)
                    .from("shift_swap_requests")
                    .update({
                        status: "denied",
                        responded_at: new Date().toISOString(),
                    })
                    .eq("id", request.id);

                if (error) throw error;
            }

            await fetchRequests();
            onRequestHandled?.();
        } catch (err) {
            console.error("Error denying request:", err);
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancel = async (request: ShiftSwapRequest) => {
        try {
            setProcessingId(request.id);
            const supabase = createClient();

            const { error } = await (supabase as any)
                .from("shift_swap_requests")
                .update({ status: "cancelled" })
                .eq("id", request.id);

            if (error) throw error;

            await fetchRequests();
        } catch (err) {
            console.error("Error cancelling request:", err);
        } finally {
            setProcessingId(null);
        }
    };

    const ShiftContext = ({ date }: { date: string }) => {
        const [myShifts, setMyShifts] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const fetchMyShifts = async () => {
                if (!currentEmployee || !date) return;
                const supabase = createClient();
                const { data } = await (supabase as any)
                    .from("shifts")
                    .select("*")
                    .eq("employee_id", currentEmployee.id)
                    .eq("date", date);
                setMyShifts(data || []);
                setLoading(false);
            };
            fetchMyShifts();
        }, [date]);

        if (loading) return null;
        if (myShifts.length === 0) {
            return (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900/40 p-2 rounded-lg">
                    <Clock className="h-3 w-3" />
                    <span>You are not working on this day.</span>
                </div>
            );
        }

        return (
            <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Your shifts that day:</p>
                {myShifts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-900/60 rounded border border-slate-700/50 text-slate-300">
                        <span className="font-medium">{s.role}</span>
                        <span>{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                    </div>
                ))}
            </div>
        );
    };

    const RequestCard = ({ request, type }: { request: ShiftSwapRequest; type: "incoming" | "open_offer" | "outgoing" }) => {
        const isProcessing = processingId === request.id;

        return (
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
                            {request.requester?.first_name?.[0]}
                            {request.requester?.last_name?.[0]}
                        </div>
                        <div>
                            <p className="font-medium text-white flex items-center gap-2">
                                {request.requester?.first_name} {request.requester?.last_name}
                                {request.requester?.role && (
                                    <span className="text-[10px] text-slate-500 font-normal">
                                        ({request.requester.role})
                                    </span>
                                )}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] uppercase font-bold",
                                    request.request_type === "swap"
                                        ? "bg-orange-500/20 text-orange-400"
                                        : request.request_type === "cover"
                                            ? "bg-blue-500/20 text-blue-400"
                                            : "bg-green-500/20 text-green-400"
                                )}>
                                    {request.request_type === "open_offer" ? "Open Offer" : request.request_type}
                                </span>
                                {(request as any).shift?.role && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        Shift: {(request as any).shift.role}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-white">
                            {request.shift?.start_time?.slice(0, 5)} - {request.shift?.end_time?.slice(0, 5)}
                        </p>
                        <p className="text-xs text-slate-400">
                            {request.shift?.date && format(new Date(request.shift.date), "EEE, MMM d")}
                        </p>
                    </div>
                </div>

                {/* Show target employee for outgoing requests */}
                {type === "outgoing" && request.target_employee && (
                    <div className="mt-3 flex items-center justify-between text-[11px] p-2 bg-slate-900/40 rounded-lg">
                        <span className="text-slate-500">Sent to:</span>
                        <span className="text-slate-300 font-medium">
                            {request.target_employee.first_name} {request.target_employee.last_name}
                        </span>
                    </div>
                )}

                {/* Show my existing hours for this day if I'm the target or it's an open offer */}
                {(type === "incoming" || type === "open_offer") && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <ShiftContext date={request.shift?.date || ""} />
                    </div>
                )}

                {request.requester_note && (
                    <div className="mt-3 p-2 bg-slate-900/50 rounded-lg">
                        <p className="text-xs text-slate-400 italic">"{request.requester_note}"</p>
                    </div>
                )}

                {/* Actions */}
                {type !== "outgoing" && (
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => handleDeny(request)}
                            disabled={isProcessing}
                            className="btn btn-secondary flex-1 text-sm py-2"
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deny"}
                        </button>
                        <button
                            onClick={() => handleAccept(request)}
                            disabled={isProcessing}
                            className="btn btn-primary flex-1 text-sm py-2"
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
                        </button>
                    </div>
                )}

                {type === "outgoing" && (
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => handleCancel(request)}
                            disabled={isProcessing}
                            className="btn btn-secondary flex-1 text-sm py-2 text-red-400 hover:text-red-300"
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel Request"}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const EmptyState = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                <Icon className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-400 max-w-xs">{description}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col animate-slide-up shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <RefreshCw className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Shift Swaps</h2>
                            <p className="text-xs text-slate-400">Manage your shift requests</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setActiveTab("incoming")}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-colors relative",
                            activeTab === "incoming"
                                ? "text-orange-400"
                                : "text-slate-400 hover:text-slate-300"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Inbox className="h-4 w-4" />
                            Incoming
                            {incomingRequests.length > 0 && (
                                <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] rounded-full font-bold">
                                    {incomingRequests.length}
                                </span>
                            )}
                        </div>
                        {activeTab === "incoming" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("open_offers")}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-colors relative",
                            activeTab === "open_offers"
                                ? "text-green-400"
                                : "text-slate-400 hover:text-slate-300"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Gift className="h-4 w-4" />
                            Open Offers
                            {openOffers.length > 0 && (
                                <span className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] rounded-full font-bold">
                                    {openOffers.length}
                                </span>
                            )}
                        </div>
                        {activeTab === "open_offers" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("outgoing")}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-colors relative",
                            activeTab === "outgoing"
                                ? "text-blue-400"
                                : "text-slate-400 hover:text-slate-300"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Send className="h-4 w-4" />
                            Your Requests
                        </div>
                        {activeTab === "outgoing" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        </div>
                    ) : (
                        <>
                            {activeTab === "incoming" && (
                                incomingRequests.length > 0 ? (
                                    <div className="space-y-3">
                                        {incomingRequests.map((r) => (
                                            <RequestCard key={r.id} request={r} type="incoming" />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={Inbox}
                                        title="No Incoming Requests"
                                        description="When someone asks you to cover a shift, it will appear here."
                                    />
                                )
                            )}

                            {activeTab === "open_offers" && (
                                openOffers.length > 0 ? (
                                    <div className="space-y-3">
                                        {openOffers.map((r) => (
                                            <RequestCard key={r.id} request={r} type="open_offer" />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={Gift}
                                        title="No Open Offers"
                                        description="Shifts offered up by coworkers will appear here for you to claim."
                                    />
                                )
                            )}

                            {activeTab === "outgoing" && (
                                outgoingRequests.length > 0 ? (
                                    <div className="space-y-3">
                                        {outgoingRequests.map((r) => (
                                            <RequestCard key={r.id} request={r} type="outgoing" />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={Send}
                                        title="No Outgoing Requests"
                                        description="Shift coverage requests you've sent will appear here."
                                    />
                                )
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {requiresApproval && (
                    <div className="p-4 border-t border-slate-800 bg-orange-500/5">
                        <div className="flex items-center gap-2 text-xs text-orange-400">
                            <AlertCircle className="h-4 w-4" />
                            <span>Manager approval is required for all shift swaps</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
