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
        tiers: [],
        rewards: []
    });
    const [loading, setLoading] = useState(true);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [editingReward, setEditingReward] = useState<any>(null);
    const [showRateModal, setShowRateModal] = useState(false);
    const [showTierModal, setShowTierModal] = useState(false);
    const [editingTier, setEditingTier] = useState<any>(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const [newRate, setNewRate] = useState<number | string>(1);
    const [savingRate, setSavingRate] = useState(false);
    const [savingReward, setSavingReward] = useState(false);
    const [savingTier, setSavingTier] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    const fetchLoyaltyData = useCallback(async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            // Fetch loyalty programs for this location
            const { data: programData, error: progError } = await ((supabase
                .from('loyalty_programs') as any)
                .select('*')
                .eq('location_id', currentLocation.id)
                .single());

            if (progError && progError.code !== 'PGRST116') throw progError;

            const pd = programData as any;

            // Fetch members count
            const { count: membersCount, error: countError } = await ((supabase
                .from('customers') as any)
                .select('*', { count: 'exact', head: true })
                .eq('location_id', currentLocation.id)
                .eq('is_loyalty_member', true));

            if (countError) console.warn('Error fetching member count:', countError);

            // Fetch rewards
            const { data: rewardsData } = await supabase
                .from('loyalty_rewards')
                .select('*')
                .eq('location_id', currentLocation.id)
                .order('points_required', { ascending: true });

            // Fetch tiers
            const { data: tiersData } = await supabase
                .from('loyalty_tiers')
                .select('*')
                .eq('location_id', currentLocation.id)
                .order('min_points', { ascending: true });

            setStats({
                members: membersCount || 0,
                pointsIssued: pd?.total_points_issued || 0,
                redemptions: pd?.total_redemptions || 0
            });

            if (pd) {
                setProgram({
                    ...program,
                    id: pd.id,
                    name: pd.name,
                    pointsPerDollar: pd.points_per_dollar,
                    rewards: rewardsData || [],
                    tiers: tiersData || []
                });
                setNewRate(pd.points_per_dollar || 1);
            } else {
                // Set default name if no program data
                setProgram({
                    ...program,
                    rewards: rewardsData || [],
                    tiers: tiersData || []
                });
            }
        } catch (error: any) {
            console.error('Error fetching loyalty data:', error);
            if (error.message) console.error('Error details:', error.message);
            if (error.details) console.error('Error hint:', error.details);
            if (error.code) console.error('Error code:', error.code);
        } finally {
            setLoading(false);
        }
    }, [currentLocation]);

    const handleUpdateRate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation || savingRate) return;

        try {
            setSavingRate(true);
            const supabase = createClient();
            const rateValue = typeof newRate === 'string' ? parseInt(newRate) || 1 : newRate;
            const { error } = await (supabase
                .from('loyalty_programs') as any)
                .update({ points_per_dollar: rateValue })
                .eq('location_id', currentLocation.id);

            if (error) throw error;

            setProgram((prev: any) => ({ ...prev, pointsPerDollar: rateValue }));
            setShowRateModal(false);
        } catch (error: any) {
            console.error('Error updating rate:', error);
            if (error.message) alert(`Error updating rate: ${error.message}`);
        } finally {
            setSavingRate(false);
        }
    };

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation || savingSettings) return;

        try {
            setSavingSettings(true);
            const supabase = createClient();
            const { error } = await (supabase
                .from('loyalty_programs') as any)
                .update({ name: program.name })
                .eq('location_id', currentLocation.id);

            if (error) throw error;
            setShowSettingsModal(false);
        } catch (error) {
            console.error('Error updating settings:', error);
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSaveReward = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation || savingReward) return;

        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const rewardData = {
            location_id: currentLocation.id,
            name: formData.get('name') as string,
            points_required: parseInt(formData.get('points') as string) || 0,
            description: formData.get('description') as string,
            reward_type: formData.get('reward_type') as string,
            reward_value: parseFloat(formData.get('reward_value') as string) || 0,
            is_active: true
        };

        try {
            setSavingReward(true);
            const supabase = createClient();

            let error;
            if (editingReward) {
                const { error: err } = await (supabase
                    .from('loyalty_rewards') as any)
                    .update(rewardData)
                    .eq('id', editingReward.id);
                error = err;
            } else {
                const { error: err } = await (supabase
                    .from('loyalty_rewards') as any)
                    .insert(rewardData);
                error = err;
            }

            if (error) throw error;
            setShowRewardModal(false);
            setEditingReward(null);
            fetchLoyaltyData();
        } catch (error) {
            console.error('Error saving reward:', error);
        } finally {
            setSavingReward(false);
        }
    };

    const handleSaveTier = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation || savingTier) return;

        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const perksStr = formData.get('perks') as string;
        const perks = perksStr.split(',').map(p => p.trim()).filter(p => p);

        const tierData = {
            location_id: currentLocation.id,
            name: formData.get('name') as string,
            min_points: parseInt(formData.get('min_points') as string) || 0,
            perks: perks
        };

        try {
            setSavingTier(true);
            const supabase = createClient();

            let error;
            if (editingTier) {
                const { error: err } = await (supabase
                    .from('loyalty_tiers') as any)
                    .update(tierData)
                    .eq('id', editingTier.id);
                error = err;
            } else {
                const { error: err } = await (supabase
                    .from('loyalty_tiers') as any)
                    .insert(tierData);
                error = err;
            }

            if (error) throw error;
            setShowTierModal(false);
            setEditingTier(null);
            fetchLoyaltyData();
        } catch (error) {
            console.error('Error saving tier:', error);
        } finally {
            setSavingTier(false);
        }
    };

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
                <button
                    onClick={() => setShowSettingsModal(true)}
                    className="btn-primary"
                >
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
                        <button
                            onClick={() => {
                                setEditingTier(null);
                                setShowTierModal(true);
                            }}
                            className="text-sm text-orange-400 hover:underline"
                        >
                            Add Tier
                        </button>
                    </div>
                    <div className="space-y-4">
                        {program.tiers.map((tier: any, i: number) => (
                            <div
                                key={tier.name}
                                className={cn(
                                    "p-4 rounded-xl border transition-all cursor-pointer hover:border-orange-500/50",
                                    tier.name.toLowerCase() === "bronze" && "bg-amber-900/10 border-amber-700/30",
                                    tier.name.toLowerCase() === "silver" && "bg-slate-500/10 border-slate-500/30",
                                    tier.name.toLowerCase() === "gold" && "bg-yellow-500/10 border-yellow-500/30",
                                    !["bronze", "silver", "gold"].includes(tier.name.toLowerCase()) && "bg-slate-800/50 border-slate-700"
                                )}
                                onClick={() => {
                                    setEditingTier(tier);
                                    setShowTierModal(true);
                                }}
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
                                    <span className="text-sm text-slate-500">{tier.min_points}+ pts</span>
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
                            onClick={() => {
                                setEditingReward(null);
                                setShowRewardModal(true);
                            }}
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
                                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800 cursor-pointer hover:border-orange-500/50 group"
                                    onClick={() => {
                                        setEditingReward(reward);
                                        setShowRewardModal(true);
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            reward.is_active ? "bg-green-500/10" : "bg-slate-800"
                                        )}>
                                            <Gift className={cn(
                                                "h-4 w-4",
                                                reward.is_active ? "text-green-400" : "text-slate-500"
                                            )} />
                                        </div>
                                        <div>
                                            <p className="font-medium group-hover:text-orange-400 transition-colors">{reward.name}</p>
                                            <p className="text-xs text-slate-500">{reward.points_required} points</p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "px-2 py-1 rounded-full text-xs font-bold",
                                        reward.is_active ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-500"
                                    )}>
                                        {reward.is_active ? "Active" : "Inactive"}
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
                    <button
                        onClick={() => setShowRateModal(true)}
                        className="btn-secondary"
                    >
                        Adjust Rate
                    </button>
                </div>
            </div>

            {/* Adjust Rate Modal */}
            {showRateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowRateModal(false)} />
                    <div className="relative card w-full max-w-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Adjust Earning Rate</h2>
                            <button onClick={() => setShowRateModal(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateRate} className="space-y-4">
                            <div>
                                <label className="label">Points per $1 spent</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={newRate === 0 ? "" : newRate}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "") {
                                            setNewRate("");
                                        } else {
                                            const parsed = parseInt(val);
                                            setNewRate(isNaN(parsed) ? "" : parsed);
                                        }
                                    }}
                                    min={1}
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Higher rates attract more loyalty members but increase reward liability.
                                </p>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowRateModal(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={savingRate} className="btn-primary flex-1">
                                    {savingRate ? "Saving..." : "Save Rate"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                        <form onSubmit={handleSaveReward} className="space-y-4">
                            <div>
                                <label className="label">Reward Name</label>
                                <input
                                    name="name"
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Free Dessert"
                                    defaultValue={editingReward?.name || ""}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Reward Type</label>
                                    <select
                                        name="reward_type"
                                        className="input"
                                        defaultValue={editingReward?.reward_type || "free_item"}
                                    >
                                        <option value="free_item">Free Item</option>
                                        <option value="discount">Fixed Discount</option>
                                        <option value="percentage_off">Percentage Off</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Value ($, %)</label>
                                    <input
                                        name="reward_value"
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        placeholder="0.00"
                                        defaultValue={editingReward?.reward_value || 0}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">Points Required</label>
                                <input
                                    name="points"
                                    type="number"
                                    className="input"
                                    placeholder="100"
                                    defaultValue={editingReward?.points_required || 100}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Description (optional)</label>
                                <textarea
                                    name="description"
                                    className="input"
                                    rows={2}
                                    placeholder="What does this reward include?"
                                    defaultValue={editingReward?.description || ""}
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowRewardModal(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={savingReward} className="btn-primary flex-1">
                                    {savingReward ? "Saving..." : editingReward ? "Update Reward" : "Add Reward"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Tier Modal */}
            {showTierModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowTierModal(false)} />
                    <div className="relative card w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">{editingTier ? "Edit Membership Tier" : "Add New Tier"}</h2>
                            <button onClick={() => setShowTierModal(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTier} className="space-y-4">
                            <div>
                                <label className="label">Tier Name</label>
                                <input
                                    name="name"
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Platinum"
                                    defaultValue={editingTier?.name || ""}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Minimum Points</label>
                                <input
                                    name="min_points"
                                    type="number"
                                    className="input"
                                    placeholder="2500"
                                    defaultValue={editingTier?.min_points || 0}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Perks (comma separated)</label>
                                <textarea
                                    name="perks"
                                    className="input"
                                    rows={3}
                                    placeholder="Free coffee, 15% discount, Priority support"
                                    defaultValue={editingTier?.perks?.join(", ") || ""}
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowTierModal(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={savingTier} className="btn-primary flex-1">
                                    {savingTier ? "Saving..." : editingTier ? "Update Tier" : "Create Tier"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowSettingsModal(false)} />
                    <div className="relative card w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Loyalty Program Settings</h2>
                            <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateSettings} className="space-y-4">
                            <div>
                                <label className="label">Program Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={program.name}
                                    onChange={(e) => setProgram({ ...program, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowSettingsModal(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={savingSettings} className="btn-primary flex-1">
                                    {savingSettings ? "Saving..." : "Save Settings"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
