"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    BarChart3,
    DollarSign,
    Users,
    ShoppingBag,
    Clock,
    Calendar,
    Package,
    Star,
    UtensilsCrossed,
    TrendingUp,
    AlertCircle,
    RefreshCw
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { getInventoryItemStatus, calculateInventoryItemValue } from "@/lib/utils/inventoryUtils";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { format, startOfDay, endOfDay, subDays } from "date-fns";

import { CollapsibleCard, MetricBox } from "@/components/dashboard/analytics/CollapsibleCard";
import { PieChart } from "@/components/dashboard/analytics/PieChart";
import { BarChart, SimpleBar } from "@/components/dashboard/analytics/BarChart";
import {
    exportSalesCSV,
    exportLaborCSV,
    exportInventoryCSV,
    exportFeedbackCSV,
    exportMenuPerformanceCSV,
    exportKitchenPerformanceCSV
} from "@/lib/utils/csvExport";

// Color palette for charts
const COLORS = {
    primary: "#f97316",    // orange
    green: "#22c55e",
    blue: "#3b82f6",
    purple: "#a855f7",
    cyan: "#06b6d4",
    yellow: "#eab308",
    red: "#ef4444",
    pink: "#ec4899",
};

export default function AnalyticsPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);

    // Date range state
    const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 7), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

    // Loading states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data states
    const [salesData, setSalesData] = useState<any>({
        orders: [],
        totalSales: 0,
        orderCount: 0,
        avgOrderValue: 0,
        activeOrders: 0,
        byType: [],
        hourly: []
    });

    const [laborData, setLaborData] = useState<any>({
        entries: [],
        totalHours: 0,
        totalCost: 0,
        laborPercentage: 0,
        clockedIn: 0,
        byEmployee: [],
        byRole: []
    });

    const [inventoryData, setInventoryData] = useState<any>({
        items: [],
        totalItems: 0,
        lowStockCount: 0,
        wasteCost: 0,
        totalValue: 0,
        lowStockItems: []
    });

    const [customerData, setCustomerData] = useState<any>({
        feedback: [],
        avgRating: 0,
        totalFeedback: 0,
        positivePercentage: 0,
        loyaltyMembers: 0,
        ratingDistribution: []
    });

    const [menuData, setMenuData] = useState<any>({
        items: [],
        topSeller: "N/A",
        totalItemsSold: 0,
        topItems: [],
        topCategories: []
    });

    const [kitchenData, setKitchenData] = useState<any>({
        avgPrepTime: 0,
        avgWindowTime: 0,
        avgTotalTime: 0,
        itemPerformance: []
    });

    const [serverPerformanceData, setServerPerformanceData] = useState<any>({
        servers: [],
        totalAddOnRevenue: 0,
        topAddOnSeller: "N/A"
    });

    const fetchAllData = useCallback(async () => {
        if (!currentLocation) return;

        try {
            setRefreshing(true);
            const supabase = createClient();
            const startISO = `${startDate}T00:00:00`;
            const endISO = `${endDate}T23:59:59`;

            // ========== SALES DATA ==========
            const { data: orders } = await supabase
                .from("orders")
                .select("*")
                .eq("location_id", currentLocation.id)
                .gte("created_at", startISO)
                .lte("created_at", endISO);

            const completedOrders = (orders || []).filter((o: any) =>
                ["completed", "pending", "served"].includes(o.status)
            );
            const totalSales = completedOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
            const orderCount = orders?.length || 0;

            // Order type distribution
            const typeGroups = (orders || []).reduce((acc: any, o: any) => {
                const type = o.order_type || "other";
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            const typeColors: any = { dine_in: COLORS.green, takeout: COLORS.blue, delivery: COLORS.purple, qr_order: COLORS.cyan };
            const byType = Object.entries(typeGroups).map(([label, value]) => ({
                label: label.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
                value: value as number,
                color: typeColors[label] || COLORS.primary
            }));

            // Hourly breakdown
            const hourlyGroups = (orders || []).reduce((acc: any, o: any) => {
                const hour = format(new Date(o.created_at), "HH:00");
                if (!acc[hour]) acc[hour] = { hour, sales: 0, orders: 0 };
                acc[hour].sales += Number(o.total || 0);
                acc[hour].orders += 1;
                return acc;
            }, {});
            const hourly = Object.values(hourlyGroups).sort((a: any, b: any) => a.hour.localeCompare(b.hour));

            // Active orders count
            const { count: activeCount } = await supabase
                .from("orders")
                .select("*", { count: 'exact', head: true })
                .eq("location_id", currentLocation.id)
                .not("status", "in", '("completed","cancelled")');

            setSalesData({
                orders: orders || [],
                totalSales,
                orderCount,
                avgOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
                activeOrders: activeCount || 0,
                byType,
                hourly
            });

            // ========== LABOR DATA ==========
            const { data: timeEntries } = await supabase
                .from("time_entries")
                .select(`
                    *,
                    employees!inner(first_name, last_name, role, hourly_rate)
                `)
                .eq("location_id", currentLocation.id)
                .gte("clock_in", startISO)
                .lte("clock_in", endISO);

            const { count: clockedInCount } = await supabase
                .from("time_entries")
                .select("*", { count: 'exact', head: true })
                .eq("location_id", currentLocation.id)
                .is("clock_out", null);

            const totalHours = (timeEntries || []).reduce((sum: number, e: any) => sum + Number(e.total_hours || 0), 0);
            const totalLaborCost = (timeEntries || []).reduce((sum: number, e: any) => sum + Number(e.total_pay || 0), 0);
            const laborPercentage = totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;

            // By employee
            const empGroups = (timeEntries || []).reduce((acc: any, e: any) => {
                const name = `${e.employees?.first_name || ""} ${e.employees?.last_name || ""}`.trim() || "Unknown";
                if (!acc[name]) acc[name] = 0;
                acc[name] += Number(e.total_hours || 0);
                return acc;
            }, {});
            const byEmployee = Object.entries(empGroups)
                .map(([label, value], i) => ({
                    label,
                    value: Math.round((value as number) * 100) / 100,
                    color: Object.values(COLORS)[i % Object.values(COLORS).length]
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);

            // By role
            const roleGroups = (timeEntries || []).reduce((acc: any, e: any) => {
                const role = e.employees?.role || "unknown";
                if (!acc[role]) acc[role] = 0;
                acc[role] += Number(e.total_hours || 0);
                return acc;
            }, {});
            const roleColors: any = { owner: COLORS.purple, manager: COLORS.blue, server: COLORS.green, bartender: COLORS.cyan, cook: COLORS.primary, host: COLORS.pink, busser: COLORS.yellow };
            const byRole = Object.entries(roleGroups).map(([label, value]) => ({
                label: label.charAt(0).toUpperCase() + label.slice(1),
                value: Math.round((value as number) * 100) / 100,
                color: roleColors[label] || COLORS.primary
            }));

            setLaborData({
                entries: (timeEntries || []).map((e: any) => ({
                    employee_name: `${e.employees?.first_name || ""} ${e.employees?.last_name || ""}`.trim(),
                    role: e.employees?.role || "unknown",
                    clock_in: e.clock_in,
                    clock_out: e.clock_out,
                    total_hours: e.total_hours,
                    hourly_rate: e.hourly_rate || e.employees?.hourly_rate,
                    total_pay: e.total_pay
                })),
                totalHours,
                totalCost: totalLaborCost,
                laborPercentage,
                clockedIn: clockedInCount || 0,
                byEmployee,
                byRole
            });

            // ========== INVENTORY DATA ==========
            const { data: inventoryItems, error: invError } = await supabase
                .from("inventory_items")
                .select("*")
                .eq("location_id", currentLocation.id);

            if (invError) console.error("Error fetching inventory for analytics:", invError);

            const { data: wasteLogs } = await supabase
                .from("waste_logs")
                .select("*")
                .eq("location_id", currentLocation.id)
                .gte("created_at", startISO)
                .lte("created_at", endISO);

            const lowStockItems = (inventoryItems || []).filter((i: any) =>
                getInventoryItemStatus(i) !== 'good'
            );

            const totalValue = (inventoryItems || []).reduce((sum: number, i: any) => {
                return sum + calculateInventoryItemValue(i);
            }, 0);

            const wasteCost = (wasteLogs || []).reduce((sum: number, w: any) => sum + Number(w.cost || 0), 0);

            setInventoryData({
                items: inventoryItems || [],
                totalItems: (inventoryItems || []).length,
                lowStockCount: lowStockItems.length,
                wasteCost,
                totalValue,
                lowStockItems: lowStockItems.slice(0, 5).map((i: any) => ({
                    label: i.name,
                    value: i.stock_quantity || 0,
                    color: (i.stock_quantity || 0) <= 0 ? COLORS.red : COLORS.yellow
                }))
            });

            // ========== CUSTOMER DATA ==========
            const { data: feedback } = await supabase
                .from("customer_feedback")
                .select("*")
                .eq("location_id", currentLocation.id)
                .gte("created_at", startISO)
                .lte("created_at", endISO);

            const { count: loyaltyCount } = await supabase
                .from("customers")
                .select("*", { count: 'exact', head: true })
                .eq("location_id", currentLocation.id);

            const totalFeedback = feedback?.length || 0;
            const avgRating = totalFeedback > 0
                ? (feedback || []).reduce((sum: number, f: any) => sum + Number(f.rating || 0), 0) / totalFeedback
                : 0;
            const positiveFeedback = (feedback || []).filter((f: any) => f.rating >= 4).length;
            const positivePercentage = totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0;

            // Rating distribution
            const ratingGroups = (feedback || []).reduce((acc: any, f: any) => {
                const rating = f.rating || 0;
                acc[rating] = (acc[rating] || 0) + 1;
                return acc;
            }, {});
            const ratingColors: any = { 5: COLORS.green, 4: COLORS.cyan, 3: COLORS.yellow, 2: COLORS.primary, 1: COLORS.red };
            const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
                label: `${rating} Star`,
                value: ratingGroups[rating] || 0,
                color: ratingColors[rating]
            }));

            setCustomerData({
                feedback: feedback || [],
                avgRating,
                totalFeedback,
                positivePercentage,
                loyaltyMembers: loyaltyCount || 0,
                ratingDistribution
            });

            // ========== MENU PERFORMANCE (Derived from Orders) ==========
            // Fetch menu items for category lookup (fallback for items without category_name in snapshot)
            const { data: menuItems } = await supabase
                .from("menu_items")
                .select("id, category:menu_categories(name)")
                .eq("location_id", currentLocation.id);

            const menuItemsMap = new Map();
            if (menuItems) {
                menuItems.forEach((mi: any) => {
                    if (mi.category?.name) {
                        menuItemsMap.set(mi.id, mi.category.name);
                    }
                });
            }

            // Aggregate by item name using the items JSONB in each order
            const itemGroups = (orders || []).reduce((acc: any, order: any) => {
                // Skip cancelled orders for menu performance
                if (order.status === "cancelled") return acc;

                // Use items JSONB
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach((item: any) => {
                        processItemForStats(acc, item, menuItemsMap);
                    });
                }
                return acc;
            }, {});

            // Helper to process stats (reduce duplication)
            function processItemForStats(acc: any, item: any, map: Map<any, any>) {
                const name = item.name || "Unknown";
                if (!acc[name]) {
                    // Try to find category from snapshot, then fallback to current menu catalog
                    let category = item.category_name;
                    if (!category && item.menu_item_id) {
                        category = map.get(item.menu_item_id);
                    }

                    acc[name] = {
                        name,
                        category: category || "Uncategorized",
                        quantity: 0,
                        revenue: 0
                    };
                }
                acc[name].quantity += item.quantity || 1;
                let itemRevenue = (Number(item.price) || 0) * (item.quantity || 1);

                // Add modifier revenue (both upsells and add-ons)
                const modifiers = item.modifiers || item.add_ons || [];
                if (Array.isArray(modifiers)) {
                    modifiers.forEach((mod: any) => {
                        itemRevenue += (Number(mod.price) || 0) * (item.quantity || 1);
                    });
                }

                acc[name].revenue += itemRevenue;
            }

            const topItems = Object.values(itemGroups)
                .sort((a: any, b: any) => b.quantity - a.quantity)
                .slice(0, 5)
                .map((item: any, i) => ({
                    label: item.name,
                    value: item.quantity,
                    color: Object.values(COLORS)[i % Object.values(COLORS).length]
                }));

            // Calculate Category Performance
            const categoryGroups = (Object.values(itemGroups) as any[]).reduce((acc: any, item: any) => {
                const cat = item.category || "Uncategorized";
                if (!acc[cat]) acc[cat] = { name: cat, quantity: 0, revenue: 0 };
                acc[cat].quantity += item.quantity;
                acc[cat].revenue += item.revenue;
                return acc;
            }, {});

            const topCategories = (Object.values(categoryGroups) as any[])
                .sort((a: any, b: any) => b.revenue - a.revenue) // Sort categories by revenue usually makes more sense, or quantity
                .map((cat: any, i) => ({
                    label: cat.name,
                    value: cat.quantity,
                    revenue: cat.revenue,
                    color: Object.values(COLORS)[(i + 2) % Object.values(COLORS).length] // Offset colors slightly
                }));

            const totalItemsSold = Object.values(itemGroups).reduce((sum: number, i: any) => sum + i.quantity, 0);
            const topSeller = topItems.length > 0 ? topItems[0].label : "N/A";

            setMenuData({
                items: Object.values(itemGroups).map((item: any) => ({
                    name: item.name,
                    category: item.category,
                    quantity_sold: item.quantity,
                    revenue: item.revenue
                })),
                topSeller,
                totalItemsSold,
                topItems,
                topCategories
            });

            // ========== KITCHEN PERFORMANCE ==========
            const kitchenStats = (orders || []).reduce((acc: any, order: any) => {
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach((item: any) => {
                        if (item.sent_at && item.served_at) {
                            const name = item.name || "Unknown";
                            if (!acc[name]) {
                                acc[name] = { name, prepTimes: [], windowTimes: [], totalTimes: [] };
                            }

                            // Calculate times in minutes
                            if (item.started_at && item.ready_at) {
                                const prep = (new Date(item.ready_at).getTime() - new Date(item.started_at).getTime()) / 60000;
                                acc[name].prepTimes.push(prep);
                            }

                            if (item.ready_at && item.served_at) {
                                const window = (new Date(item.served_at).getTime() - new Date(item.ready_at).getTime()) / 60000;
                                acc[name].windowTimes.push(window);
                            }

                            const total = (new Date(item.served_at).getTime() - new Date(item.sent_at).getTime()) / 60000;
                            acc[name].totalTimes.push(total);
                        }
                    });
                }
                return acc;
            }, {});

            const itemPerformance = Object.values(kitchenStats).map((item: any) => ({
                item_name: item.name,
                prep_time: item.prepTimes.length > 0 ? item.prepTimes.reduce((a: number, b: number) => a + b, 0) / item.prepTimes.length : 0,
                window_time: item.windowTimes.length > 0 ? item.windowTimes.reduce((a: number, b: number) => a + b, 0) / item.windowTimes.length : 0,
                total_time: item.totalTimes.length > 0 ? item.totalTimes.reduce((a: number, b: number) => a + b, 0) / item.totalTimes.length : 0
            })).sort((a, b) => b.total_time - a.total_time);

            const allPrep = itemPerformance.flatMap(i => kitchenStats[i.item_name].prepTimes);
            const allWindow = itemPerformance.flatMap(i => kitchenStats[i.item_name].windowTimes);
            const allTotal = itemPerformance.flatMap(i => kitchenStats[i.item_name].totalTimes);

            setKitchenData({
                avgPrepTime: allPrep.length > 0 ? allPrep.reduce((a, b) => a + b, 0) / allPrep.length : 0,
                avgWindowTime: allWindow.length > 0 ? allWindow.reduce((a, b) => a + b, 0) / allWindow.length : 0,
                avgTotalTime: allTotal.length > 0 ? allTotal.reduce((a, b) => a + b, 0) / allTotal.length : 0,
                itemPerformance
            });

            // ========== SERVER PERFORMANCE ==========
            const { data: employees } = await supabase
                .from("employees")
                .select("id, first_name, last_name, role")
                .eq("location_id", currentLocation.id)
                .is("termination_date", null);

            const { data: signups } = await supabase
                .from("customers")
                .select("loyalty_signup_server_id")
                .eq("location_id", currentLocation.id)
                .gte("loyalty_signup_at", startISO)
                .lte("loyalty_signup_at", endISO);

            const serverStats = (employees || []).reduce((acc: any, emp: any) => {
                const name = `${emp.first_name} ${emp.last_name}`;
                acc[emp.id] = {
                    id: emp.id,
                    name,
                    role: emp.role,
                    sales: 0,
                    addOnRevenue: 0,
                    reviewsCount: 0,
                    avgRating: 0,
                    loyaltySignups: 0
                };
                return acc;
            }, {});

            // Process Orders for Server Stats
            (orders || []).forEach((order: any) => {
                if (!order.server_id || !serverStats[order.server_id]) return;

                if (order.status !== "cancelled") {
                    serverStats[order.server_id].sales += Number(order.total || 0);

                    if (order.items && Array.isArray(order.items)) {
                        order.items.forEach((item: any) => {
                            if (item.modifiers && Array.isArray(item.modifiers)) {
                                item.modifiers.forEach((mod: any) => {
                                    const modRev = (Number(mod.price) || 0) * (item.quantity || 1);
                                    if (mod.type === 'upsell' || mod.type === 'add-on') {
                                        serverStats[order.server_id].addOnRevenue += modRev;
                                    }
                                });
                            }
                        });
                    }
                }
            });

            // Process Feedback for Server Stats
            (feedback || []).forEach((f: any) => {
                if (!f.server_id || !serverStats[f.server_id]) return;
                const stats = serverStats[f.server_id];
                const newTotal = (stats.avgRating * stats.reviewsCount) + (f.rating || 0);
                stats.reviewsCount += 1;
                stats.avgRating = newTotal / stats.reviewsCount;
            });

            // Process Loyalty Signups
            (signups || []).forEach((s: any) => {
                if (s.loyalty_signup_server_id && serverStats[s.loyalty_signup_server_id]) {
                    serverStats[s.loyalty_signup_server_id].loyaltySignups += 1;
                }
            });

            const serverList = Object.values(serverStats)
                .filter((s: any) => s.sales > 0 || s.reviewsCount > 0 || s.loyaltySignups > 0)
                .sort((a: any, b: any) => b.sales - a.sales);

            const totalAddOnRevenue = serverList.reduce((sum: number, s: any) => sum + s.addOnRevenue, 0);
            const topAddOnSeller = (serverList.sort((a: any, b: any) => b.addOnRevenue - a.addOnRevenue)[0] as any)?.name || "N/A";

            setServerPerformanceData({
                servers: serverList,
                totalAddOnRevenue,
                topAddOnSeller
            });


        } catch (error) {
            console.error("Error fetching analytics data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentLocation, startDate, endDate]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Real-time subscription disabled for performance
    // It was causing too many re-fetches on a data-intensive page
    /*
    useEffect(() => {
        if (!currentLocation) return;

        const supabase = createClient();
        const channel = supabase.channel('analytics-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAllData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => fetchAllData())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentLocation?.id, fetchAllData]);
    */

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <BarChart3 className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view analytics.</p>
                <button onClick={() => window.location.href = "/dashboard/locations"} className="btn btn-primary">
                    Go to Locations
                </button>
            </div>
        );
    }

    const dateRange = { start: startDate, end: endDate };

    return (
        <div className="space-y-6">
            {/* Header with Date Range */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-orange-500" />
                        Analytics & Reports
                    </h1>
                    <p className="text-slate-400 mt-1">
                        {currentLocation.name} - Comprehensive business insights
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Range Picker */}
                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-sm border-none focus:outline-none"
                        />
                        <span className="text-slate-500">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent text-sm border-none focus:outline-none"
                        />
                    </div>

                    <button
                        onClick={fetchAllData}
                        disabled={refreshing}
                        className="btn btn-secondary gap-2"
                    >
                        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="h-8 w-8 text-orange-500 animate-spin" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* SECTION 1: Sales & Revenue */}
                    <CollapsibleCard
                        title="Sales & Revenue"
                        icon={<DollarSign className="h-5 w-5 text-green-400" />}
                        accentColor="bg-green-500/20"
                        onExportCSV={() => exportSalesCSV(salesData.orders, dateRange)}
                    >
                        {/* Metrics Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <MetricBox
                                label="Total Sales"
                                value={formatCurrency(salesData.totalSales)}
                                color="text-green-400"
                            />
                            <MetricBox
                                label="Orders"
                                value={salesData.orderCount}
                                color="text-blue-400"
                            />
                            <MetricBox
                                label="Avg Order"
                                value={formatCurrency(salesData.avgOrderValue)}
                                color="text-purple-400"
                            />
                            <MetricBox
                                label="Active Orders"
                                value={salesData.activeOrders}
                                color="text-orange-400"
                            />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-slate-800/30 rounded-xl p-4">
                                <h4 className="font-semibold text-sm text-slate-400 mb-4">Order Types</h4>
                                <PieChart data={salesData.byType} size={140} />
                            </div>
                            <div className="bg-slate-800/30 rounded-xl p-4">
                                <h4 className="font-semibold text-sm text-slate-400 mb-4">Hourly Sales</h4>
                                <div className="flex items-end gap-1 h-32">
                                    {salesData.hourly.length > 0 ? (
                                        salesData.hourly.map((h: any, i: number) => {
                                            const maxSales = Math.max(...salesData.hourly.map((d: any) => d.sales), 1);
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center group relative">
                                                    <div
                                                        className="w-full bg-orange-500/30 rounded-t hover:bg-orange-500/50 transition-colors cursor-pointer"
                                                        style={{ height: `${(h.sales / maxSales) * 100}%`, minHeight: h.sales > 0 ? 4 : 0 }}
                                                    />
                                                    <span className="text-[10px] text-slate-500 mt-1">{h.hour}</span>
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                        {formatCurrency(h.sales)}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                                            No hourly data
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CollapsibleCard>

                    {/* SECTION 2: Labor & Staffing */}
                    <CollapsibleCard
                        title="Labor & Staffing"
                        icon={<Clock className="h-5 w-5 text-blue-400" />}
                        accentColor="bg-blue-500/20"
                        onExportCSV={() => exportLaborCSV(laborData.entries, dateRange)}
                    >
                        {/* Metrics Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                            <MetricBox
                                label="Total Hours"
                                value={`${laborData.totalHours.toFixed(1)}h`}
                                color="text-blue-400"
                            />
                            <MetricBox
                                label="Labor Cost"
                                value={formatCurrency(laborData.totalCost)}
                                color="text-purple-400"
                            />
                            <MetricBox
                                label="Labor %"
                                value={`${laborData.laborPercentage.toFixed(1)}%`}
                                color={laborData.laborPercentage > 30 ? "text-red-400" : "text-green-400"}
                                subtext={laborData.laborPercentage > 30 ? "Above target" : "On target"}
                            />
                            <MetricBox
                                label="Clocked In"
                                value={laborData.clockedIn}
                                color="text-green-400"
                            />
                            <MetricBox
                                label="Sales / Labor Hr"
                                value={formatCurrency(laborData.totalHours > 0 ? salesData.totalSales / laborData.totalHours : 0)}
                                color="text-cyan-400"
                                subtext="Target: $50+"
                            />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-slate-800/30 rounded-xl p-4">
                                <h4 className="font-semibold text-sm text-slate-400 mb-4">Hours by Employee</h4>
                                <BarChart data={laborData.byEmployee} orientation="horizontal" />
                            </div>
                            <div className="bg-slate-800/30 rounded-xl p-4">
                                <h4 className="font-semibold text-sm text-slate-400 mb-4">Hours by Role</h4>
                                <PieChart data={laborData.byRole} size={140} />
                            </div>
                        </div>
                    </CollapsibleCard>

                    {/* SECTION: Server Performance */}
                    <CollapsibleCard
                        title="Server Performance"
                        icon={<Users className="h-5 w-5 text-orange-400" />}
                        accentColor="bg-orange-500/20"
                    >
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <MetricBox
                                label="Total Add-On Sales"
                                value={formatCurrency(serverPerformanceData.totalAddOnRevenue)}
                                color="text-green-400"
                            />
                            <MetricBox
                                label="Total Reviews"
                                value={serverPerformanceData.servers.reduce((sum: number, s: any) => sum + s.reviewsCount, 0)}
                                color="text-blue-400"
                            />
                            <MetricBox
                                label="Top Add-On Seller"
                                value={serverPerformanceData.topAddOnSeller}
                                color="text-purple-400"
                            />
                            <MetricBox
                                label="Total Loyalty Signups"
                                value={serverPerformanceData.servers.reduce((sum: number, s: any) => sum + s.loyaltySignups, 0)}
                                color="text-orange-400"
                            />
                        </div>

                        {/* Dedicated Server Area - List by Server */}
                        <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
                            <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
                                <h4 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                                    <ShoppingBag className="h-4 w-4 text-orange-500" />
                                    Individual Server Metrics
                                </h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-slate-900/50 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-700/50">
                                            <th className="px-4 py-3 font-bold">Server</th>
                                            <th className="px-4 py-3 font-bold text-right">Total Sales</th>
                                            <th className="px-4 py-3 font-bold text-right text-blue-400">Add-Ons</th>
                                            <th className="px-4 py-3 font-bold text-center">Reviews</th>
                                            <th className="px-4 py-3 font-bold text-center">Avg Rating</th>
                                            <th className="px-4 py-3 font-bold text-center text-purple-400">Loyalty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30">
                                        {serverPerformanceData.servers.length > 0 ? (
                                            serverPerformanceData.servers.map((server: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-700/20 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-200">{server.name}</span>
                                                            <span className="text-[10px] text-slate-500 uppercase">{server.role}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-slate-300">
                                                        {formatCurrency(server.sales)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-blue-500/80 font-mono">
                                                        {formatCurrency(server.addOnRevenue)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-slate-400">
                                                        {server.reviewsCount}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className={cn(
                                                                "font-bold",
                                                                server.avgRating >= 4.5 ? "text-green-400" : (server.avgRating >= 4 ? "text-yellow-400" : (server.avgRating > 0 ? "text-red-400" : "text-slate-600"))
                                                            )}>
                                                                {server.avgRating > 0 ? server.avgRating.toFixed(1) : "—"}
                                                            </span>
                                                            {server.avgRating > 0 && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="badge badge-primary px-2 py-0 h-5 bg-purple-500/20 text-purple-400 border-purple-500/30">
                                                            {server.loyaltySignups}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                                                    No server data recorded for this period
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </CollapsibleCard>

                    {/* SECTION 3: Inventory Overview */}
                    <CollapsibleCard
                        title="Inventory Overview"
                        icon={<Package className="h-5 w-5 text-purple-400" />}
                        accentColor="bg-purple-500/20"
                        onExportCSV={() => exportInventoryCSV(inventoryData.items, dateRange)}
                    >
                        {/* Metrics Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <MetricBox
                                label="Total Items"
                                value={inventoryData.totalItems}
                                color="text-purple-400"
                            />
                            <MetricBox
                                label="Low Stock Alerts"
                                value={inventoryData.lowStockCount}
                                color={inventoryData.lowStockCount > 0 ? "text-red-400" : "text-green-400"}
                            />
                            <MetricBox
                                label="Waste Cost"
                                value={formatCurrency(inventoryData.wasteCost)}
                                color="text-yellow-400"
                            />
                            <MetricBox
                                label="Inventory Value"
                                value={formatCurrency(inventoryData.totalValue)}
                                color="text-cyan-400"
                            />
                        </div>

                        {/* Low Stock Items */}
                        <div className="bg-slate-800/30 rounded-xl p-4">
                            <h4 className="font-semibold text-sm text-slate-400 mb-4 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-yellow-400" />
                                Low Stock Items
                            </h4>
                            {inventoryData.lowStockItems.length > 0 ? (
                                <BarChart data={inventoryData.lowStockItems} orientation="horizontal" />
                            ) : (
                                <p className="text-slate-500 text-sm text-center py-4">
                                    All items are stocked above par levels
                                </p>
                            )}
                        </div>
                    </CollapsibleCard>

                    {/* SECTION 4: Customer Insights */}
                    <CollapsibleCard
                        title="Customer Insights"
                        icon={<Star className="h-5 w-5 text-yellow-400" />}
                        accentColor="bg-yellow-500/20"
                        onExportCSV={() => exportFeedbackCSV(customerData.feedback, dateRange)}
                    >
                        {/* Metrics Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <MetricBox
                                label="Avg Rating"
                                value={customerData.avgRating.toFixed(1)}
                                color="text-yellow-400"
                            />
                            <MetricBox
                                label="Total Feedback"
                                value={customerData.totalFeedback}
                                color="text-blue-400"
                            />
                            <MetricBox
                                label="Positive %"
                                value={`${customerData.positivePercentage.toFixed(0)}%`}
                                color={customerData.positivePercentage >= 80 ? "text-green-400" : "text-yellow-400"}
                            />
                            <MetricBox
                                label="Loyalty Members"
                                value={customerData.loyaltyMembers}
                                color="text-purple-400"
                            />
                        </div>

                        {/* Rating Distribution */}
                        <div className="bg-slate-800/30 rounded-xl p-4">
                            <h4 className="font-semibold text-sm text-slate-400 mb-4">Rating Distribution</h4>
                            <div className="space-y-3">
                                {customerData.ratingDistribution.map((item: any, i: number) => (
                                    <SimpleBar
                                        key={i}
                                        label={item.label}
                                        value={item.value}
                                        maxValue={Math.max(...customerData.ratingDistribution.map((d: any) => d.value), 1)}
                                        color={item.color}
                                    />
                                ))}
                            </div>
                        </div>
                    </CollapsibleCard>

                    {/* SECTION 5: Menu Performance */}
                    <CollapsibleCard
                        title="Menu Performance"
                        icon={<UtensilsCrossed className="h-5 w-5 text-orange-400" />}
                        accentColor="bg-orange-500/20"
                        onExportCSV={() => exportMenuPerformanceCSV(menuData.items, dateRange)}
                    >
                        {/* Metrics Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            <MetricBox
                                label="Top Seller"
                                value={menuData.topSeller}
                                color="text-orange-400"
                            />
                            <MetricBox
                                label="Items Sold"
                                value={menuData.totalItemsSold}
                                color="text-green-400"
                            />
                            <MetricBox
                                label="Unique Items"
                                value={menuData.items.length}
                                color="text-blue-400"
                            />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Selling Items */}
                            <div className="bg-slate-800/30 rounded-xl p-4">
                                <h4 className="font-semibold text-sm text-slate-400 mb-4">Top Selling Items</h4>
                                <div className="space-y-4">
                                    {menuData.topItems.map((item: any, i: number) => {
                                        // Find the full item data to get the category
                                        const fullItem = menuData.items.find((mi: any) => mi.name === item.label);
                                        return (
                                            <div key={i} className="group">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-200">{item.label}</span>
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                                                            {fullItem?.category || "Uncategorized"}
                                                        </span>
                                                    </div>
                                                    <span className="font-bold" style={{ color: item.color }}>
                                                        {item.value} sold
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${(item.value / Math.max(...menuData.topItems.map((d: any) => d.value), 1)) * 100}%`,
                                                            backgroundColor: item.color
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Top Categories Chart */}
                            <div className="bg-slate-800/30 rounded-xl p-4">
                                <h4 className="font-semibold text-sm text-slate-400 mb-4">Sales by Category</h4>
                                <div className="flex flex-col gap-4">
                                    <PieChart data={menuData.topCategories || []} size={140} />
                                    <div className="space-y-2">
                                        {(menuData.topCategories || []).slice(0, 5).map((cat: any, i: number) => (
                                            <div key={i} className="flex justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                                    <span className="text-slate-300">{cat.label}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold block">{cat.value} sold</span>
                                                    <span className="text-slate-300 font-mono text-[10px]">{formatCurrency(cat.revenue)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CollapsibleCard>

                    {/* SECTION 6: Kitchen Performance */}
                    <CollapsibleCard
                        title="Kitchen Performance"
                        icon={<Clock className="h-5 w-5 text-red-400" />}
                        accentColor="bg-red-500/20"
                        onExportCSV={() => exportKitchenPerformanceCSV(kitchenData.itemPerformance, dateRange)}
                    >
                        {/* Metrics Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                            <MetricBox
                                label="Avg Prep Time"
                                value={`${kitchenData.avgPrepTime.toFixed(1)}m`}
                                color="text-amber-400"
                                subtext="Cooking Time"
                            />
                            <MetricBox
                                label="Avg Window Time"
                                value={`${kitchenData.avgWindowTime.toFixed(1)}m`}
                                color="text-blue-400"
                                subtext="Ready to Served"
                            />
                            <MetricBox
                                label="Avg Total Ticket"
                                value={`${kitchenData.avgTotalTime.toFixed(1)}m`}
                                color="text-red-400"
                                subtext="Order to Served"
                            />
                        </div>

                        {/* Bottleneck Analysis */}
                        <div className="bg-slate-800/30 rounded-xl p-4">
                            <h4 className="font-semibold text-sm text-slate-400 mb-4 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-red-400" />
                                Station Bottleneck Analysis (Longest Items)
                            </h4>
                            {kitchenData.itemPerformance.length > 0 ? (
                                <div className="space-y-4">
                                    {kitchenData.itemPerformance.slice(0, 5).map((item: any, i: number) => (
                                        <div key={i} className="group">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-slate-200">{item.item_name}</span>
                                                <span className="font-bold text-red-400">
                                                    {item.total_time.toFixed(1)}m total
                                                </span>
                                            </div>
                                            <div className="flex h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-amber-500 transition-all duration-500"
                                                    style={{ width: `${(item.prep_time / item.total_time) * 100}%` }}
                                                    title={`Prep: ${item.prep_time.toFixed(1)}m`}
                                                />
                                                <div
                                                    className="h-full bg-blue-500 transition-all duration-500"
                                                    style={{ width: `${(item.window_time / item.total_time) * 100}%` }}
                                                    title={`Window: ${item.window_time.toFixed(1)}m`}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] mt-1 text-slate-500 px-1">
                                                <span>Prep: {item.prep_time.toFixed(1)}m</span>
                                                <span>Window: {item.window_time.toFixed(1)}m</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm text-center py-4">
                                    No served orders in this period to analyze
                                </p>
                            )}
                        </div>
                    </CollapsibleCard>

                </div>
            )}
        </div>
    );
}
