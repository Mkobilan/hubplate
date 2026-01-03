"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    Plus,
    Trash2,
    Clock,
    Calendar,
    Percent,
    Tag,
    ChevronLeft,
    Save,
    Loader2,
    TrendingUp,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
    getPricingRules,
    createPricingRule,
    updatePricingRule,
    deletePricingRule,
    togglePricingRule,
    PricingRule
} from "./actions";

const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

export default function HappyHourPage() {
    const { t } = useTranslation();
    const [showAddModal, setShowAddModal] = useState(false);
    const [rules, setRules] = useState<PricingRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const fetchRules = async () => {
        if (!currentLocation?.id) return;
        setLoading(true);
        try {
            const data = await getPricingRules(currentLocation.id);
            setRules(data);

            // Fetch categories for the modal
            const { data: cats } = await supabase
                .from("menu_categories")
                .select("id, name")
                .eq("location_id", currentLocation.id)
                .eq("is_active", true);
            setCategories(cats || []);
        } catch (error) {
            toast.error("Failed to load rules");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, [currentLocation?.id]);

    const handleToggle = async (id: string, currentStatus: boolean) => {
        try {
            await togglePricingRule(id, !currentStatus);
            setRules(rules.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r));
            toast.success("Rule status updated");
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this rule?")) return;
        try {
            await deletePricingRule(id);
            setRules(rules.filter(r => r.id !== id));
            toast.success("Rule deleted");
        } catch (error) {
            toast.error("Failed to delete rule");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/menu"
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Dynamic Pricing</h1>
                        <p className="text-slate-400 mt-1">
                            Automate surge pricing and happy hour discounts
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                >
                    <Plus className="h-4 w-4" />
                    Add Rule
                </button>
            </div>

            {/* Rules Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <p className="mt-4 text-slate-400">Loading rules...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rules.map((rule) => (
                        <div key={rule.id} className="card relative overflow-hidden group border-l-4 border-l-transparent transition-all hover:border-l-orange-500 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold">{rule.name}</h2>
                                        {rule.rule_type === 'surge' ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">
                                                <TrendingUp className="h-3 w-3" />
                                                Surge
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/20">
                                                <Zap className="h-3 w-3" />
                                                Happy Hour
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                                        <Tag className="h-3 w-3" />
                                        <span>
                                            {rule.category_ids.length === 0 ? "Entire Menu" : `${rule.category_ids.length} Categories`} • {rule.discount_type === 'percentage' ? `${rule.value}% ${rule.rule_type === 'surge' ? 'Surcharge' : 'Off'}` : `${formatCurrency(rule.value)} ${rule.rule_type === 'surge' ? 'Surcharge' : 'Off'}`}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDelete(rule.id)}
                                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <div
                                        onClick={() => handleToggle(rule.id, rule.is_active)}
                                        className={cn(
                                            "w-12 h-6 rounded-full relative transition-colors cursor-pointer",
                                            rule.is_active ? "bg-orange-500" : "bg-slate-700"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                                            rule.is_active ? "translate-x-6" : ""
                                        )} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-800/50">
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Calendar className="h-4 w-4 text-orange-400" />
                                    <span className="font-medium">{rule.days_of_week.map(d => days[d].substring(0, 3)).join(", ")}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Clock className="h-4 w-4 text-orange-400" />
                                    <span className="font-medium">{rule.start_time.substring(0, 5)} - {rule.end_time.substring(0, 5)}</span>
                                </div>
                            </div>

                            {/* Status indicator */}
                            <div className="absolute top-0 right-0 p-1">
                                <span className={cn(
                                    "w-2 h-2 rounded-full inline-block",
                                    rule.is_active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-slate-500"
                                )} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && rules.length === 0 && (
                <div className="card py-16 text-center border-dashed border-2 border-slate-800 bg-transparent">
                    <TrendingUp className="h-16 w-16 mx-auto text-slate-700 mb-6 animate-pulse" />
                    <h3 className="text-xl font-bold text-slate-200">No Pricing Rules Found</h3>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                        Automate your pricing by adding surge rules for peak hours or discounts for off-peak times.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary mt-8 shadow-lg shadow-orange-500/20"
                    >
                        <Plus className="h-4 w-4" />
                        Create First Rule
                    </button>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <AddRuleModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchRules();
                    }}
                    categories={categories}
                    locationId={currentLocation?.id || ""}
                />
            )}
        </div>
    );
}

