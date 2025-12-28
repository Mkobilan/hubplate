"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores";
import { TerminalScreensaver } from "@/components/dashboard/terminal/TerminalScreensaver";
import { TerminalPinPad } from "@/components/dashboard/terminal/TerminalPinPad";
import { useTranslation } from "react-i18next";

export default function TerminalPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [showPinPad, setShowPinPad] = useState(false);
    const setCurrentEmployee = useAppStore((state) => state.setCurrentEmployee);
    const setIsOrgOwner = useAppStore((state) => state.setIsOrgOwner);
    const setClockStatus = useAppStore((state) => state.setClockStatus);
    const isTerminalMode = useAppStore((state) => state.isTerminalMode);

    // If somehow accessed without terminal mode? 
    // We might want to enforce it, but for now we assume the router handles protection or we just allow it.

    const handleUnlock = () => {
        setShowPinPad(true);
    };

    const handlePinSuccess = async (employee: any) => {
        // Set employee in store and clear org owner flag (unless we determine otherwise, but usually terminal sessions are employee-bound)
        // Even for owners, they have an employee record (or virtual one) with role='owner', so isManagerOrOwner check works.
        setCurrentEmployee(employee);
        setIsOrgOwner(false);

        // We might need to fetch clock status here too, or rely on dashboard to do it
        // The AppStore has a refreshClockStatus we can use if we had supabase client here, 
        // but dashboard layout usually handles init.

        router.push("/dashboard");
    };

    return (
        <div className="relative min-h-screen bg-slate-950 overflow-hidden">
            {/* Screensaver is active until tapped */}
            {!showPinPad && (
                <TerminalScreensaver onUnlock={handleUnlock} />
            )}

            {/* Pin Pad Modal */}
            {showPinPad && (
                <TerminalPinPad
                    onClose={() => setShowPinPad(false)}
                    onSuccess={handlePinSuccess}
                />
            )}
        </div>
    );
}
