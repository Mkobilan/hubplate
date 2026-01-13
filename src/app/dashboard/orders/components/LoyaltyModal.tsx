import { useState, useEffect } from "react";
import { X, Search, UserPlus, Star, Loader2, CheckCircle2, Gift, ChevronRight, ArrowLeft, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { formatCurrency, cn } from "@/lib/utils";

interface LoyaltyModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    orderId: string | null;
    onCustomerLinked: (customer: any) => void;
    onRewardApplied: (discountAmount: number, pointsUsed: number) => void;
    currentCustomer: any | null;
}

export default function LoyaltyModal({
    isOpen,
    onClose,
    locationId,
    orderId,
    onCustomerLinked,
    onRewardApplied,
    currentCustomer
}: LoyaltyModalProps) {
    const [searchPhone, setSearchPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [lookupResult, setLookupResult] = useState<any | null>(null);
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [showRewards, setShowRewards] = useState(false);
    const [availableRewards, setAvailableRewards] = useState<any[]>([]);
    const [joinForm, setJoinForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
    });

    const supabase = createClient();

    useEffect(() => {
        if (isOpen && currentCustomer) {
            setLookupResult(currentCustomer);
            setShowJoinForm(false);
            setShowRewards(false);
        } else if (isOpen) {
            setLookupResult(null);
            setShowJoinForm(false);
            setShowRewards(false);
            setSearchPhone("");
        }
    }, [isOpen, currentCustomer]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const phone = searchPhone.replace(/\D/g, '');
        if (phone.length < 10) {
            toast.error("Please enter a valid phone number");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from("customers") as any)
                .select("*")
                .eq("phone", phone)
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setLookupResult(data);
                setShowJoinForm(false);
            } else {
                setLookupResult(null);
                setJoinForm(prev => ({ ...prev, phone }));
                setShowJoinForm(true);
                toast.success("No member found. Ready to join!");
            }
        } catch (err) {
            console.error("Lookup error:", err);
            toast.error("Failed to look up customer");
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinForm.phone || !joinForm.firstName || !joinForm.lastName) {
            toast.error("First name, last name, and phone are required");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from("customers") as any)
                .upsert({
                    location_id: locationId,
                    first_name: joinForm.firstName,
                    last_name: joinForm.lastName,
                    email: joinForm.email || null,
                    phone: joinForm.phone.replace(/\D/g, ''),
                    is_loyalty_member: true,
                    loyalty_tier: 'bronze',
                    loyalty_points: 0
                })
                .select()
                .single();

            if (error) throw error;

            setLookupResult(data);
            setShowJoinForm(false);
            toast.success("Welcome to the loyalty program!");
            handleLinkCustomer(data);
        } catch (err) {
            console.error("Join error:", err);
            toast.error("Failed to create customer profile");
        } finally {
            setLoading(false);
        }
    };

    const handleLinkCustomer = async (customer: any) => {
        if (!orderId) {
            onCustomerLinked(customer);
            onClose();
            return;
        }

        setLoading(true);
        try {
            const { error } = await (supabase
                .from("orders") as any)
                .update({
                    customer_id: customer.id,
                    customer_phone: customer.phone,
                    customer_email: customer.email,
                    customer_name: `${customer.first_name} ${customer.last_name}`
                })
                .eq("id", orderId);

            if (error) throw error;

            onCustomerLinked(customer);
            toast.success("Customer linked to order");
            onClose();
        } catch (err) {
            console.error("Linking error:", err);
            toast.error("Failed to link customer to order");
        } finally {
            setLoading(false);
        }
    };

    const fetchRewards = async () => {
        if (!locationId) return;
        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from("loyalty_rewards") as any)
                .select("*")
                .eq("location_id", locationId)
                .eq("is_active", true)
                .order("points_required", { ascending: true });

            if (error) throw error;
            setAvailableRewards(data || []);
            setShowRewards(true);
        } catch (err) {
            console.error("Rewards error:", err);
            toast.error("Failed to fetch rewards");
        } finally {
            setLoading(false);
        }
    };

    const handleRedeemReward = async (reward: any) => {
        if (!lookupResult || !orderId) return;

        if (lookupResult.loyalty_points < reward.points_required) {
            toast.error("Not enough points for this reward");
            return;
        }

        setLoading(true);
        try {
            // 1. Log the redemption
            const { error: redemptionError } = await (supabase
                .from("reward_redemptions") as any)
                .insert({
                    customer_id: lookupResult.id,
                    reward_id: reward.id,
                    order_id: orderId,
                    points_used: reward.points_required
                });

            if (redemptionError) throw redemptionError;

            // 2. Deduct points from customer
            const newPoints = lookupResult.loyalty_points - reward.points_required;
            const { error: customerError } = await (supabase
                .from("customers") as any)
                .update({ loyalty_points: newPoints })
                .eq("id", lookupResult.id);

            if (customerError) throw customerError;

            // 3. Apply reward to order (Discount or Item)
            let discountAmount = 0;
            if (reward.reward_type === 'discount' || reward.reward_type === 'percentage_off') {
                discountAmount = Number(reward.reward_value);
                // Note: percentage_off would normally need subtotal, but for now we'll treat as fixed if defined that way in DB
                // In actual production, you'd calculate percentage of subtotal here.
            }

            onRewardApplied(discountAmount, reward.points_required);
            setLookupResult({ ...lookupResult, loyalty_points: newPoints });
            toast.success(`Reward "${reward.name}" applied!`);
            onClose();
        } catch (err) {
            console.error("Redemption error:", err);
            toast.error("Failed to redeem reward");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {showRewards && (
                            <button onClick={() => setShowRewards(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-slate-100 italic tracking-tight">
                                Loyalty <span className="text-orange-500">Program</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">
                                {showRewards ? "Available Rewards" : "Customer Check-In"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {!lookupResult && !showJoinForm && (
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                <input
                                    type="tel"
                                    placeholder="Enter Phone Number..."
                                    value={searchPhone}
                                    onChange={(e) => setSearchPhone(e.target.value)}
                                    className="input pl-11 py-3 text-lg font-mono tracking-widest"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary w-full py-3 text-sm uppercase font-black"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Check In / Search"}
                            </button>
                        </form>
                    )}

                    {lookupResult && !showRewards && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-2xl font-black text-white shrink-0">
                                    {(lookupResult.first_name?.[0] || "") + (lookupResult.last_name?.[0] || "")}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold truncate">{lookupResult.first_name} {lookupResult.last_name}</h3>
                                    <p className="text-sm text-slate-500 font-mono italic">{lookupResult.phone}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="badge badge-primary text-[10px] uppercase font-bold px-2 py-0.5">
                                            {lookupResult.loyalty_tier || "Bronze"}
                                        </span>
                                        <span className="text-xs text-orange-400 font-bold flex items-center gap-1">
                                            <Star className="h-3 w-3 fill-orange-400" />
                                            {lookupResult.loyalty_points || 0} pts
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => handleLinkCustomer(lookupResult)}
                                    disabled={loading}
                                    className="btn btn-primary w-full py-3"
                                >
                                    <CheckCircle2 className="h-5 w-5" />
                                    {orderId ? "Link to Order" : "Select Customer"}
                                </button>

                                <button
                                    onClick={fetchRewards}
                                    disabled={loading}
                                    className="btn btn-secondary w-full py-3 border-orange-500/20 text-orange-400 hover:bg-orange-500/5"
                                >
                                    <Gift className="h-5 w-5" />
                                    Redeem Rewards
                                </button>

                                <button
                                    onClick={() => {
                                        setLookupResult(null);
                                        setShowJoinForm(false);
                                        setSearchPhone("");
                                    }}
                                    className="btn btn-secondary w-full py-2 text-xs"
                                >
                                    Not Correct? Search Again
                                </button>
                            </div>
                        </div>
                    )}

                    {showRewards && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                            {availableRewards.length === 0 ? (
                                <div className="text-center py-12">
                                    <Ticket className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500">No active rewards available at this location.</p>
                                </div>
                            ) : (
                                availableRewards.map((reward) => (
                                    <button
                                        key={reward.id}
                                        disabled={loading || lookupResult.loyalty_points < reward.points_required}
                                        onClick={() => handleRedeemReward(reward)}
                                        className={cn(
                                            "w-full p-4 rounded-xl border flex items-center justify-between transition-all group",
                                            lookupResult.loyalty_points >= reward.points_required
                                                ? "bg-slate-900 border-slate-800 hover:border-orange-500/50 hover:bg-slate-800"
                                                : "bg-slate-950 border-slate-900 opacity-50 grayscale cursor-not-allowed"
                                        )}
                                    >
                                        <div className="flex items-center gap-4 text-left">
                                            <div className={cn(
                                                "p-3 rounded-lg",
                                                lookupResult.loyalty_points >= reward.points_required ? "bg-orange-500/10 text-orange-500" : "bg-slate-800 text-slate-600"
                                            )}>
                                                <Gift className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-100">{reward.name}</h4>
                                                <p className="text-xs text-slate-500">{reward.description || `${reward.points_required} points required`}</p>
                                                {reward.reward_type === 'discount' && (
                                                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider mt-1 block">
                                                        Save {formatCurrency(reward.reward_value)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className="text-sm font-black text-orange-400">{reward.points_required}</span>
                                            <span className="text-[10px] text-slate-600 font-bold uppercase">Points</span>
                                            {lookupResult.loyalty_points >= reward.points_required && (
                                                <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-orange-500 mt-1 transition-colors" />
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {showJoinForm && (
                        <form onSubmit={handleJoin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-2 mb-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                <UserPlus className="h-5 w-5 text-orange-400" />
                                <p className="text-sm font-bold text-orange-300">New Member Registration</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">First Name</label>
                                    <input
                                        required
                                        value={joinForm.firstName}
                                        onChange={(e) => setJoinForm({ ...joinForm, firstName: e.target.value })}
                                        className="input py-2 text-sm"
                                        placeholder="John"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Last Name</label>
                                    <input
                                        required
                                        value={joinForm.lastName}
                                        onChange={(e) => setJoinForm({ ...joinForm, lastName: e.target.value })}
                                        className="input py-2 text-sm"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Phone Number</label>
                                <input
                                    required
                                    type="tel"
                                    value={joinForm.phone}
                                    onChange={(e) => setJoinForm({ ...joinForm, phone: e.target.value })}
                                    className="input py-2 text-sm font-mono"
                                    placeholder="9035559999"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Email <span className="text-slate-600 font-normal italic">(Optional)</span></label>
                                <input
                                    type="email"
                                    value={joinForm.email}
                                    onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })}
                                    className="input py-2 text-sm"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary w-full py-3 text-sm uppercase font-black"
                                >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create & Join Loyalty"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowJoinForm(false)}
                                    className="btn btn-secondary w-full py-2 text-xs"
                                >
                                    Go Back
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