function AddRuleModal({ onClose, onSuccess, categories, locationId }: {
    onClose: () => void;
    onSuccess: () => void;
    categories: { id: string; name: string }[];
    locationId: string;
}) {
    const [loading, setLoading] = useState(false);
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [ruleType, setRuleType] = useState<'discount' | 'surge'>('discount');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (selectedDays.length === 0) {
            toast.error("Please select at least one day");
            return;
        }

        const formData = new FormData(e.currentTarget);
        setLoading(true);

        try {
            await createPricingRule({
                location_id: locationId,
                name: formData.get("name") as string,
                rule_type: ruleType,
                days_of_week: selectedDays,
                start_time: formData.get("start_time") as string,
                end_time: formData.get("end_time") as string,
                discount_type: formData.get("discount_type") as 'percentage' | 'fixed',
                value: parseFloat(formData.get("value") as string),
                category_ids: selectedCategories,
            });
            toast.success("Rule created successfully");
            onSuccess();
        } catch (error) {
            toast.error("Failed to create rule");
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = (dayIndex: number) => {
        setSelectedDays(prev =>
            prev.includes(dayIndex)
                ? prev.filter(d => d !== dayIndex)
                : [...prev, dayIndex]
        );
    };

    const toggleCategory = (catId: string) => {
        setSelectedCategories(prev =>
            prev.includes(catId)
                ? prev.filter(id => id !== catId)
                : [...prev, catId]
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative card w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">New Pricing Rule</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <Plus className="h-5 w-5 rotate-45 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="label text-slate-300">Rule Name</label>
                                <input name="name" type="text" className="input" placeholder="e.g. Weekend Rush" required />
                            </div>

                            <div>
                                <label className="label text-slate-300">Rule Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRuleType('discount')}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                                            ruleType === 'discount' ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-slate-800 hover:border-slate-700 text-slate-500"
                                        )}>
                                        <Zap className="h-4 w-4" />
                                        <span className="text-sm font-medium">Discount</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRuleType('surge')}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                                            ruleType === 'surge' ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-slate-800 hover:border-slate-700 text-slate-500"
                                        )}>
                                        <TrendingUp className="h-4 w-4" />
                                        <span className="text-sm font-medium">Surge</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label text-slate-300">Adjustment Type</label>
                                    <select name="discount_type" className="input">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label text-slate-300">Value</label>
                                    <div className="relative">
                                        <input name="value" type="number" step="0.01" className="input pr-8" placeholder="0" required />
                                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label text-slate-300">Start Time</label>
                                    <input name="start_time" type="time" className="input" required />
                                </div>
                                <div>
                                    <label className="label text-slate-300">End Time</label>
                                    <input name="end_time" type="time" className="input" required />
                                </div>
                            </div>

                            <div>
                                <label className="label text-slate-300 mb-1">Repeat On</label>
                                <div className="flex flex-wrap gap-2">
                                    {days.map((day, i) => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(i)}
                                            className={cn(
                                                "w-9 h-9 rounded-full border text-xs font-bold transition-all",
                                                selectedDays.includes(i)
                                                    ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30"
                                                    : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                                            )}
                                        >
                                            {day.charAt(0)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="label text-slate-300 mb-1">Applies To Categories</label>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategories([])}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                            selectedCategories.length === 0
                                                ? "bg-orange-500 border-orange-500 text-white"
                                                : "bg-slate-900 border-slate-700 text-slate-400"
                                        )}
                                    >
                                        Entire Menu
                                    </button>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => toggleCategory(cat.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                                selectedCategories.includes(cat.id)
                                                    ? "bg-orange-500 border-orange-500 text-white"
                                                    : "bg-slate-900 border-slate-700 text-slate-400"
                                            )}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary flex-1 py-3"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary flex-1 py-3 shadow-lg shadow-orange-500/20"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Rule
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
