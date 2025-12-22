"use client";

import { useTranslation } from "react-i18next";
import {
    Users,
    Gift,
    MessageSquare,
    Sparkles,
    Send,
    TrendingUp,
    Star,
    Heart,
    ChevronRight
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

// Quick stats
const stats = {
    totalCustomers: 4239,
    loyaltyMembers: 1247,
    avgRating: 4.3,
    repeatRate: 67
};

const quickLinks = [
    {
        href: "/dashboard/customers/loyalty",
        icon: Gift,
        label: "Loyalty Program",
        description: "Manage tiers, rewards & points",
        color: "orange"
    },
    {
        href: "/dashboard/customers/feedback",
        icon: MessageSquare,
        label: "Customer Feedback",
        description: "Reviews & sentiment tracking",
        color: "blue"
    },
    {
        href: "/dashboard/customers/recommendations",
        icon: Sparkles,
        label: "AI Recommendations",
        description: "Personalized suggestions",
        color: "purple"
    },
    {
        href: "/dashboard/customers/marketing",
        icon: Send,
        label: "Marketing Hub",
        description: "Email, SMS & push campaigns",
        color: "green"
    },
];

// Top customers
const topCustomers = [
    { name: "Sarah Mitchell", visits: 24, spent: 1240.50, tier: "Gold" },
    { name: "Mike Johnson", visits: 18, spent: 892.00, tier: "Silver" },
    { name: "Emily Chen", visits: 15, spent: 675.25, tier: "Silver" },
    { name: "David Wilson", visits: 12, spent: 520.00, tier: "Bronze" },
];

export default function CustomersPage() {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Users className="h-8 w-8 text-orange-500" />
                    Customers
                </h1>
                <p className="text-slate-400 mt-1">
                    Build relationships, drive loyalty, and grow your customer base
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card text-center">
                    <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.totalCustomers.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Total Customers</p>
                </div>
                <div className="card text-center">
                    <Gift className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.loyaltyMembers.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Loyalty Members</p>
                </div>
                <div className="card text-center">
                    <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.avgRating}</p>
                    <p className="text-xs text-slate-500 mt-1">Avg Rating</p>
                </div>
                <div className="card text-center">
                    <Heart className="h-6 w-6 text-pink-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.repeatRate}%</p>
                    <p className="text-xs text-slate-500 mt-1">Repeat Rate</p>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="card hover:border-orange-500/50 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl bg-${link.color}-500/10`}>
                                <link.icon className={`h-6 w-6 text-${link.color}-400`} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold group-hover:text-orange-400 transition-colors">
                                    {link.label}
                                </h3>
                                <p className="text-sm text-slate-500">{link.description}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-orange-400 transition-colors" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Top Customers */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold">Top Customers</h3>
                    <button className="text-sm text-orange-400 hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Visits</th>
                                <th className="px-4 py-3">Total Spent</th>
                                <th className="px-4 py-3">Tier</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {topCustomers.map((customer, i) => (
                                <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold">
                                                {customer.name.split(" ").map(n => n[0]).join("")}
                                            </div>
                                            <span className="font-medium">{customer.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono">{customer.visits}</td>
                                    <td className="px-4 py-3 font-mono text-green-400">{formatCurrency(customer.spent)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`badge text-xs ${customer.tier === "Gold" ? "bg-yellow-500/20 text-yellow-400" :
                                                customer.tier === "Silver" ? "bg-slate-400/20 text-slate-300" :
                                                    "bg-amber-700/20 text-amber-500"
                                            }`}>
                                            {customer.tier}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
