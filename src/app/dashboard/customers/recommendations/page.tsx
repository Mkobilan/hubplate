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
    Loader2,
    Copy,
    Mail,
    Phone
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// TODO: Replace with Supabase query


import { useEffect, useCallback } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

export default function RecommendationsPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [customPrompt, setCustomPrompt] = useState("");
    const [aiResult, setAiResult] = useState<any>(null);
    const [sendingType, setSendingType] = useState<'email' | 'sms' | null>(null);

    // Fetch list of customers
    const fetchCustomers = useCallback(async () => {
        if (!currentLocation) return;
        try {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('location_id', currentLocation.id)
                .order('total_visits', { ascending: false })
                .limit(20);

            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    }, [currentLocation]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    // Generate Recommendations
    const handleGenerate = async () => {
        if (!selectedCustomerId) return;

        setIsGenerating(true);
        setAiResult(null);

        try {
            const supabase = createClient();
            const customer = customers.find(c => c.id === selectedCustomerId);

            // Fetch order history for context
            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .eq('customer_id', selectedCustomerId)
                .order('created_at', { ascending: false })
                .limit(20);
            // We're assuming 'items' jsonb column exists or we might miss item details if they are in a separate table.
            // However, previous tasks consolidated items into 'orders' table JSONB.

            const response = await fetch('/api/ai/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer,
                    orders: orders || [],
                    customPrompt
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to generate");
            }

            const data = await response.json();
            setAiResult(data);

        } catch (error: any) {
            console.error("Error generating insights:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendPromo = async (type: 'email' | 'sms') => {
        const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
        if (!selectedCustomer) return;

        const target = type === 'email' ? selectedCustomer.email : selectedCustomer.phone;
        if (!target) {
            toast.error(`No ${type} on file for this customer.`);
            return;
        }

        setSendingType(type);

        if (type === 'email') {
            try {
                const response = await fetch("/api/email/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customerId: selectedCustomerId,
                        promoCode: aiResult.suggested_promo.code,
                        type: 'ai-recommendation',
                        recommendation: {
                            reason: aiResult.suggested_promo.message,
                            suggestion: aiResult.suggested_promo.offer
                        }
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Failed to send email");
                }

                toast.success(`Promo sent to ${target} via email!`);
            } catch (err: any) {
                console.error("Error sending email:", err);
                toast.error(err.message || "Failed to send email");
            } finally {
                setSendingType(null);
            }
        } else {
            // Simulate SMS for now as we don't have an SMS integration yet
            setTimeout(() => {
                toast.success(`Promo sent to ${target} via SMS!`);
                console.log(`[SIMULATION] Sent promo to ${target} via SMS`);
                setSendingType(null);
            }, 1500);
        }
    };

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-orange-500" />
                        AI Recommendations
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Select a customer, define your goal, and let AI generate personalized strategies.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Customer List Sidebar */}
                <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                        <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">
                            Select Customer
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                            </div>
                        ) : customers.length > 0 ? (
                            customers.map((cust) => (
                                <div
                                    key={cust.id}
                                    onClick={() => {
                                        setSelectedCustomerId(cust.id);
                                        setAiResult(null); // Reset results on change
                                    }}
                                    className={cn(
                                        "p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3",
                                        selectedCustomerId === cust.id
                                            ? "bg-orange-600 text-white shadow-md shadow-orange-900/20"
                                            : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedCustomerId === cust.id ? "bg-white/20 text-white" : "bg-slate-800"
                                        }`}>
                                        {(cust.first_name?.[0] || "") + (cust.last_name?.[0] || "") || "U"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{cust.first_name} {cust.last_name}</p>
                                        <p className={`text-[10px] ${selectedCustomerId === cust.id ? "text-orange-100" : "text-slate-500"}`}>
                                            {cust.total_visits} visits
                                        </p>
                                    </div>
                                    {selectedCustomerId === cust.id && <ChevronRight className="h-4 w-4 opacity-50" />}
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-6">No customers found</p>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-9 flex flex-col gap-6 overflow-y-auto pr-2">
                    {selectedCustomer ? (
                        <>
                            {/* Input / Controls Section */}
                            <div className="card bg-slate-900/30 border-orange-500/20">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-xl font-bold shrink-0">
                                        {(selectedCustomer.first_name?.[0] || "") + (selectedCustomer.last_name?.[0] || "") || "U"}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold flex items-center gap-2">
                                            {selectedCustomer.first_name} {selectedCustomer.last_name}
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal border border-slate-700">
                                                {selectedCustomer.loyalty_tier || "Bronze"}
                                            </span>
                                        </h2>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Total Spent: <span className="text-green-400 font-mono">{formatCurrency(selectedCustomer.total_spent)}</span> •
                                            Last Visit: {selectedCustomer.updated_at ? format(new Date(selectedCustomer.updated_at), 'MMM d, yyyy') : 'N/A'}
                                        </p>

                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-slate-300">
                                                What is your goal for this customer?
                                            </label>
                                            <div className="flex gap-2">
                                                <textarea
                                                    value={customPrompt}
                                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                                    placeholder="E.g., 'Push our new dessert menu', 'Encourage a return visit next week', 'Suggest vegan options'..."
                                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 min-h-[50px] resize-none"
                                                />
                                                <button
                                                    onClick={handleGenerate}
                                                    disabled={isGenerating}
                                                    className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white px-6 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 w-40"
                                                >
                                                    {isGenerating ? (
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Sparkles className="h-5 w-5" />
                                                            Analyze
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Results Section */}
                            {aiResult ? (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

                                    {/* Analysis Summary */}
                                    <div className="p-5 rounded-xl bg-purple-900/10 border border-purple-500/30">
                                        <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                                            <User className="h-4 w-4" /> Customer Analysis
                                        </h3>
                                        <p className="text-slate-200 leading-relaxed">
                                            {aiResult.analysis}
                                        </p>
                                    </div>

                                    {/* Recommendations Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Menu Suggestions */}
                                        <div className="space-y-4">
                                            <h3 className="font-bold text-slate-400 uppercase text-xs tracking-wider">Menu Suggestions</h3>
                                            {aiResult.recommendations?.map((rec: any, i: number) => (
                                                <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-lg text-white">{rec.item}</span>
                                                        <span className="text-xs font-bold px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                                                            {rec.confidence}% Match
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-400">{rec.reason}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Promo Generator */}
                                        <div className="space-y-4">
                                            <h3 className="font-bold text-slate-400 uppercase text-xs tracking-wider">Suggested Campaign</h3>
                                            {aiResult.suggested_promo && (
                                                <div className="p-6 rounded-xl bg-gradient-to-br from-orange-500/10 to-pink-500/10 border border-orange-500/30 h-full flex flex-col justify-between">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <p className="text-xs text-orange-400 font-bold uppercase mb-1">Offer</p>
                                                            <p className="text-xl font-bold">{aiResult.suggested_promo.offer}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-orange-400 font-bold uppercase mb-1">Message</p>
                                                            <p className="italic text-slate-300">"{aiResult.suggested_promo.message}"</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-6 pt-4 border-t border-slate-700/50 flex flex-col gap-3">
                                                        <div className="flex items-center justify-between">
                                                            <code className="text-lg font-mono font-bold text-white bg-black/30 px-3 py-1 rounded">
                                                                {aiResult.suggested_promo.code}
                                                            </code>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(aiResult.suggested_promo.code);
                                                                    toast.success("Promo code copied!");
                                                                }}
                                                                className="text-xs font-bold flex items-center gap-1 hover:text-white text-slate-400 transition-colors"
                                                            >
                                                                <Copy className="h-3 w-3" /> Copy Code
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                                            <button
                                                                onClick={() => handleSendPromo('email')}
                                                                disabled={sendingType !== null || !selectedCustomer?.email}
                                                                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                                                                title={selectedCustomer?.email || "No email on file"}
                                                            >
                                                                {sendingType === 'email' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3 text-blue-400 group-hover:text-blue-300" />}
                                                                Email
                                                            </button>
                                                            <button
                                                                onClick={() => handleSendPromo('sms')}
                                                                disabled={sendingType !== null || !selectedCustomer?.phone}
                                                                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                                                                title={selectedCustomer?.phone || "No phone on file"}
                                                            >
                                                                {sendingType === 'sms' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3 text-green-400 group-hover:text-green-300" />}
                                                                SMS
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                !isGenerating && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 min-h-[300px] border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                                        <Sparkles className="h-12 w-12 opacity-20 mb-4" />
                                        <p>Ready to analyze. Enter a goal above or just click <b>Analyze</b>.</p>
                                    </div>
                                )
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                            <span className="p-4 rounded-full bg-slate-900 mb-4">
                                <User className="h-8 w-8 opacity-50" />
                            </span>
                            <h3 className="text-xl font-bold text-slate-300">No Customer Selected</h3>
                            <p>Choose a customer from the sidebar to start.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
