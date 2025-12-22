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
    Reply,
    Flag,
    MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock feedback data
const mockFeedback = [
    {
        id: "1",
        customer: "Sarah M.",
        rating: 5,
        comment: "Amazing food and service! The grilled salmon was perfectly cooked. Will definitely be back!",
        date: "2025-12-21",
        source: "pay-at-table",
        replied: true
    },
    {
        id: "2",
        customer: "John D.",
        rating: 4,
        comment: "Great burgers, but the wait was a bit long. Food made up for it though!",
        date: "2025-12-20",
        source: "google",
        replied: false
    },
    {
        id: "3",
        customer: "Emily R.",
        rating: 2,
        comment: "Ordered wings and they came out cold. Server was nice about it but disappointed.",
        date: "2025-12-19",
        source: "yelp",
        replied: true
    },
    {
        id: "4",
        customer: "Mike T.",
        rating: 5,
        comment: "Best happy hour in town! Love the $5 craft beers and the loaded nachos.",
        date: "2025-12-18",
        source: "pay-at-table",
        replied: false
    },
];

const sentimentStats = {
    positive: 78,
    neutral: 15,
    negative: 7,
    avgRating: 4.3,
    totalReviews: 156,
    responseRate: 82
};

export default function FeedbackPage() {
    const { t } = useTranslation();
    const [filter, setFilter] = useState<"all" | "positive" | "negative">("all");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredFeedback = mockFeedback.filter(fb => {
        if (filter === "positive" && fb.rating < 4) return false;
        if (filter === "negative" && fb.rating >= 4) return false;
        if (searchQuery && !fb.comment.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card text-center">
                    <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{sentimentStats.avgRating}</p>
                    <p className="text-xs text-slate-500 mt-1">Average Rating</p>
                </div>
                <div className="card text-center">
                    <ThumbsUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-green-400">{sentimentStats.positive}%</p>
                    <p className="text-xs text-slate-500 mt-1">Positive</p>
                </div>
                <div className="card text-center">
                    <ThumbsDown className="h-6 w-6 text-red-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-red-400">{sentimentStats.negative}%</p>
                    <p className="text-xs text-slate-500 mt-1">Negative</p>
                </div>
                <div className="card text-center">
                    <Reply className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{sentimentStats.responseRate}%</p>
                    <p className="text-xs text-slate-500 mt-1">Response Rate</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search feedback..."
                        className="input pl-10"
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
                {filteredFeedback.map((fb) => (
                    <div key={fb.id} className="card">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold shrink-0">
                                    {fb.customer.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-bold">{fb.customer}</span>
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
                                            fb.source === "yelp" && "bg-red-500/20 text-red-400"
                                        )}>
                                            {fb.source}
                                        </span>
                                    </div>
                                    <p className="text-slate-300">{fb.comment}</p>
                                    <p className="text-xs text-slate-500 mt-2">{fb.date}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {fb.replied ? (
                                    <span className="text-xs text-green-400 flex items-center gap-1">
                                        <Reply className="h-3 w-3" /> Replied
                                    </span>
                                ) : (
                                    <button className="btn-secondary text-xs py-1">
                                        <Reply className="h-3 w-3" />
                                        Reply
                                    </button>
                                )}
                                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
