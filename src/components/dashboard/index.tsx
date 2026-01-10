"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppStore } from "@/stores";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "./sidebar";
import { InviteHandler } from "./InviteHandler";
import { SessionHandler } from "./SessionHandler";
import { TerminalPortal } from "./terminal/TerminalPortal";
import { TerminalSetupPrompt } from "./terminal/TerminalSetupPrompt";
import { OnboardingTour } from "./OnboardingTour";
import { LocationBillingIntercept } from "./locations/LocationBillingIntercept";
import { Lock } from "lucide-react";

const MANAGEMENT_ROLES = ["owner", "manager", "gm", "agm"];
const RESTRICTED_PATHS = [
    "/dashboard/staff",
    "/dashboard/inventory",
    "/dashboard/invoices",
    "/dashboard/analytics",
    "/dashboard/payroll",
    "/dashboard/locations",
    "/dashboard/settings/payments",
    "/dashboard/recipes",
    "/dashboard/online-ordering",
    "/dashboard/customers",
    "/dashboard/menu/happy-hour"
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const sidebarOpen = useAppStore((state) => state.sidebarOpen);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const isTerminalMode = useAppStore((state) => state.isTerminalMode);
    const isSessionChecked = useAppStore((state) => state.isSessionChecked);

    const isManager = isTerminalMode
        ? (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role))
        : (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role)) || isOrgOwner;

    const isRestrictedPath = RESTRICTED_PATHS.some(path => pathname.startsWith(path));

    const [isHydrated, setIsHydrated] = useState(false);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsHydrated(true);
    }, []);

    // Wait for hydration AND session check before showing Access Denied.
    // This gives SessionHandler time to re-validate the session with Supabase.
    // We trust persisted isManager state during the check to prevent flickers.
    const isUnauthorized = isRestrictedPath && !isManager && isHydrated && isSessionChecked;

    // Optional: Add a small delay or check for 'isHydrated' if using zustand persist
    // For now, if we have NO employee and NOT an owner, but we ARE logged into Supabase (checked by SessionHandler),
    // we just let it render everything first.

    if (isUnauthorized) {
        return (
            <div className="min-h-screen bg-slate-950">
                <DashboardSidebar />
                <main
                    className={cn(
                        "transition-all duration-300 pt-16 md:pt-0 min-h-screen flex items-center justify-center p-4",
                        sidebarOpen ? "md:ml-64" : "md:ml-16"
                    )}
                >
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="bg-orange-500/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto border border-orange-500/20">
                            <Lock className="h-10 w-10 text-orange-500" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-slate-100">Access Denied</h1>
                            <p className="text-slate-400">
                                You don&apos;t have permission to access this page. Please contact your manager if you believe this is an error.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </main>
            </div>
        );
    }

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
