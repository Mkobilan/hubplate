"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldCheck, MapPin, Briefcase, Zap, ArrowRight, XCircle } from "lucide-react";
import { setCookie } from "@/lib/cookies";

export default function InvitationPage() {
    const { token } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [invite, setInvite] = useState<any>(null);

    useEffect(() => {
        const fetchInvite = async () => {
            try {
                const supabase = createClient();
                const { data, error: fetchError } = await (supabase as any)
                    .from("employee_invites")
                    .select("*, locations(name)")
                    .eq("token", token as string)
                    .maybeSingle();

                if (fetchError || !data) {
                    throw new Error("Invalid or expired invitation link.");
                }

                if (data.status !== "pending") {
                    throw new Error("This invitation has already been used.");
                }

                if (new Date((data as any).expires_at) < new Date()) {
                    throw new Error("This invitation has expired.");
                }

                setInvite(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchInvite();
    }, [token]);

    const handleJoin = () => {
        // Store invite token in a persistent cookie
        setCookie("pending_invite_token", invite.token, 1); // Valid for 1 day
        router.push("/signup");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-slate-950 to-slate-950">
                <Loader2 className="h-10 w-10 text-orange-500 animate-spin mb-4" />
                <p className="text-slate-400 animate-pulse">Verifying invitation...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
                <div className="card max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                        <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Invitation Error</h1>
                        <p className="text-slate-400">{error}</p>
                    </div>
                    <button
                        onClick={() => router.push("/")}
                        className="btn-secondary w-full"
                    >
                        Go to Homepage
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-slate-950 to-slate-950">
            <div className="w-full max-w-lg">
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2">
                        <Zap className="h-8 w-8 text-orange-500 fill-orange-500" />
                        <span className="text-2xl font-black tracking-tighter italic">HUBPLATE</span>
                    </div>
                </div>

                <div className="relative">
                    {/* Decorative elements */}
                    <div className="absolute -top-10 -left-10 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl animate-pulse" />
                    <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl animate-pulse delay-700" />

                    <div className="card relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-300" />

                        <div className="p-8">
                            <div className="text-center space-y-2 mb-8">
                                <h1 className="text-3xl font-bold">You're Invited!</h1>
                                <p className="text-slate-400">Join the team and start managing orders seamlessly.</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 transition-all hover:border-slate-700">
                                    <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                                        <MapPin className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Location</p>
                                        <p className="text-lg font-bold">{invite.locations?.name}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 transition-all hover:border-slate-700">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                        <Briefcase className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Role</p>
                                        <p className="text-lg font-bold capitalize">{invite.role}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 transition-all hover:border-slate-700">
                                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Access</p>
                                        <p className="text-lg font-bold">Verified Organization</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleJoin}
                                className="group btn-primary w-full py-6 text-lg font-bold flex items-center justify-center gap-3 relative overflow-hidden transition-all active:scale-95"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    Accept Invitation <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                            <p className="text-center text-[10px] text-slate-500 mt-6 leading-relaxed">
                                By joining, you'll gain access to the Hubplate dashboard and POS system.
                                Make sure to use the email address your manager invited you with if provided.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
