"use client";

import { useAppStore } from "@/stores";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const MANAGEMENT_ROLES = ["owner", "manager", "gm", "agm"];

export default function MenuLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // We need to wait for the store to hydrate/load employee data
        const checkAuth = () => {
            if (isOrgOwner) {
                setIsAuthorized(true);
                setLoading(false);
            } else if (currentEmployee) {
                setIsAuthorized(MANAGEMENT_ROLES.includes(currentEmployee.role || ""));
                setLoading(false);
            } else {
                // Still waiting for employee data
                // If it takes too long, we could add a timeout, but usually it's fast
            }
        };

        checkAuth();
    }, [currentEmployee, isOrgOwner]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh]">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                <p className="mt-4 text-slate-400">Verifying permissions...</p>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[80vh]">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Access Denied</h2>
                <p className="text-slate-400 max-w-md">
                    You do not have permission to access the menu management section.
                    Only owners, GMs, and managers can modify the menu.
                </p>
                <Link href="/dashboard" className="btn btn-primary mt-6">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}
