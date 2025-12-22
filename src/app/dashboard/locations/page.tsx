"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Building2,
    MapPin,
    Plus,
    Settings,
    TrendingUp,
    Users,
    DollarSign,
    ChevronRight,
    Check,
    Star,
    MoreVertical
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Mock locations data
const mockLocations = [
    {
        id: "1",
        name: "Downtown Flagship",
        address: "123 Main Street, Downtown",
        status: "open",
        todaySales: 4285.50,
        todayOrders: 86,
        staffOnDuty: 8,
        rating: 4.6,
        isPrimary: true
    },
    {
        id: "2",
        name: "Westside Mall",
        address: "456 Mall Drive, Suite 201",
        status: "open",
        todaySales: 2890.25,
        todayOrders: 62,
        staffOnDuty: 6,
        rating: 4.4,
        isPrimary: false
    },
    {
        id: "3",
        name: "Airport Terminal",
        address: "Airport Rd, Terminal B",
        status: "closed",
        todaySales: 0,
        todayOrders: 0,
        staffOnDuty: 0,
        rating: 4.2,
        isPrimary: false
    },
];

const aggregateStats = {
    totalLocations: 3,
    openNow: 2,
    totalSalesToday: 7175.75,
    totalOrdersToday: 148,
    avgRating: 4.4
};

export default function LocationsPage() {
    const { t } = useTranslation();
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-orange-500" />
                        Locations
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Manage multiple restaurant locations from one dashboard
                    </p>
                </div>
                <button className="btn-primary">
                    <Plus className="h-4 w-4" />
                    Add Location
                </button>
            </div>

            {/* Aggregate Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="card text-center">
                    <Building2 className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{aggregateStats.totalLocations}</p>
                    <p className="text-xs text-slate-500">Total Locations</p>
                </div>
                <div className="card text-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-2 animate-pulse" />
                    <p className="text-2xl font-bold text-green-400">{aggregateStats.openNow}</p>
                    <p className="text-xs text-slate-500">Open Now</p>
                </div>
                <div className="card text-center">
                    <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{formatCurrency(aggregateStats.totalSalesToday)}</p>
                    <p className="text-xs text-slate-500">Combined Sales</p>
                </div>
                <div className="card text-center">
                    <TrendingUp className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{aggregateStats.totalOrdersToday}</p>
                    <p className="text-xs text-slate-500">Total Orders</p>
                </div>
                <div className="card text-center">
                    <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{aggregateStats.avgRating}</p>
                    <p className="text-xs text-slate-500">Avg Rating</p>
                </div>
            </div>

            {/* Locations List */}
            <div className="space-y-4">
                {mockLocations.map((location) => (
                    <div
                        key={location.id}
                        className={cn(
                            "card transition-all",
                            selectedLocation === location.id && "border-orange-500"
                        )}
                    >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "p-3 rounded-2xl",
                                    location.status === "open" ? "bg-green-500/10" : "bg-slate-800"
                                )}>
                                    <MapPin className={cn(
                                        "h-6 w-6",
                                        location.status === "open" ? "text-green-400" : "text-slate-500"
                                    )} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold">{location.name}</h3>
                                        {location.isPrimary && (
                                            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                                                Primary
                                            </span>
                                        )}
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full",
                                            location.status === "open"
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-slate-700 text-slate-400"
                                        )}>
                                            {location.status === "open" ? "Open" : "Closed"}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">{location.address}</p>
                                </div>
                            </div>

                            {location.status === "open" && (
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-green-400">{formatCurrency(location.todaySales)}</p>
                                        <p className="text-xs text-slate-500">Today&apos;s Sales</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-bold">{location.todayOrders}</p>
                                        <p className="text-xs text-slate-500">Orders</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-bold">{location.staffOnDuty}</p>
                                        <p className="text-xs text-slate-500">Staff</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="flex items-center gap-1">
                                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                            <span className="font-bold">{location.rating}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Rating</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <button className="btn-secondary text-sm py-2">
                                    <Settings className="h-4 w-4" />
                                    Manage
                                </button>
                                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Location Card */}
            <div className="card border-dashed border-slate-700 p-8 text-center">
                <Plus className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <h3 className="font-bold mb-2">Add New Location</h3>
                <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
                    Expand your business by adding a new restaurant location. All locations share the same menu and settings by default.
                </p>
                <button className="btn-primary">
                    Get Started
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
