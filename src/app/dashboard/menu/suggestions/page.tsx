"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Sparkles,
    TrendingUp,
    DollarSign,
    Users,
    Clock,
    ChefHat,
    Plus,
    ThumbsUp,
    ThumbsDown,
    ArrowRight,
    Loader2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Type definition for AI menu suggestions
type MenuSuggestion = {
    id: string;
    name: string;
    description: string;
    reasoning: string;
    estimatedProfit: number;
    popularity: string;
    difficulty: string;
    prepTime: string;
};

// TODO: Fetch from Gemini AI API
const suggestions: MenuSuggestion[] = [];

export default function AISuggestionsPage() {
    const { t } = useTranslation();
    const [isGenerating, setIsGenerating] = useState(false);
    const [feedback, setFeedback] = useState<Record<string, "up" | "down" | null>>({});

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => setIsGenerating(false), 2000);
    };

    const handleFeedback = (id: string, type: "up" | "down") => {
        setFeedback(prev => ({ ...prev, [id]: prev[id] === type ? null : type }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-orange-500" />
                        AI Menu Suggestions
                    </h1>
                    <p className="text-slate-400 mt-1">
                        AI-powered new menu item ideas based on trends, inventory, and your restaurant&apos;s style
                    </p>
                </div>
                <button
                    onClick={handleGenerate}
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
                            <Sparkles className="h-4 w-4" />
                            Generate New Ideas
                        </>
                    )}
                </button>
            </div>

            {/* Context Banner */}
            <div className="card border-blue-500/30 bg-blue-500/5 p-4">
                <p className="text-sm text-blue-200/80">
                    <strong>Context:</strong> Based on your current inventory (high beef, chicken stock),
                    local food trends (Korean, loaded appetizers), and your restaurant&apos;s American Grill profile.
                </p>
            </div>

            {/* Suggestions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {suggestions.map((suggestion) => (
                    <div
                        key={suggestion.id}
                        className="card group hover:border-orange-500/50 transition-all duration-300"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-orange-500/10 rounded-2xl">
                                <ChefHat className="h-6 w-6 text-orange-400" />
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleFeedback(suggestion.id, "up")}
                                    className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        feedback[suggestion.id] === "up"
                                            ? "bg-green-500/20 text-green-400"
                                            : "hover:bg-slate-800 text-slate-500"
                                    )}
                                >
                                    <ThumbsUp className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleFeedback(suggestion.id, "down")}
                                    className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        feedback[suggestion.id] === "down"
                                            ? "bg-red-500/20 text-red-400"
                                            : "hover:bg-slate-800 text-slate-500"
                                    )}
                                >
                                    <ThumbsDown className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold mb-2 group-hover:text-orange-400 transition-colors">
                            {suggestion.name}
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">{suggestion.description}</p>

                        <div className="p-3 bg-slate-900/50 rounded-xl mb-4">
                            <p className="text-xs text-slate-500 leading-relaxed">
                                <strong className="text-orange-400">Why this?</strong> {suggestion.reasoning}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="h-4 w-4 text-green-400" />
                                <span className="text-slate-400">Profit:</span>
                                <span className="font-bold text-green-400">{formatCurrency(suggestion.estimatedProfit)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className="h-4 w-4 text-blue-400" />
                                <span className="text-slate-400">Demand:</span>
                                <span className="font-bold">{suggestion.popularity}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-purple-400" />
                                <span className="text-slate-400">Difficulty:</span>
                                <span className="font-bold">{suggestion.difficulty}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-amber-400" />
                                <span className="text-slate-400">Prep:</span>
                                <span className="font-bold">{suggestion.prepTime}</span>
                            </div>
                        </div>

                        <button className="btn-secondary w-full group-hover:btn-primary transition-all">
                            Add to Menu
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
