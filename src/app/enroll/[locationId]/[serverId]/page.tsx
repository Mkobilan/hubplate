"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Gift, Star, CheckCircle2, Loader2, Sparkles } from "lucide-react";

export default function EnrollmentPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const locationId = params.locationId as string;
    const serverId = params.serverId as string;
    const tableNumber = searchParams.get("table");

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const supabase = createClient();

            // 1. Check if customer already exists or create new one
            const { data: customer, error: customerError } = await ((supabase
                .from('customers') as any)
                .upsert({
                    location_id: locationId,
                    first_name: form.firstName,
                    last_name: form.lastName,
                    email: form.email,
                    phone: form.phone,
                    is_loyalty_member: true
                }, { onConflict: 'email' })
                .select()
                .single());

            if (customerError) throw customerError;

            // 2. Find the most recent active order for this table at this location
            const { data: order } = await ((supabase
                .from('orders') as any)
                .select('*')
                .eq('location_id', locationId)
                .eq('table_number', tableNumber)
                .in('status', ['pending', 'in_progress'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single());

            if (order) {
                // 3. Get loyalty program settings (earning rate)
                const { data: program } = await ((supabase
                    .from('loyalty_programs') as any)
                    .select('points_per_dollar')
                    .eq('location_id', locationId)
                    .single());

                const rate = (program as any)?.points_per_dollar || 1;
                const earned = Math.floor((order as any).total * rate);

                if (earned > 0) {
                    // Update customer points
                    await (supabase
                        .from('customers') as any)
                        .update({
                            loyalty_points: (customer as any).loyalty_points + earned,
                            total_spent: (customer as any).total_spent + (order as any).total,
                            total_visits: (customer as any).total_visits + 1,
                            last_visit_at: new Date().toISOString()
                        })
                        .eq('id', (customer as any).id);

                    setPointsEarned(earned);
                }
            }

            setSuccess(true);
        } catch (err: any) {
            console.error("Enrollment error:", err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
                <div className="w-full max-w-md text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 rounded-full animate-pulse" />
                        <CheckCircle2 className="h-20 w-20 text-green-400 relative mx-auto" />
                    </div>
                    <h1 className="text-3xl font-bold italic tracking-tight">You're in!</h1>
                    <p className="text-slate-400 text-lg">
                        Welcome to our loyalty program, <span className="text-white font-medium">{form.firstName}</span>!
                    </p>
                    {pointsEarned > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6 space-y-2">
                            <Sparkles className="h-6 w-6 text-orange-400 mx-auto" />
                            <p className="text-sm text-orange-400 uppercase font-bold tracking-widest">Points Earned Today</p>
                            <p className="text-5xl font-black text-orange-400">{pointsEarned}</p>
                            <p className="text-xs text-slate-500">Use these points for discounts on your next visit!</p>
                        </div>
                    )}
                    <button
                        onClick={() => window.close()}
                        className="btn-secondary w-full py-4 rounded-2xl font-bold"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 bg-orange-500/20 rounded-2xl mb-2">
                        <Gift className="h-10 w-10 text-orange-500" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight italic">JOIN THE CLUB</h1>
                    <p className="text-slate-400">Join our loyalty program at Table {tableNumber || "?"} and earn points on every order.</p>
                </div>

                <form onSubmit={handleSubmit} className="card bg-slate-900/50 border-slate-800 space-y-5 p-8 rounded-3xl shadow-2xl">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">First Name</label>
                            <input
                                required
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                                placeholder="John"
                                value={form.firstName}
                                onChange={e => setForm({ ...form, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Last Name</label>
                            <input
                                required
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                                placeholder="Doe"
                                value={form.lastName}
                                onChange={e => setForm({ ...form, lastName: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Email</label>
                        <input
                            required
                            type="email"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                            placeholder="john@example.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Phone</label>
                        <input
                            required
                            type="tel"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                            placeholder="(555) 000-0000"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm font-medium text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all"
                    >
                        {loading ? (
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        ) : (
                            "START EARNING POINTS"
                        )}
                    </button>
                    <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">
                        By joining, you agree to our Terms and Privacy Policy
                    </p>
                </form>

                <div className="text-center space-y-4 pt-4">
                    <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                            <p className="text-xl font-black italic">1pt</p>
                            <p className="text-[10px] text-slate-500 uppercase font-black">Per $1</p>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-800" />
                        <div className="text-center">
                            <p className="text-xl font-black italic">VIP</p>
                            <p className="text-[10px] text-slate-500 uppercase font-black">Access</p>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-800" />
                        <div className="text-center">
                            <p className="text-xl font-black italic">Free</p>
                            <p className="text-[10px] text-slate-500 uppercase font-black">Rewards</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
