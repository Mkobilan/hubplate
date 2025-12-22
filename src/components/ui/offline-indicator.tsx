"use client";

import { useAppStore } from "@/stores";
import { useTranslation } from "react-i18next";
import { Wifi, WifiOff } from "lucide-react";

export function OfflineIndicator() {
    const { t } = useTranslation();
    const isOnline = useAppStore((state) => state.isOnline);

    if (isOnline) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 animate-slide-up">
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/90 text-white rounded-lg shadow-lg backdrop-blur-sm">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">{t("common.offline")}</span>
            </div>
        </div>
    );
}

export function OnlineIndicator() {
    const { t } = useTranslation();
    const isOnline = useAppStore((state) => state.isOnline);

    // Show briefly when coming back online
    // In a real app, you'd track the transition and show for a few seconds

    if (!isOnline) return null;

    return null; // Only show when transitioning back online
}
