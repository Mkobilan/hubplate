"use client";

import { useAppStore } from "@/stores";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "./sidebar";
import { InviteHandler } from "./InviteHandler";
import { SessionHandler } from "./SessionHandler";
import { TerminalPortal } from "./terminal/TerminalPortal";
import { TerminalSetupPrompt } from "./terminal/TerminalSetupPrompt";
import { OnboardingTour } from "./OnboardingTour";
import { LocationBillingIntercept } from "./locations/LocationBillingIntercept";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const sidebarOpen = useAppStore((state) => state.sidebarOpen);

    return (
        <div className="min-h-screen bg-slate-950">
            <SessionHandler />
            <InviteHandler />
            <TerminalPortal />
            <TerminalSetupPrompt />
            <OnboardingTour />
            <LocationBillingIntercept />
            <DashboardSidebar />
            <main
                className={cn(
                    "transition-all duration-300 pt-16 md:pt-0 min-h-screen pb-[env(safe-area-inset-bottom)]",
                    sidebarOpen ? "md:ml-64" : "md:ml-16"
                )}
            >
                <div className="p-4 md:p-6">{children}</div>
            </main>
        </div>
    );
}

export { DashboardSidebar } from "./sidebar";
export { InviteHandler } from "./InviteHandler";
