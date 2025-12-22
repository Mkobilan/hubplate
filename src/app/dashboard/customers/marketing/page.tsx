"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Mail,
    MessageSquare,
    Bell,
    Users,
    Send,
    Calendar,
    Plus,
    Edit2,
    Trash2,
    BarChart3,
    Eye,
    MousePointerClick,
    Clock,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock campaigns
const mockCampaigns = [
    {
        id: "1",
        name: "Weekend Special Promo",
        type: "email",
        status: "active",
        audience: 1247,
        sent: 1180,
        opened: 456,
        clicked: 89,
        scheduledFor: null
    },
    {
        id: "2",
        name: "Happy Hour Reminder",
        type: "sms",
        status: "scheduled",
        audience: 892,
        sent: 0,
        opened: 0,
        clicked: 0,
        scheduledFor: "Dec 23, 5:00 PM"
    },
    {
        id: "3",
        name: "New Menu Launch",
        type: "push",
        status: "completed",
        audience: 2100,
        sent: 2100,
        opened: 1245,
        clicked: 312,
        scheduledFor: null
    },
];

const quickActions = [
    { id: "birthday", label: "Birthday Offer", icon: "🎂", description: "Auto-send on customer birthdays" },
    { id: "winback", label: "Win-Back Campaign", icon: "💔", description: "Re-engage inactive customers" },
    { id: "vip", label: "VIP Exclusive", icon: "👑", description: "Special offers for top customers" },
    { id: "review", label: "Review Request", icon: "⭐", description: "Ask for reviews after visits" },
];

export default function MarketingPage() {
    const { t } = useTranslation();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [campaignType, setCampaignType] = useState<"email" | "sms" | "push">("email");

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
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                    <Plus className="h-4 w-4" />
                    New Campaign
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card text-center">
                    <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">4,239</p>
                    <p className="text-xs text-slate-500 mt-1">Total Subscribers</p>
                </div>
                <div className="card text-center">
                    <Eye className="h-6 w-6 text-green-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">38.6%</p>
                    <p className="text-xs text-slate-500 mt-1">Avg Open Rate</p>
                </div>
                <div className="card text-center">
                    <MousePointerClick className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">7.5%</p>
                    <p className="text-xs text-slate-500 mt-1">Avg Click Rate</p>
                </div>
                <div className="card text-center">
                    <Send className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">12</p>
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
                    {mockCampaigns.map((campaign) => (
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
                                            campaign.status === "active" && "bg-green-500/20 text-green-400",
                                            campaign.status === "scheduled" && "bg-amber-500/20 text-amber-400",
                                            campaign.status === "completed" && "bg-slate-500/20 text-slate-400"
                                        )}>
                                            {campaign.status}
                                        </span>
                                        {campaign.scheduledFor && (
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {campaign.scheduledFor}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                {campaign.status !== "scheduled" && (
                                    <div className="hidden md:flex gap-4 text-sm">
                                        <div className="text-center">
                                            <p className="font-bold">{campaign.sent.toLocaleString()}</p>
                                            <p className="text-xs text-slate-500">Sent</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-green-400">{campaign.opened.toLocaleString()}</p>
                                            <p className="text-xs text-slate-500">Opened</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-orange-400">{campaign.clicked}</p>
                                            <p className="text-xs text-slate-500">Clicked</p>
                                        </div>
                                    </div>
                                )}
                                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                                    <BarChart3 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Campaign Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
                    <div className="relative card w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-6">Create Campaign</h2>

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

                        <form className="space-y-4">
                            <div>
                                <label className="label">Campaign Name</label>
                                <input type="text" className="input" placeholder="e.g. Weekend Special" />
                            </div>
                            <div>
                                <label className="label">Subject / Title</label>
                                <input type="text" className="input" placeholder="Grab attention with a great subject" />
                            </div>
                            <div>
                                <label className="label">Message</label>
                                <textarea className="input" rows={4} placeholder="Write your message here..." />
                            </div>
                            <div>
                                <label className="label">Audience</label>
                                <select className="input">
                                    <option>All Subscribers (4,239)</option>
                                    <option>Loyalty Members (1,247)</option>
                                    <option>Inactive 30+ Days (523)</option>
                                    <option>VIP Customers (89)</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    <Send className="h-4 w-4" />
                                    Send Now
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
