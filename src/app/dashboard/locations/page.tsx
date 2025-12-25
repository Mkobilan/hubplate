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
import { AddLocationModal } from "@/components/dashboard/locations/add-location-modal";
import { ManageLocationModal } from "@/components/dashboard/locations/manage-location-modal";

// TODO: Locations are now fetched dynamically from Supabase


import { useEffect } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";

export default function LocationsPage() {
    const { t } = useTranslation();
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedLocationForManage, setSelectedLocationForManage] = useState<any>(null);

    const currentLocation = useAppStore((state) => state.currentLocation);
    const setCurrentLocation = useAppStore((state) => state.setCurrentLocation);

    const fetchLocations = async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Fetch locations for current user
            const { data, error: fetchError } = await supabase
                .from("locations")
                .select("*")
                .order("is_active", { ascending: false });

            if (fetchError) throw fetchError;
            setLocations(data || []);

            // Auto-select first location if none selected
            if (!currentLocation && data && data.length > 0) {
                setCurrentLocation(data[0]);
            } else if (currentLocation) {
                // Refresh current location if it was updated
                const updated = (data as any[])?.find(l => l.id === (currentLocation as any).id);
                if (updated) setCurrentLocation(updated);
            }
        } catch (err) {
            console.error("Error fetching locations:", err);
            setError(err instanceof Error ? err.message : "Failed to load locations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                <p className="mt-4 text-slate-400">Loading locations...</p>
            </div>
        );
    }

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
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-primary"
                >
                    <Plus className="h-4 w-4" />
                    Add Location
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            {/* Locations List */}
            <div className="space-y-4">
                {locations.length > 0 ? (
                    locations.map((location) => (
                        <div
                            key={location.id}
                            className={cn(
                                "card transition-all",
                                currentLocation?.id === location.id && "border-orange-500 shadow-lg shadow-orange-500/10"
                            )}
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "p-3 rounded-2xl",
                                        location.is_active ? "bg-green-500/10" : "bg-slate-800"
                                    )}>
                                        <MapPin className={cn(
                                            "h-6 w-6",
                                            location.is_active ? "text-green-400" : "text-slate-500"
                                        )} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-lg font-bold">{location.name}</h3>
                                            {currentLocation?.id === location.id && (
                                                <span className="text-[10px] uppercase font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                                                    Current Location
                                                </span>
                                            )}
                                            <span className={cn(
                                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                                                location.is_active
                                                    ? "bg-green-500/20 text-green-400"
                                                    : "bg-slate-700 text-slate-400"
                                            )}>
                                                {location.is_active ? "Active" : "Inactive"}
                                            </span>
                                            {location.tax_rate > 0 && (
                                                <span className="text-[10px] uppercase font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                                                    Tax: {location.tax_rate}%
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">{location.address}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {currentLocation?.id !== location.id ? (
                                        <button
                                            onClick={() => setCurrentLocation(location)}
                                            className="btn-primary text-sm py-2"
                                        >
                                            Switch to this Location
                                        </button>
                                    ) : (
                                        <button className="btn-secondary text-sm py-2 opacity-50 cursor-default" disabled>
                                            <Check className="h-4 w-4 text-green-400" />
                                            Active
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            setSelectedLocationForManage(location);
                                            setIsManageModalOpen(true);
                                        }}
                                        className="btn-secondary text-sm py-2"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Manage
                                    </button>
                                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                                        <MoreVertical className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card text-center py-12">
                        <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No locations found</h3>
                        <p className="text-slate-500">
                            Add your first restaurant location to start managing it here.
                        </p>
                    </div>
                )}
            </div>

            {/* Add Location Card */}
            <div className="card border-dashed border-slate-700 p-8 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                    <Plus className="h-8 w-8 text-slate-600" />
                </div>
                <h3 className="font-bold mb-2 text-xl">Add New Location</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
                    Expand your business by adding a new restaurant location. All locations share the same menu and settings by default.
                </p>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-primary px-8"
                >
                    Get Started
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <AddLocationModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchLocations}
            />

            {selectedLocationForManage && (
                <ManageLocationModal
                    isOpen={isManageModalOpen}
                    onClose={() => {
                        setIsManageModalOpen(false);
                        setSelectedLocationForManage(null);
                    }}
                    onSuccess={fetchLocations}
                    location={selectedLocationForManage}
                />
            )}
        </div>
    );
}

