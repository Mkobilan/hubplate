"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "react-i18next";
import {
    Users,
    Gift,
    MessageSquare,
    Sparkles,
    Send,
    Star,
    Heart,
    ChevronRight,
    Plus,
    X,
    QrCode
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

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

export default function CustomersPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [customerStats, setCustomerStats] = useState({
        totalCustomers: 0,
        loyaltyMembers: 0,
        avgRating: 0,
        repeatRate: 0
    });
    const [topCustomers, setTopCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [tableNumber, setTableNumber] = useState("");
    const [showQr, setShowQr] = useState(false);
    const [enrollmentUrl, setEnrollmentUrl] = useState("");
    const [showAllModal, setShowAllModal] = useState(false);
    const [allCustomers, setAllCustomers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            // 1. Fetch Customer Count & Loyalty Count
            const { count: totalCount, error: totalError } = await supabase
                .from("customers")
                .select("*", { count: 'exact', head: true })
                .eq("location_id", currentLocation.id);

            const { count: loyaltyCount, error: loyaltyError } = await supabase
                .from("customers")
                .select("*", { count: 'exact', head: true })
                .eq("location_id", currentLocation.id)
                .eq("is_loyalty_member", true);

            // 2. Fetch Avg Rating
            const { data: feedback, error: feedbackError } = await supabase
                .from("customer_feedback")
                .select("rating")
                .eq("location_id", currentLocation.id);

            // 3. Fetch Top Customers
            const { data: topCust, error: topError } = await supabase
                .from("customers")
                .select("*")
                .eq("location_id", currentLocation.id)
                .order("total_spent", { ascending: false })
                .limit(5);

            if (totalError || loyaltyError || feedbackError || topError) {
                console.error("Error fetching customer data");
            }

            const avgRating = feedback && feedback.length > 0
                ? (feedback as any[]).reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length
                : 0;

            setCustomerStats({
                totalCustomers: totalCount || 0,
                loyaltyMembers: loyaltyCount || 0,
                avgRating: Math.round(avgRating * 10) / 10,
                repeatRate: totalCount ? Math.round((loyaltyCount || 0) / totalCount * 100) : 0
            });
            setTopCustomers(topCust || []);
            setAllCustomers(topCust || []); // Initial load

        } catch (err) {
            console.error("Error fetching customers:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllCustomers = async () => {
        if (!currentLocation) return;
        try {
            const supabase = createClient();
            const { data } = await supabase
                .from("customers")
                .select("*")
                .eq("location_id", currentLocation.id)
                .order("total_spent", { ascending: false });
            setAllCustomers(data || []);
        } catch (err) {
            console.error("Error fetching all customers:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentLocation?.id]);

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view customers.</p>
                <button onClick={() => window.location.href = "/dashboard/locations"} className="btn-primary">
                    Go to Locations
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Users className="h-8 w-8 text-orange-500" />
                    Customers
                </h1>
                <p className="text-slate-400 mt-1">
                    {currentLocation.name} - Build relationships and drive loyalty
                </p>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary"
                >
                    <Plus className="h-4 w-4" />
                    Add Customer
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card text-center">
                    <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{customerStats.totalCustomers.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Total Customers</p>
                </div>
                <div className="card text-center">
                    <Gift className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{customerStats.loyaltyMembers.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Loyalty Members</p>
                </div>
                <div className="card text-center">
                    <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{customerStats.avgRating}</p>
                    <p className="text-xs text-slate-500 mt-1">Avg Rating</p>
                </div>
                <div className="card text-center">
                    <Heart className="h-6 w-6 text-pink-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{customerStats.repeatRate}%</p>
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
                    <button
                        onClick={() => {
                            fetchAllCustomers();
                            setShowAllModal(true);
                        }}
                        className="text-sm text-orange-400 hover:underline"
                    >
                        View All
                    </button>
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
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                                    </td>
                                </tr>
                            ) : topCustomers.length > 0 ? (
                                topCustomers.map((customer, i) => (
                                    <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold">
                                                    {(customer.first_name?.[0] || "") + (customer.last_name?.[0] || "") || "U"}
                                                </div>
                                                <span className="font-medium">
                                                    {customer.first_name} {customer.last_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono">{customer.total_visits || 0}</td>
                                        <td className="px-4 py-3 font-mono text-green-400">{formatCurrency(customer.total_spent)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`badge text-xs ${customer.loyalty_tier?.toLowerCase() === "gold" ? "bg-yellow-500/20 text-yellow-400" :
                                                customer.loyalty_tier?.toLowerCase() === "silver" ? "bg-slate-400/20 text-slate-300" :
                                                    "bg-amber-700/20 text-amber-500"
                                                }`}>
                                                {customer.loyalty_tier || "Bronze"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                                        No customer data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Customer Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => { setShowAddModal(false); setShowQr(false); }} />
                    <div className="relative card w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">
                                {showQr ? "Customer Enrollment QR" : "Add New Customer"}
                            </h2>
                            <button onClick={() => { setShowAddModal(false); setShowQr(false); }} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {!showQr ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-400">
                                    Enter the table number to generate an enrollment QR code for the customer.
                                </p>
                                <div>
                                    <label className="label">Table Number</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g. 12"
                                        value={tableNumber}
                                        onChange={(e) => setTableNumber(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        if (!currentLocation) return;
                                        const url = `${window.location.origin}/enroll/${currentLocation.id}/${useAppStore.getState().currentEmployee?.id}?table=${tableNumber}`;
                                        setEnrollmentUrl(url);
                                        setShowQr(true);
                                    }}
                                    className="btn-primary w-full"
                                    disabled={!tableNumber}
                                >
                                    <QrCode className="h-4 w-4" />
                                    Generate QR Code
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6 py-4">
                                <div className="p-6 bg-white rounded-2xl shadow-xl">
                                    <QRCodeSVG value={enrollmentUrl} size={256} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-lg">Table {tableNumber}</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Ask the customer to scan this code with their phone camera to join the loyalty program.
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setShowAddModal(false); setShowQr(false); }}
                                    className="btn-secondary w-full"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View All Customers Modal */}
            {showAllModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowAllModal(false)} />
                    <div className="relative card w-full max-w-4xl max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">All Customers</h2>
                            <button onClick={() => setShowAllModal(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <input
                                type="text"
                                className="input"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-slate-900">
                                    <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Visits</th>
                                        <th className="px-4 py-3">Total Spent</th>
                                        <th className="px-4 py-3">Points</th>
                                        <th className="px-4 py-3">Tier</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {allCustomers
                                        .filter(c =>
                                            `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((customer, i) => (
                                            <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold">
                                                            {(customer.first_name?.[0] || "") + (customer.last_name?.[0] || "") || "U"}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{customer.first_name} {customer.last_name}</div>
                                                            <div className="text-xs text-slate-500">{customer.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-mono">{customer.total_visits || 0}</td>
                                                <td className="px-4 py-3 font-mono text-green-400">{formatCurrency(customer.total_spent)}</td>
                                                <td className="px-4 py-3 font-mono">{customer.loyalty_points || 0}</td>
                                                <td className="px-4 py-3 uppercase text-xs font-bold text-slate-400">
                                                    {customer.loyalty_tier || 'bronze'}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
