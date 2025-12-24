"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Gift,
    Star,
    Trophy,
    Percent,
    Users,
    Plus,
    Settings,
    ArrowRight,
    Check,
    X,
    Sparkles,
    Crown
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";

export default function LoyaltyPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [stats, setStats] = useState({
        members: 0,
        pointsIssued: 0,
        redemptions: 0
    });
    const [program, setProgram] = useState<any>({
        name: "HubPlate Rewards",
        pointsPerDollar: 1,
        tiers: [
            { name: "Bronze", minPoints: 0, perks: ["Birthday reward", "Early access to specials"] },
            { name: "Silver", minPoints: 500, perks: ["5% off all orders", "Free appetizer monthly"] },
            { name: "Gold", minPoints: 1500, perks: ["10% off all orders", "Priority seating", "Exclusive events"] },
        ],
        rewards: []
    });
    const [loading, setLoading] = useState(true);
    const [showRewardModal, setShowRewardModal] = useState(false);

    const fetchLoyaltyData = useCallback(async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            // Fetch loyalty programs for this location
            const { data: programData } = await (supabase
                .from('loyalty_programs')
                .select('*')
                .eq('location_id', currentLocation.id)
                .single() as any);

            // Fetch members count
            const { count: membersCount } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('location_id', currentLocation.id)
                .eq('is_loyalty_member', true);

            // Fetch rewards
            const { data: rewardsData } = await supabase
                .from('loyalty_rewards')
                .select('*')
                .eq('program_id', programData?.id);

            setStats({
                members: membersCount || 0,
                pointsIssued: (programData as any)?.total_points_issued || 0,
                redemptions: (programData as any)?.total_redemptions || 0
            });

            if (programData) {
                const pd = programData as any;
                setProgram({
                    ...program,
                    id: pd.id,
                    name: pd.name,
                    pointsPerDollar: pd.points_per_dollar,
                    rewards: rewardsData || []
                });
            }
        } catch (error) {
            console.error('Error fetching loyalty data:', error);
        } finally {
            setLoading(false);
        }
    }, [currentLocation, program]);

    useEffect(() => {
        fetchLoyaltyData();
    }, [fetchLoyaltyData]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Gift className="h-8 w-8 text-orange-500" />
                        Loyalty Program
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Build customer loyalty with rewards, tiers, and exclusive perks
                    </p>
                </div>
                <button className="btn-primary">
                    <Settings className="h-4 w-4" />
                    Program Settings
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card text-center">
                    <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.members.toLocaleString()}</p>
                    <p className="text-sm text-slate-500 mt-1">Total Members</p>
                </div>
                <div className="card text-center">
                    <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.pointsIssued.toLocaleString()}</p>
                    <p className="text-sm text-slate-500 mt-1">Points Issued</p>
                </div>
                <div className="card text-center">
                    <Gift className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.redemptions}</p>
                    <p className="text-sm text-slate-500 mt-1">Redemptions</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tier Structure */}
                <div className="card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-orange-400" />
                            Membership Tiers
                        </h3>
                        <button className="text-sm text-orange-400 hover:underline">Edit Tiers</button>
                    </div>
                    <div className="space-y-4">
                        {program.tiers.map((tier: any, i: number) => (
                            <div
                                key={tier.name}
                                className={cn(
                                    "p-4 rounded-xl border transition-all",
                                    i === 0 && "bg-amber-900/10 border-amber-700/30",
                                    i === 1 && "bg-slate-500/10 border-slate-500/30",
                                    i === 2 && "bg-yellow-500/10 border-yellow-500/30"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Crown className={cn(
                                            "h-5 w-5",
                                            i === 0 && "text-amber-600",
                                            i === 1 && "text-slate-400",
                                            i === 2 && "text-yellow-400"
                                        )} />
                                        <span className="font-bold">{tier.name}</span>
                                    </div>
                                    <span className="text-sm text-slate-500">{tier.minPoints}+ pts</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {tier.perks.map((perk: string) => (
                                        <span key={perk} className="text-xs bg-slate-800 px-2 py-1 rounded-full">
                                            {perk}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rewards Catalog */}
                <div className="card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold flex items-center gap-2">
                            <Gift className="h-5 w-5 text-orange-400" />
                            Rewards Catalog
                        </h3>
                        <button
                            onClick={() => setShowRewardModal(true)}
                            className="btn-secondary text-xs py-1"
                        >
                            <Plus className="h-3 w-3" />
                            Add Reward
                        </button>
                    </div>
                    <div className="space-y-3">
                        {program.rewards.length > 0 ? (
                            program.rewards.map((reward: any) => (
                                <div
                                    key={reward.id}
                                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            reward.active ? "bg-green-500/10" : "bg-slate-800"
                                        )}>
                                            <Gift className={cn(
                                                "h-4 w-4",
                                                reward.active ? "text-green-400" : "text-slate-500"
                                            )} />
                                        </div>
                                        <div>
                                            <p className="font-medium">{reward.name}</p>
                                            <p className="text-xs text-slate-500">{reward.points} points</p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "px-2 py-1 rounded-full text-xs font-bold",
                                        reward.active ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-500"
                                    )}>
                                        {reward.active ? "Active" : "Inactive"}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-6">No rewards configured yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Point Earning */}
            <div className="card border-orange-500/20 bg-orange-500/5">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-orange-500/20 rounded-2xl">
                        <Sparkles className="h-8 w-8 text-orange-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg">Current Earning Rate</h3>
                        <p className="text-slate-400">
                            Customers earn <strong className="text-orange-400">{program.pointsPerDollar} point</strong> for every $1 spent.
                            Points never expire.
                        </p>
                    </div>
                    <button className="btn-secondary">
                        Adjust Rate
                    </button>
                </div>
            </div>

            {/* Add Reward Modal */}
            {showRewardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowRewardModal(false)} />
                    <div className="relative card w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Add New Reward</h2>
                            <button onClick={() => setShowRewardModal(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form className="space-y-4">
                            <div>
                                <label className="label">Reward Name</label>
                                <input type="text" className="input" placeholder="e.g. Free Dessert" />
                            </div>
                            <div>
                                <label className="label">Points Required</label>
                                <input type="number" className="input" placeholder="100" />
                            </div>
                            <div>
                                <label className="label">Description (optional)</label>
                                <textarea className="input" rows={2} placeholder="What does this reward include?" />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowRewardModal(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    Add Reward
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
