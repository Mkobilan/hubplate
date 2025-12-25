"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    MessageSquare,
    Star,
    ThumbsUp,
    ThumbsDown,
    TrendingUp,
    TrendingDown,
    Calendar,
    Filter,
    Search,
    Flag
} from "lucide-react";
import { cn } from "@/lib/utils";

// TODO: Replace with Supabase query
const mockFeedback: {
    id: string;
    customer: string;
    rating: number;
    comment: string;
    date: string;
    source: string;
    replied: boolean;
}[] = [];

const sentimentStats = {
    positive: 0,
    neutral: 0,
    negative: 0,
    avgRating: 0,
    totalReviews: 0,
    responseRate: 0
};

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

export default function FeedbackPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [filter, setFilter] = useState<"all" | "positive" | "negative">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [feedback, setFeedback] = useState<any[]>([]);
    const [stats, setStats] = useState({
        positive: 0,
        neutral: 0,
        negative: 0,
        avgRating: 0,
        totalReviews: 0,
        responseRate: 0
    });
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);


    const fetchFeedbackData = useCallback(async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error } = await supabase
                .from('customer_feedback')
                .select('*')
                .eq('location_id', currentLocation.id)
                .order('created_at', { ascending: false });


            if (error) throw error;

            const fbList = (data as any[]) || [];
            setFeedback(fbList);

            // Calculate stats
            if (fbList.length > 0) {
                const total = fbList.length;
                const pos = fbList.filter(f => (f.rating || 0) >= 4).length;
                const neg = fbList.filter(f => (f.rating || 0) <= 2).length;
                const neu = total - pos - neg;
                const avg = fbList.reduce((sum, f) => sum + (f.rating || 0), 0) / total;
                const replied = fbList.filter(f => f.replied).length;


                setStats({
                    positive: Math.round((pos / total) * 100),
                    negative: Math.round((neg / total) * 100),
                    neutral: Math.round((neu / total) * 100),
                    avgRating: Number(avg.toFixed(1)),
                    totalReviews: total,
                    responseRate: Math.round((replied / total) * 100)
                });
            }
        } catch (error) {
            console.error('Error fetching feedback:', error);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }

    }, [currentLocation]);

    useEffect(() => {
        fetchFeedbackData();
    }, [fetchFeedbackData]);

    const filteredFeedback = feedback.filter(fb => {
        if (filter === "positive" && fb.rating < 4) return false;
        if (filter === "negative" && fb.rating >= 4) return false;
        if (searchQuery && !(fb.comment || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageSquare className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view customer feedback.</p>
                <button
                    onClick={() => window.location.href = "/dashboard/locations"}
                    className="btn btn-primary"
                >
                    Go to Locations
                </button>
            </div>
        );
    }

    if (initialLoad && loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <MessageSquare className="h-8 w-8 text-orange-500" />
                        Customer Feedback
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Monitor reviews, respond to feedback, and track customer sentiment
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

                <div className="card text-center">
                    <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.avgRating}</p>
                    <p className="text-xs text-slate-500 mt-1">Average Rating</p>
                </div>
                <div className="card text-center">
                    <ThumbsUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-green-400">{stats.positive}%</p>
                    <p className="text-xs text-slate-500 mt-1">Positive</p>
                </div>
                <div className="card text-center">
                    <ThumbsDown className="h-6 w-6 text-red-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-red-400">{stats.negative}%</p>
                    <p className="text-xs text-slate-500 mt-1">Negative</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search feedback..."
                        className="input !pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {(["all", "positive", "negative"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                filter === f
                                    ? "bg-orange-500 text-white"
                                    : "bg-slate-800 hover:bg-slate-700"
                            )}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Feedback List */}
            <div className="space-y-4">
                {filteredFeedback.length > 0 ? (
                    filteredFeedback.map((fb) => (
                        <div key={fb.id} className="card">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold shrink-0">
                                        {(fb.customer_name || "A").charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-bold">{fb.customer_name || "Anonymous"}</span>
                                            <div className="flex gap-0.5">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={cn(
                                                            "h-4 w-4",
                                                            i < fb.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-700"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <span className={cn(
                                                "text-xs px-2 py-0.5 rounded-full",
                                                fb.source === "pay-at-table" && "bg-orange-500/20 text-orange-400",
                                                fb.source === "google" && "bg-blue-500/20 text-blue-400",
                                                fb.source === "yelp" && "bg-red-500/20 text-red-400" || "bg-slate-800 text-slate-400"
                                            )}>
                                                {fb.source || "Web"}
                                            </span>
                                        </div>
                                        <p className="text-slate-300">{fb.comment}</p>
                                        <p className="text-xs text-slate-500 mt-2">{fb.created_at && format(new Date(fb.created_at), 'MMM d, yyyy')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card text-center py-12">
                        <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No feedback found</h3>
                        <p className="text-slate-500">
                            Customer reviews and feedback will appear here as they come in.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
