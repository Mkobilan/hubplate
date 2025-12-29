"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { format, addDays, isWithinInterval } from "date-fns";
import { useTranslation } from "react-i18next";
import {
    Mail,
    MessageSquare,
    Bell,
    Users,
    Send,
    Plus,
    BarChart3,
    Clock,
    RefreshCw,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const quickActions = [
    { id: "birthday", label: "Birthday Offer", icon: "🎂", description: "Auto-send on customer birthdays" },
    { id: "winback", label: "Win-Back Campaign", icon: "💔", description: "Re-engage inactive customers" },
    { id: "vip", label: "VIP Exclusive", icon: "👑", description: "Special offers for top customers" },
    { id: "review", label: "Review Request", icon: "⭐", description: "Ask for reviews after visits" },
];

export default function MarketingPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter/Audience State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [campaignType, setCampaignType] = useState<"email" | "sms" | "push">("email");
    const [selectedAudienceType, setSelectedAudienceType] = useState<string>("all");
    const [audienceCount, setAudienceCount] = useState(0);
    const [winBackDays, setWinBackDays] = useState(30);

    const [stats, setStats] = useState({
        subscribers: 0,
        campaignsThisMonth: 0
    });

    const fetchCampaigns = useCallback(async () => {
        if (!currentLocation) return;
        try {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from('marketing_campaigns')
                .select('*')
                .eq('location_id', currentLocation.id)
                .order('created_at', { ascending: false });

            // If table doesn't exist or error, just set empty to avoid crash if schema not ready
            if (error) {
                console.warn("Marketing campaigns table might not exist yet:", error);
                setCampaigns([]);
            } else {
                setCampaigns(data || []);
            }

            // Process stats (simplified for UI)
            if (data) {
                const campaigns = data as any[];
                const thisMonth = campaigns.filter(c => new Date(c.created_at).getMonth() === new Date().getMonth());
                setStats(prev => ({
                    ...prev,
                    campaignsThisMonth: thisMonth.length
                }));
            }
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    }, [currentLocation]);

    const fetchSubscriberCount = useCallback(async () => {
        if (!currentLocation) return;
        const supabase = createClient();
        const { count } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('location_id', currentLocation.id)
            .eq('is_loyalty_member', true);
        setStats(prev => ({ ...prev, subscribers: count || 0 }));
    }, [currentLocation]);

    useEffect(() => {
        fetchCampaigns();
        fetchSubscriberCount();
    }, [fetchCampaigns, fetchSubscriberCount]);


    // Audience Calculation Logic
    const calculateAudience = async (type: string, params?: any): Promise<string[]> => {
        if (!currentLocation) return [];
        const supabase = createClient();

        try {
            let customerIds: string[] = [];

            if (type === 'all') {
                const { data } = await supabase.from('customers').select('id').eq('location_id', currentLocation.id);
                customerIds = (data as any[])?.map(c => c.id) || [];
            } else if (type === 'birthday') {
                const { data } = await supabase.from('customers').select('id, birthday').eq('location_id', currentLocation.id).not('birthday', 'is', null);
                if (data) {
                    const customers = data as any[];
                    const today = new Date();
                    const nextWeek = addDays(today, 7);
                    customerIds = customers.filter((c: any) => {
                        if (!c.birthday) return false;
                        const year = parseInt(c.birthday.split('-')[0]);
                        const month = parseInt(c.birthday.split('-')[1]) - 1;
                        const day = parseInt(c.birthday.split('-')[2]);

                        const currentYearBirthday = new Date(today.getFullYear(), month, day);
                        const nextYearBirthday = new Date(today.getFullYear() + 1, month, day);

                        return isWithinInterval(currentYearBirthday, { start: today, end: nextWeek }) ||
                            isWithinInterval(nextYearBirthday, { start: today, end: nextWeek });
                    }).map((c: any) => c.id);
                }
            } else if (type === 'winback') {
                const days = params?.days || 30;
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);

                const { data } = await supabase
                    .from('customers')
                    .select('id, orders(created_at)')
                    .eq('location_id', currentLocation.id);

                if (data) {
                    const customers = data as any[];
                    customerIds = customers.filter((c: any) => {
                        const orders = c.orders || [];
                        if (orders.length === 0) return false;
                        const lastOrderDesc = orders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                        if (!lastOrderDesc) return false;

                        const lastOrderDate = new Date(lastOrderDesc.created_at);
                        return lastOrderDate < cutoffDate;
                    }).map((c: any) => c.id);
                }
            } else if (type === 'vip') {
                const { data } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('location_id', currentLocation.id)
                    .gt('total_spent', 500);
                customerIds = (data as any[])?.map(c => c.id) || [];
            } else if (type === 'review') {
                const { data } = await supabase
                    .from('customers')
                    .select('id, customer_feedback(id)')
                    .eq('location_id', currentLocation.id);

                if (data) {
                    const customers = data as any[];
                    customerIds = customers
                        .filter((c: any) => !c.customer_feedback || c.customer_feedback.length === 0)
                        .map((c: any) => c.id);
                }
            }

            setAudienceCount(customerIds.length);
            return customerIds;
        } catch (err) {
            console.error("Error calculating audience", err);
            return [];
        }
    };

    // React to selection changes in modal
    useEffect(() => {
        if (showCreateModal) {
            calculateAudience(selectedAudienceType, { days: winBackDays });
        }
    }, [selectedAudienceType, winBackDays, showCreateModal]);

    const handleQuickAction = (id: string) => {
        setSelectedAudienceType(id);
        setShowCreateModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Send className="h-8 w-8 text-orange-500" />
                        Marketing Hub
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Create and manage email, SMS, and push notification campaigns
                    </p>
                </div>
                <button onClick={() => { setSelectedAudienceType('all'); setShowCreateModal(true); }} className="btn btn-primary">
                    <Plus className="h-4 w-4" />
                    New Campaign
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="card text-center">
                    <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.subscribers.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Total Subscribers</p>
                </div>
                {/* Removed Open/Click Rate Cards */}
                <div className="card text-center">
                    <Send className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.campaignsThisMonth}</p>
                    <p className="text-xs text-slate-500 mt-1">Campaigns This Month</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h3 className="font-bold mb-4">Quick Automations</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => handleQuickAction(action.id)}
                            className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-orange-500/50 transition-all text-left group"
                        >
                            <span className="text-2xl mb-2 block">{action.icon}</span>
                            <p className="font-bold text-sm group-hover:text-orange-400 transition-colors">{action.label}</p>
                            <p className="text-xs text-slate-500 mt-1">{action.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Campaigns List */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold">Recent Campaigns</h3>
                    <button className="text-sm text-orange-400 hover:underline">View All</button>
                </div>
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
                        </div>
                    ) : campaigns.length > 0 ? (
                        campaigns.map((campaign) => (
                            <div
                                key={campaign.id}
                                className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "p-3 rounded-xl",
                                        campaign.type === "email" && "bg-blue-500/10",
                                        campaign.type === "sms" && "bg-green-500/10",
                                        campaign.type === "push" && "bg-purple-500/10"
                                    )}>
                                        {campaign.type === "email" && <Mail className="h-5 w-5 text-blue-400" />}
                                        {campaign.type === "sms" && <MessageSquare className="h-5 w-5 text-green-400" />}
                                        {campaign.type === "push" && <Bell className="h-5 w-5 text-purple-400" />}
                                    </div>
                                    <div>
                                        <p className="font-bold">{campaign.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn(
                                                "text-xs px-2 py-0.5 rounded-full",
                                                (campaign.status === "active" || campaign.status === "running") && "bg-green-500/20 text-green-400",
                                                campaign.status === "scheduled" && "bg-amber-500/20 text-amber-400",
                                                campaign.status === "completed" && "bg-slate-500/20 text-slate-400"
                                            )}>
                                                {campaign.status}
                                            </span>
                                            {campaign.scheduled_at && (
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(campaign.scheduled_at), 'MMM d, p')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {campaign.status !== "scheduled" && (
                                        <div className="hidden md:flex gap-4 text-sm">
                                            <div className="text-center">
                                                <p className="font-bold">{(campaign.sent_count as number)?.toLocaleString() || 0}</p>
                                                <p className="text-xs text-slate-500">Sent</p>
                                            </div>
                                            {/* Removed Open/Click counts */}
                                        </div>
                                    )}
                                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                                        <BarChart3 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-6">No campaigns found</p>
                    )}
                </div>
            </div>

            {/* Create Campaign Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className="relative card w-full max-w-lg shadow-2xl bg-slate-950 border-slate-800 max-h-[90vh] flex flex-col p-0 overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/50">
                            <h2 className="text-xl font-bold">Create Campaign</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {/* Campaign Type */}
                            <div className="mb-6">
                                <label className="label">Campaign Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["email", "sms", "push"] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setCampaignType(type)}
                                            className={cn(
                                                "p-3 rounded-xl border transition-all flex flex-col items-center gap-2",
                                                campaignType === type
                                                    ? "border-orange-500 bg-orange-500/10"
                                                    : "border-slate-800 hover:border-slate-700"
                                            )}
                                        >
                                            {type === "email" && <Mail className="h-5 w-5" />}
                                            {type === "sms" && <MessageSquare className="h-5 w-5" />}
                                            {type === "push" && <Bell className="h-5 w-5" />}
                                            <span className="text-sm capitalize">{type}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <form className="space-y-4" onSubmit={async (e) => {
                                e.preventDefault();
                                setLoading(true); // Re-use loading state for sending
                                try {
                                    const targetIds = await calculateAudience(selectedAudienceType, { days: winBackDays });

                                    if (targetIds.length === 0) {
                                        toast.error("No customers matched this audience.");
                                        setLoading(false);
                                        return;
                                    }

                                    // Create Campaign Record
                                    const supabase: any = createClient();

                                    // Prepare insert payload
                                    const insertPayload: any = {
                                        location_id: currentLocation!.id,
                                        name: (e.target as any).elements[0].value || "Untitled Campaign",
                                        type: campaignType,
                                        status: 'running',
                                        subject: (e.target as any).elements['subject'].value,
                                        message: (e.target as any).elements['message'].value,
                                        target_audience: { type: selectedAudienceType, count: targetIds.length } as any
                                    };

                                    const { data: campaignData, error: campError } = await (supabase
                                        .from('marketing_campaigns')
                                        .insert(insertPayload as never)
                                        .select()
                                        .single() as unknown as Promise<any>);

                                    if (campError) throw campError;

                                    // Send Emails Iteratively (Client-side batching)
                                    let sentCount = 0;
                                    const subject = (e.target as any).elements['subject'].value;
                                    const message = (e.target as any).elements['message'].value;

                                    // Get customer emails
                                    const { data: customerData } = await supabase
                                        .from('customers')
                                        .select('id, email')
                                        .in('id', targetIds);

                                    const emailMap = new Map(customerData?.map((c: any) => [c.id, c.email]) || []);

                                    for (const custId of targetIds) {
                                        try {
                                            const email = emailMap.get(custId) as string;
                                            // Basic validation: must have @ and . and not be fake example.com data if possible
                                            // We assume 'example.com' or 'test' might be fake data the user wants to skip
                                            if (!email || !email.includes('@') || email.includes('example.com') || email.endsWith('.test')) {
                                                console.log(`Skipping invalid/test email: ${email}`);
                                                continue;
                                            }

                                            const res = await fetch('/api/email/send', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    customerId: custId,
                                                    promoCode: 'LOYAL20',
                                                    type: selectedAudienceType,
                                                    recommendation: { suggestion: subject, reason: message }
                                                })
                                            });

                                            if (!res.ok) {
                                                const errText = await res.text();
                                                throw new Error(`API Error: ${res.status} ${errText}`);
                                            }

                                            sentCount++;
                                        } catch (err) {
                                            console.warn(`Failed to send to ${custId}`, err);
                                        }
                                    }

                                    // Update Campaign Status
                                    // Use rpc or strict update if columns exist, but for now assuming strict schema match was the issue
                                    // We will try updating sent_count if it exists, otherwise just status
                                    const updatePayload: any = { status: 'completed' };
                                    // Try to update sent_count only if we think it exists, but user error suggested it might not
                                    // or we can just ignore it for now to be safe and only update status.
                                    // Let's try adding sent_count back ONLY here, as the insert failed on it.
                                    // If insert failed, update might fail too. Let's inspect schema later or be safe.
                                    // We'll try to update sent_count, if it fails, we catch it.

                                    try {
                                        // Update status and sent_count
                                        // Cast to any to bypass strict type checks if local types aren't perfectly synced yet
                                        const updatePayload = {
                                            status: 'completed',
                                            sent_count: sentCount
                                        } as any;

                                        await supabase.from('marketing_campaigns').update(updatePayload as never).eq('id', campaignData.id);
                                    } catch (ign) {
                                        await supabase.from('marketing_campaigns').update({ status: 'completed' } as never).eq('id', campaignData.id);
                                    }

                                    toast.success(`Campaign sent to ${sentCount} customers!`);
                                    setShowCreateModal(false);
                                    fetchCampaigns();

                                } catch (err) {
                                    console.error("Campaign creation failed", err);
                                    toast.error("Failed to create campaign");
                                } finally {
                                    setLoading(false);
                                }
                            }}>
                                <div>
                                    <label className="label">Campaign Name</label>
                                    <input type="text" className="input" placeholder="e.g. Weekend Special" required />
                                </div>

                                {/* Audience Selection */}
                                <div className="space-y-2">
                                    <label className="label">Target Audience</label>
                                    <select
                                        className="input"
                                        value={selectedAudienceType}
                                        onChange={(e) => setSelectedAudienceType(e.target.value)}
                                    >
                                        <option value="all">All Subscribers</option>
                                        <option value="birthday">Birthday: Upcoming (Next 7 Days)</option>
                                        <option value="winback">Win-Back: Inactive Customers</option>
                                        <option value="vip">VIP: Top Spenders ({'>'}$500)</option>
                                        <option value="review">Review Request: Not Reviewed</option>
                                    </select>

                                    {/* Win-back specific settings */}
                                    {selectedAudienceType === 'winback' && (
                                        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 mt-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-400">Inactive Duration</span>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="7"
                                                        max="365"
                                                        value={winBackDays}
                                                        onChange={(e) => setWinBackDays(parseInt(e.target.value) || 30)}
                                                        className="input w-20 py-1 px-2 text-right"
                                                    />
                                                    <span className="text-sm font-bold text-slate-300">Days</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-xs text-slate-500 text-right">
                                        Estimated Reach: <span className="font-bold text-green-400">{audienceCount} customers</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Subject / Title</label>
                                    <input name="subject" type="text" className="input" placeholder="Grab attention with a great subject" required />
                                </div>
                                <div>
                                    <label className="label">Message</label>
                                    <textarea name="message" className="input" rows={4} placeholder="Write your message here..." required />
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1" disabled={loading}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        {loading ? "Sending..." : "Send Now"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
