"use client";

import { useAppStore } from "@/stores";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "./sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const sidebarOpen = useAppStore((state) => state.sidebarOpen);

    return (
        <div className="min-h-screen bg-slate-950">
            <DashboardSidebar />
            <main
                className={cn(
                    "transition-all duration-300 pt-16 md:pt-0 min-h-screen",
                    sidebarOpen ? "md:ml-64" : "md:ml-16"
                )}
            >
                <div className="p-4 md:p-6">{children}</div>
            </main>
        </div>
    );
}

export { DashboardSidebar } from "./sidebar";
