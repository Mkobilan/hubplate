import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import {
    User,
    ShoppingBag,
    Sparkles,
    Star,
    Calendar,
    TrendingUp,
    Mail,
    Phone,
    Tag,
    Copy,
    Check,
    Loader2,
    X,
    Heart
} from "lucide-react";

interface CustomerDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string | null;
}

export function CustomerDetailModal({ isOpen, onClose, customerId }: CustomerDetailModalProps) {
    const [customer, setCustomer] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [copiedPromo, setCopiedPromo] = useState<string | null>(null);
    const [isEditingBirthday, setIsEditingBirthday] = useState(false);
    const [tempBirthday, setTempBirthday] = useState("");

    useEffect(() => {
        if (isOpen && customerId) {
            fetchCustomerDetails();
        } else {
            setCustomer(null);
            setOrders([]);
        }
    }, [isOpen, customerId]);

    const fetchCustomerDetails = async () => {
        if (!customerId) return;
        try {
            setLoading(true);
            const supabase = createClient();

            // Fetch Customer
            const { data: custData, error: custError } = await supabase
                .from("customers")
                .select("*")
                .eq("id", customerId)
                .single();

            if (custError) throw custError;
            setCustomer(custData);

            const { data: orderData, error: orderError } = await supabase
                .from("orders")
                .select("*")
                .eq("customer_id", customerId)
                .order("created_at", { ascending: false });

            if (orderError) throw orderError;
            setOrders(orderData || []);

        } catch (err) {
            console.error("Error fetching customer details:", err);
        } finally {
            setLoading(false);
        }
    };

    // --- AI / Insights Logic (Client-Side for now) ---
    const insights = useMemo(() => {
        if (!orders.length) return null;

        const itemCounts: Record<string, number> = {};
        orders.forEach(order => {
            const items = (order as any).items || [];
            items.forEach((item: any) => {
                const name = item.name || item.menu_item_name;
                if (name) {
                    itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
                }
            });
        });

        const sortedItems = Object.entries(itemCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name]) => name);

        const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const avgSpend = totalSpent / orders.length;

        const firstDate = new Date(orders[orders.length - 1].created_at);
        const lastDate = new Date(orders[0].created_at);
        const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24);
        const frequencyDays = daysDiff > 0 ? Math.round(daysDiff / orders.length) : 0;

        const recs = [];

        const daysSinceLastVisit = (new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
        if (daysSinceLastVisit > 30) {
            recs.push({
                type: "retention",
                title: "We Miss You!",
                reason: `Hasn't visited in ${Math.round(daysSinceLastVisit)} days.`,
                suggestion: "Send a '15% Off Your Next Visit' email.",
                promoCode: `MISSYOU${Math.floor(Math.random() * 1000)}`,
                action: "email"
            });
        }

        if (sortedItems.length > 0) {
            recs.push({
                type: "upsell",
                title: "Try Something New",
                reason: `Loves ${sortedItems[0]}.`,
                suggestion: `They might enjoy a similar premium item.`,
                promoCode: `TRYNEW${Math.floor(Math.random() * 1000)}`,
                action: "copy"
            });
        }

        if (avgSpend > 50) {
            recs.push({
                type: "vip",
                title: "VIP Status",
                reason: `High average spend of ${formatCurrency(avgSpend)}.`,
                suggestion: "Offer a complimentary appetizer.",
                promoCode: `VIP${Math.floor(Math.random() * 1000)}`,
                action: "copy"
            });
        }

        return {
            favoriteItems: sortedItems,
            avgSpend,
            frequencyDays,
            recommendations: recs
        };
    }, [orders]);


    const handleCopyPromo = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedPromo(code);
        setTimeout(() => setCopiedPromo(null), 2000);
    };

    const saveBirthday = async () => {
        if (!customerId || !tempBirthday) return;
        try {
            const supabase = createClient();
            const { error } = await (supabase as any)
                .from("customers")
                .update({ birthday: tempBirthday })
                .eq("id", customerId);

            if (error) throw error;

            setCustomer({ ...customer, birthday: tempBirthday });
            setIsEditingBirthday(false);
        } catch (err) {
            console.error("Error saving birthday:", err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative card w-full max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors z-10"
                >
                    <X className="h-5 w-5" />
                </button>

                {loading || !customer ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <Loader2 className="h-8 w-8 text-orange-500 animate-spin mb-4" />
                        <p className="text-slate-400">Loading customer profile...</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Header Profile */}
                        <div className="p-6 bg-slate-900/50 border-b border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-3xl font-bold shadow-lg shadow-orange-900/20 shrink-0">
                                {(customer.first_name?.[0] || "") + (customer.last_name?.[0] || "") || "U"}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div>
                                    <h2 className="text-2xl font-bold">{customer.first_name} {customer.last_name}</h2>
                                    <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 text-sm text-slate-400 mt-1">
                                        {customer.email && (
                                            <span className="flex items-center gap-1.5">
                                                <Mail className="h-3 w-3" /> {customer.email}
                                            </span>
                                        )}
                                        {customer.phone && (
                                            <span className="flex items-center gap-1.5">
                                                <Phone className="h-3 w-3" /> {customer.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-center sm:justify-start gap-2">
                                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${(customer.loyalty_tier || 'bronze').toLowerCase() === 'gold' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' :
                                        (customer.loyalty_tier || 'bronze').toLowerCase() === 'silver' ? 'border-slate-400/50 text-slate-400 bg-slate-400/10' :
                                            'border-orange-700/50 text-orange-600 bg-orange-700/10'
                                        }`}>
                                        {customer.loyalty_tier || "Bronze"} Member
                                    </div>
                                    <div className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-700 text-slate-400 bg-slate-800/50">
                                        {customer.loyalty_points || 0} Points
                                    </div>
                                </div>
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Lifetime Value</p>
                                <p className="text-2xl font-mono text-green-400">{formatCurrency(customer.total_spent)}</p>
                                <p className="text-xs text-slate-500 mt-1">{customer.total_visits} Visits</p>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-slate-800 bg-slate-900/30 px-6">
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={`flex items-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "overview"
                                    ? "border-orange-500 text-orange-500"
                                    : "border-transparent text-slate-400 hover:text-white"
                                    }`}
                            >
                                <User className="h-4 w-4" /> Overview
                            </button>
                            <button
                                onClick={() => setActiveTab("orders")}
                                className={`flex items-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "orders"
                                    ? "border-orange-500 text-orange-500"
                                    : "border-transparent text-slate-400 hover:text-white"
                                    }`}
                            >
                                <ShoppingBag className="h-4 w-4" /> Order History
                            </button>
                            <button
                                onClick={() => setActiveTab("insights")}
                                className={`flex items-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "insights"
                                    ? "border-purple-500 text-purple-400"
                                    : "border-transparent text-slate-400 hover:text-white"
                                    }`}
                            >
                                <Sparkles className="h-4 w-4" /> AI Insights
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">

                            {/* Overview Tab */}
                            {activeTab === "overview" && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 rounded-lg bg-green-500/10 text-green-500"><TrendingUp className="h-5 w-5" /></div>
                                                <p className="text-sm font-bold text-slate-400">Avg Spend</p>
                                            </div>
                                            <p className="text-2xl font-bold">{formatCurrency(insights?.avgSpend || 0)}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><Calendar className="h-5 w-5" /></div>
                                                <p className="text-sm font-bold text-slate-400">Visit Frequency</p>
                                            </div>
                                            <p className="text-2xl font-bold">Every {insights?.frequencyDays || 0} Days</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500"><Star className="h-5 w-5" /></div>
                                                <p className="text-sm font-bold text-slate-400">Favorite Item</p>
                                            </div>
                                            <p className="text-lg font-bold truncate" title={insights?.favoriteItems[0]}>{insights?.favoriteItems[0] || "N/A"}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-bold text-lg">Detailed Info</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="space-y-1">
                                                <p className="text-slate-500">Member Since</p>
                                                <p>{format(new Date(customer.created_at), "MMM d, yyyy")}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-slate-500">Last Visit</p>
                                                <p>{orders.length > 0 ? format(new Date(orders[0].created_at), "MMM d, yyyy") : "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-slate-500">Birthday</p>
                                                <div className="flex items-center gap-2">
                                                    {isEditingBirthday ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="date"
                                                                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs"
                                                                value={tempBirthday}
                                                                onChange={(e) => setTempBirthday(e.target.value)}
                                                            />
                                                            <button onClick={saveBirthday} className="p-1 hover:text-green-400"><Check className="h-3 w-3" /></button>
                                                            <button onClick={() => setIsEditingBirthday(false)} className="p-1 hover:text-red-400"><X className="h-3 w-3" /></button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p>{customer.birthday ? format(new Date(customer.birthday), "MMM d") : "Not Set"}</p>
                                                            <span
                                                                onClick={() => {
                                                                    setTempBirthday(customer.birthday || "");
                                                                    setIsEditingBirthday(true);
                                                                }}
                                                                className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded cursor-pointer hover:bg-orange-400/20 transition-colors"
                                                            >
                                                                {customer.birthday ? "Edit" : "Add"}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <p className="text-slate-500">Notes</p>
                                                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 min-h-[80px]">
                                                    {customer.notes || "No notes available."}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Orders Tab */}
                            {activeTab === "orders" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="font-bold text-lg">Past Orders</h3>
                                    {orders.length > 0 ? (
                                        <div className="space-y-3">
                                            {orders.map((order) => (
                                                <div key={order.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 rounded-full bg-slate-800 text-slate-400">
                                                            <ShoppingBag className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold">{format(new Date(order.created_at), "MMM d, yyyy • h:mm a")}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {order.order_type === 'dine_in' ? `Table ${order.table_number || 'N/A'}` : 'Takeout'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-mono font-bold text-green-400">{formatCurrency(order.total)}</p>
                                                        <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-0.5 rounded-full border border-slate-800">
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                                            <ShoppingBag className="h-8 w-8 mx-auto mb-3 opacity-50" />
                                            <p>No order history found for this customer.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AI Insights Tab */}
                            {activeTab === "insights" && (
                                <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-6 rounded-2xl border border-purple-500/20">
                                        <div className="flex items-center gap-3 mb-6">
                                            <Sparkles className="h-6 w-6 text-purple-400" />
                                            <div>
                                                <h3 className="font-bold text-lg text-purple-100">AI Personalization Engine</h3>
                                                <p className="text-xs text-purple-300">Real-time insights based on customer behavior</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Top Favorites</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(insights?.favoriteItems || []).length > 0 ? (
                                                    (insights?.favoriteItems || []).map((item, i) => (
                                                        <span key={i} className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-sm">
                                                            <Heart className="h-3 w-3 text-pink-500 fill-pink-500" />
                                                            {item}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-slate-500 italic">Not enough data to determine favorites.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-8 space-y-4">
                                            <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Recommended Actions</h4>

                                            <div className="grid grid-cols-1 gap-4">
                                                {(insights?.recommendations || []).map((rec, i) => (
                                                    <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div className="flex items-start gap-4">
                                                            <div className={`p-3 rounded-lg ${rec.type === 'retention' ? 'bg-red-500/10 text-red-400' :
                                                                rec.type === 'vip' ? 'bg-yellow-500/10 text-yellow-400' :
                                                                    'bg-blue-500/10 text-blue-400'
                                                                }`}>
                                                                <Tag className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <h5 className="font-bold">{rec.title}</h5>
                                                                <p className="text-sm text-slate-400 mb-1">{rec.reason}</p>
                                                                <div className="flex items-center gap-2 text-xs text-purple-300">
                                                                    <Sparkles className="h-3 w-3" />
                                                                    {rec.suggestion}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {rec.action === 'copy' && (
                                                            <button
                                                                onClick={() => handleCopyPromo(rec.promoCode)}
                                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium transition-colors shrink-0"
                                                            >
                                                                {copiedPromo === rec.promoCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                                                {rec.promoCode}
                                                            </button>
                                                        )}

                                                        {rec.action === 'email' && (
                                                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors shrink-0">
                                                                <Mail className="h-4 w-4" />
                                                                Send Email
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}

                                                {(!insights?.recommendations || insights.recommendations.length === 0) && (
                                                    <div className="text-center p-6 text-slate-500 italic">
                                                        No specific recommendations available at this time.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
