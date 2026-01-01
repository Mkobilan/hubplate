"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Building2,
    Calendar,
    BarChart3,
    PieChart,
    ArrowLeft,
    Filter,
    Download,
    AlertTriangle,
    Package,
    Loader2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface InvoiceData {
    id: string;
    vendor_id: string | null;
    invoice_date: string | null;
    total: number;
    status: string;
    vendors?: { name: string } | null;
}

interface LineItemData {
    category: string | null;
    extended_price: number;
    invoice_id: string;
}

interface PriceHistoryData {
    inventory_item_id: string;
    price_per_unit: number;
    recorded_at: string;
    inventory_items?: { name: string } | null;
}

export default function CostAnalyticsPage() {
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<InvoiceData[]>([]);
    const [lineItems, setLineItems] = useState<LineItemData[]>([]);
    const [priceHistory, setPriceHistory] = useState<PriceHistoryData[]>([]);
    const [dateRange, setDateRange] = useState<"30" | "90" | "365">("30");

    const fetchData = useCallback(async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(dateRange));
            const startDateStr = startDate.toISOString().split("T")[0];

            // Fetch invoices
            const { data: invoiceData } = await supabase
                .from("invoices")
                .select("id, vendor_id, invoice_date, total, status, vendors(name)")
                .eq("location_id", currentLocation.id)
                .gte("invoice_date", startDateStr)
                .order("invoice_date", { ascending: true });

            // Fetch line items for category breakdown
            const { data: lineItemData } = await supabase
                .from("invoice_line_items")
                .select(`
                    category,
                    extended_price,
                    invoice_id,
                    invoices!inner(location_id, invoice_date)
                `)
                .eq("invoices.location_id", currentLocation.id)
                .gte("invoices.invoice_date", startDateStr);

            // Fetch price history for trending items
            const { data: priceData } = await supabase
                .from("ingredient_price_history")
                .select(`
                    inventory_item_id,
                    price_per_unit,
                    recorded_at,
                    inventory_items(name)
                `)
                .eq("location_id", currentLocation.id)
                .gte("recorded_at", startDateStr)
                .order("recorded_at", { ascending: true });

            setInvoices((invoiceData as any) || []);
            setLineItems((lineItemData as any) || []);
            setPriceHistory((priceData as any) || []);
        } catch (err) {
            console.error("Error fetching analytics:", err);
        } finally {
            setLoading(false);
        }
    }, [currentLocation, dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Calculate spending by category
    const categoryBreakdown = useMemo(() => {
        const categories: Record<string, number> = {};
        lineItems.forEach(item => {
            const cat = item.category || "uncategorized";
            categories[cat] = (categories[cat] || 0) + Number(item.extended_price);
        });
        return Object.entries(categories)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);
    }, [lineItems]);

    // Calculate spending by vendor
    const vendorBreakdown = useMemo(() => {
        const vendors: Record<string, { name: string; amount: number }> = {};
        invoices.forEach(inv => {
            const vendorName = inv.vendors?.name || "Unknown";
            if (!vendors[vendorName]) {
                vendors[vendorName] = { name: vendorName, amount: 0 };
            }
            vendors[vendorName].amount += Number(inv.total);
        });
        return Object.values(vendors).sort((a, b) => b.amount - a.amount);
    }, [invoices]);

    // Calculate monthly/weekly spending trend
    const spendingTrend = useMemo(() => {
        const groups: Record<string, number> = {};
        invoices.forEach(inv => {
            if (!inv.invoice_date) return;
            const date = new Date(inv.invoice_date);
            const key = dateRange === "30"
                ? date.toLocaleDateString('en-US', { weekday: 'short' })
                : `${date.getMonth() + 1}/${date.getDate()}`;
            groups[key] = (groups[key] || 0) + Number(inv.total);
        });
        return Object.entries(groups).map(([label, amount]) => ({ label, amount }));
    }, [invoices, dateRange]);

    // Find items with significant price changes
    const priceAlerts = useMemo(() => {
        const itemPrices: Record<string, { name: string; prices: number[]; dates: string[] }> = {};

        priceHistory.forEach(ph => {
            const itemId = ph.inventory_item_id;
            const name = ph.inventory_items?.name || "Unknown";
            if (!itemPrices[itemId]) {
                itemPrices[itemId] = { name, prices: [], dates: [] };
            }
            itemPrices[itemId].prices.push(Number(ph.price_per_unit));
            itemPrices[itemId].dates.push(ph.recorded_at);
        });

        const alerts: { name: string; change: number; oldPrice: number; newPrice: number }[] = [];

        Object.values(itemPrices).forEach(item => {
            if (item.prices.length < 2) return;
            const oldPrice = item.prices[0];
            const newPrice = item.prices[item.prices.length - 1];
            const change = ((newPrice - oldPrice) / oldPrice) * 100;

            if (Math.abs(change) >= 5) {
                alerts.push({ name: item.name, change, oldPrice, newPrice });
            }
        });

        return alerts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 10);
    }, [priceHistory]);

    // Summary stats
    const stats = useMemo(() => {
        const totalSpend = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
        const avgPerInvoice = invoices.length > 0 ? totalSpend / invoices.length : 0;
        const topCategory = categoryBreakdown[0];
        const topVendor = vendorBreakdown[0];

        return { totalSpend, avgPerInvoice, topCategory, topVendor, invoiceCount: invoices.length };
    }, [invoices, categoryBreakdown, vendorBreakdown]);

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            food: "bg-green-500",
            beverage: "bg-blue-500",
            alcohol: "bg-purple-500",
            supplies: "bg-amber-500",
            linens: "bg-pink-500",
            equipment: "bg-slate-500",
            chemicals: "bg-red-500",
            paper_goods: "bg-orange-500",
            other: "bg-gray-500",
            uncategorized: "bg-slate-600",
        };
        return colors[category] || colors.other;
    };

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <BarChart3 className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <Link href="/dashboard/locations" className="btn btn-primary">
                    Go to Locations
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/invoices" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Cost Analytics</h1>
                        <p className="text-slate-400 mt-1">
                            {currentLocation.name} - Track spending trends and optimize costs
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <select
                        className="input w-40"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as "30" | "90" | "365")}
                    >
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">Last Year</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="card text-center">
                            <DollarSign className="h-8 w-8 text-green-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold">{formatCurrency(stats.totalSpend)}</p>
                            <p className="text-sm text-slate-500">Total Spend</p>
                        </div>
                        <div className="card text-center">
                            <BarChart3 className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold">{stats.invoiceCount}</p>
                            <p className="text-sm text-slate-500">Invoices</p>
                        </div>
                        <div className="card text-center">
                            <Building2 className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                            <p className="text-xl font-bold truncate px-2">{stats.topVendor?.name || "-"}</p>
                            <p className="text-sm text-slate-500">Top Vendor</p>
                        </div>
                        <div className="card text-center">
                            <Package className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                            <p className="text-xl font-bold capitalize">{stats.topCategory?.name || "-"}</p>
                            <p className="text-sm text-slate-500">Top Category</p>
                        </div>
                    </div>

                    {/* Price Alerts */}
                    {priceAlerts.length > 0 && (
                        <div className="card border-amber-500/30 bg-amber-500/5">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                                <h3 className="font-bold text-amber-100">Price Change Alerts</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {priceAlerts.slice(0, 6).map((alert, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                        <span className="font-medium text-sm truncate flex-1">{alert.name}</span>
                                        <div className="flex items-center gap-2 ml-2">
                                            <span className="text-xs text-slate-500">
                                                {formatCurrency(alert.oldPrice)} → {formatCurrency(alert.newPrice)}
                                            </span>
                                            <span className={cn(
                                                "text-sm font-bold flex items-center",
                                                alert.change > 0 ? "text-red-400" : "text-green-400"
                                            )}>
                                                {alert.change > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                                {Math.abs(alert.change).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Category Breakdown */}
                        <div className="card">
                            <div className="flex items-center gap-3 mb-6">
                                <PieChart className="h-5 w-5 text-orange-400" />
                                <h3 className="font-bold">Spending by Category</h3>
                            </div>
                            {categoryBreakdown.length > 0 ? (
                                <div className="space-y-3">
                                    {categoryBreakdown.map((cat, i) => {
                                        const percentage = (cat.amount / stats.totalSpend) * 100;
                                        return (
                                            <div key={i}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="capitalize font-medium">{cat.name}</span>
                                                    <span className="text-slate-400">
                                                        {formatCurrency(cat.amount)} ({percentage.toFixed(1)}%)
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all", getCategoryColor(cat.name))}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-center py-8">No category data available</p>
                            )}
                        </div>

                        {/* Vendor Breakdown */}
                        <div className="card">
                            <div className="flex items-center gap-3 mb-6">
                                <Building2 className="h-5 w-5 text-blue-400" />
                                <h3 className="font-bold">Spending by Vendor</h3>
                            </div>
                            {vendorBreakdown.length > 0 ? (
                                <div className="space-y-3">
                                    {vendorBreakdown.slice(0, 8).map((vendor, i) => {
                                        const percentage = (vendor.amount / stats.totalSpend) * 100;
                                        return (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold">
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-medium truncate">{vendor.name}</span>
                                                        <span className="text-slate-400 ml-2">{formatCurrency(vendor.amount)}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                                                        <div
                                                            className="h-full bg-blue-500 rounded-full transition-all"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-center py-8">No vendor data available</p>
                            )}
                        </div>
                    </div>

                    {/* Spending Trend */}
                    <div className="card">
                        <div className="flex items-center gap-3 mb-6">
                            <TrendingUp className="h-5 w-5 text-green-400" />
                            <h3 className="font-bold">Spending Trend</h3>
                        </div>
                        {spendingTrend.length > 0 ? (
                            <div className="h-48 flex items-end gap-2">
                                {spendingTrend.map((point, i) => {
                                    const maxAmount = Math.max(...spendingTrend.map(p => p.amount));
                                    const height = maxAmount > 0 ? (point.amount / maxAmount) * 100 : 0;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                            <div
                                                className="w-full bg-gradient-to-t from-orange-500/50 to-orange-500 rounded-t-lg transition-all hover:from-orange-400/50 hover:to-orange-400"
                                                style={{ height: `${Math.max(height, 4)}%` }}
                                                title={formatCurrency(point.amount)}
                                            />
                                            <span className="text-[10px] text-slate-500 truncate w-full text-center">
                                                {point.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-center py-8">No spending data available</p>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            href="/dashboard/invoices"
                            className="card p-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="p-3 bg-orange-500/10 rounded-xl">
                                <DollarSign className="h-6 w-6 text-orange-400" />
                            </div>
                            <div>
                                <p className="font-medium">View All Invoices</p>
                                <p className="text-sm text-slate-500">Manage and review invoices</p>
                            </div>
                        </Link>
                        <Link
                            href="/dashboard/invoices/vendors"
                            className="card p-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <Building2 className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="font-medium">Vendor Management</p>
                                <p className="text-sm text-slate-500">Compare and manage suppliers</p>
                            </div>
                        </Link>
                        <Link
                            href="/dashboard/inventory"
                            className="card p-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="p-3 bg-green-500/10 rounded-xl">
                                <Package className="h-6 w-6 text-green-400" />
                            </div>
                            <div>
                                <p className="font-medium">Inventory</p>
                                <p className="text-sm text-slate-500">Check updated costs</p>
                            </div>
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
