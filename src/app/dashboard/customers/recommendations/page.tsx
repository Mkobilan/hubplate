"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Sparkles,
    User,
    ShoppingBag,
    Clock,
    TrendingUp,
    Heart,
    RefreshCw,
    ChevronRight,
    Star,
    Loader2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// TODO: Replace with Supabase query
const mockCustomers: {
    id: string;
    name: string;
    email: string;
    visits: number;
    avgSpend: number;
    favoriteItems: string[];
    recommendations: { item: string; reason: string; confidence: number }[];
    lastVisit: string;
}[] = [];

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

export default function RecommendationsPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('location_id', currentLocation.id)
                .order('visits', { ascending: false })
                .limit(10);

            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching recommendations data:', error);
        } finally {
            setLoading(false);
        }
    }, [currentLocation]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRegenerate = () => {
        setIsGenerating(true);
        setTimeout(() => setIsGenerating(false), 2000);
    };

    const customer = customers.find(c => c.id === selectedCustomer);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-orange-500" />
                        AI Recommendations
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Personalized menu suggestions based on customer preferences and order history
                    </p>
                </div>
                <button
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="btn-primary"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="h-4 w-4" />
                            Refresh All
                        </>
                    )}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer List */}
                <div className="space-y-4">
                    <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">
                        Recent Customers
                    </h3>
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                        </div>
                    ) : customers.length > 0 ? (
                        customers.map((cust) => (
                            <div
                                key={cust.id}
                                onClick={() => setSelectedCustomer(cust.id)}
                                className={cn(
                                    "card cursor-pointer transition-all",
                                    selectedCustomer === cust.id
                                        ? "border-orange-500 bg-orange-500/5"
                                        : "hover:border-slate-700"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold">
                                        {(cust.name || "U").split(" ").map((n: string) => n[0]).join("")}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{cust.name}</p>
                                        <p className="text-xs text-slate-500">{cust.visits} visits • {cust.last_visit ? format(new Date(cust.last_visit), 'MMM d') : 'Never'}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-600" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-6">No customers found</p>
                    )}
                </div>

                {/* Customer Details & Recommendations */}
                <div className="lg:col-span-2 space-y-6">
                    {customer ? (
                        <>
                            {/* Customer Profile */}
                            <div className="card">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-2xl font-bold">
                                            {(customer.name || "U").split(" ").map((n: string) => n[0]).join("")}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">{customer.name}</h2>
                                            <p className="text-sm text-slate-500">{customer.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="text-center p-3 bg-slate-900/50 rounded-xl">
                                        <ShoppingBag className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                                        <p className="text-lg font-bold">{customer.visits}</p>
                                        <p className="text-xs text-slate-500">Visits</p>
                                    </div>
                                    <div className="text-center p-3 bg-slate-900/50 rounded-xl">
                                        <TrendingUp className="h-5 w-5 text-green-400 mx-auto mb-1" />
                                        <p className="text-lg font-bold">{formatCurrency(customer.total_spent / (customer.visits || 1))}</p>
                                        <p className="text-xs text-slate-500">Avg Spend</p>
                                    </div>
                                    <div className="text-center p-3 bg-slate-900/50 rounded-xl">
                                        <Clock className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                                        <p className="text-lg font-bold">{customer.last_visit ? format(new Date(customer.last_visit), 'MMM d') : 'Never'}</p>
                                        <p className="text-xs text-slate-500">Last Visit</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-500 mb-2">Favorite Items</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(customer.favorite_items as string[] || []).map((item: string) => (
                                            <span key={item} className="flex items-center gap-1 px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-sm">
                                                <Heart className="h-3 w-3" />
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* AI Recommendations */}
                            <div className="card border-orange-500/20 bg-orange-500/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="h-5 w-5 text-orange-400" />
                                    <h3 className="font-bold">AI Recommendations</h3>
                                </div>
                                <div className="space-y-3">
                                    {(customer.recommendations as any[] || []).map((rec: any, i: number) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800"
                                        >
                                            <div>
                                                <p className="font-bold">{rec.item}</p>
                                                <p className="text-sm text-slate-500">{rec.reason}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                                    <span className="font-bold">{rec.confidence}%</span>
                                                </div>
                                                <p className="text-xs text-slate-500">match</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="card text-center py-12">
                            <User className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Select a Customer</h3>
                            <p className="text-slate-500">
                                Choose a customer from the list to view their personalized recommendations
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
