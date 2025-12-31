"use client";

import { useAppStore } from "@/stores";
import { usePathname } from "next/navigation";
import { LocationBillingModal } from "./location-billing-modal";
import { AlertCircle, Lock } from "lucide-react";

import { useState } from "react";

export function LocationBillingIntercept() {
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const pathname = usePathname();

    // Don't intercept if no location selected or if on the locations/billing pages
    if (!currentLocation) return null;

    // We allow the locations page so they can switch/pay
    const isAllowedPage = pathname === "/dashboard/locations" || pathname === "/billing-setup";

    if (isAllowedPage) return null;

    // Check if the location is paid
    const isPaid = (currentLocation as any).is_paid;

    if (isPaid === false) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="relative">
                        <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <Lock className="h-12 w-12 text-orange-500" />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-red-500 p-2 rounded-full animate-bounce">
                            <AlertCircle className="h-4 w-4 text-white" />
                        </div>
                    </div>

                    <div>
                        <h2 className="text-3xl font-bold mb-3">Location Locked</h2>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            The dashboard for <span className="text-white font-semibold font-mono">{currentLocation.name}</span> is currently locked. Please activate this location to continue.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn btn-primary w-full py-4 text-lg font-bold shadow-xl shadow-orange-500/20"
                        >
                            Activate This Location
                        </button>

                        <button
                            onClick={() => window.location.href = "/dashboard/locations"}
                            className="btn btn-secondary w-full"
                        >
                            Pick a Different Location
                        </button>
                    </div>
                </div>

                <LocationBillingModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    locationName={currentLocation.name}
                    locationId={currentLocation.id}
                    orgId={(currentLocation as any).organization_id}
                />
            </div>
        );
    }

    return null;
}
