"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/stores";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const SeatMapEditor = dynamic(() => import("./SeatMapEditor"), {
    loading: () => (
        <div className="flex justify-center items-center h-screen bg-slate-950">
            <Loader2 className="animate-spin text-orange-500 h-8 w-8" />
        </div>
    ),
    ssr: false,
});

export default function SeatMapEditorPage() {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const router = useRouter();
    const loading = !currentEmployee && !isOrgOwner; // Initial load

    const MANAGEMENT_ROLES = ["owner", "manager"];
    const canEdit = isOrgOwner || (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role));

    useEffect(() => {
        if (!loading && !canEdit) {
            router.push("/dashboard/seating");
        }
    }, [loading, canEdit, router]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-950">
                <Loader2 className="animate-spin text-orange-500 h-8 w-8" />
            </div>
        );
    }

    if (!canEdit) return null; // Will redirect

    return <SeatMapEditor />;
}
