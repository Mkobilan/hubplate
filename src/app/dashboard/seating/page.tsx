"use client";

import dynamic from "next/dynamic";
import { Loader2, Settings2 } from "lucide-react";
import { useAppStore } from "@/stores";
import { useRouter } from "next/navigation";

const SeatMapViewer = dynamic(() => import("./SeatMapViewer"), {
    loading: () => (
        <div className="flex justify-center items-center h-screen bg-slate-950">
            <Loader2 className="animate-spin text-orange-500 h-8 w-8" />
        </div>
    ),
    ssr: false,
});

export default function SeatingPage() {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const router = useRouter();

    const MANAGEMENT_ROLES = ["owner", "manager"];
    const canEdit = isOrgOwner || (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role));

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Floor Plan</h1>
                    <p className="text-slate-400 mt-1">Manage seating and table availability</p>
                </div>
            </div>

            {/* Viewer */}
            <SeatMapViewer />
        </div>
    );
}
