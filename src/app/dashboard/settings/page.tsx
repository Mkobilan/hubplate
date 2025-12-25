"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    Settings as SettingsIcon,
    Save,
    Loader2,
    Users,
    RefreshCw,
    Check,
    AlertCircle,
    Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
    const { t } = useTranslation();
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    // Settings state
    const [settings, setSettings] = useState({
        require_manager_approval_for_swaps: false,
    });

    const MANAGEMENT_ROLES = ["owner", "manager"];
    const isManagerOrOwner = (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role)) || isOrgOwner;

    const fetchSettings = async () => {
        const orgId = (currentEmployee as any)?.organization_id;
        if (!orgId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error } = await supabase
                .from("organizations")
                .select("require_manager_approval_for_swaps")
                .eq("id", orgId)
                .single();

            if (error) throw error;

            if (data) {
                setSettings({
                    require_manager_approval_for_swaps: (data as any).require_manager_approval_for_swaps || false,
                });
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentEmployee) {
            fetchSettings();
        } else {
            // Fallback: if no employee after 3 seconds, stop loading
            const timer = setTimeout(() => setLoading(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [currentEmployee?.id]);

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            setStatus("idle");
            const supabase = createClient();

            const orgId = (currentEmployee as any)?.organization_id;
            if (!orgId) throw new Error("No organization found");

            const { error } = await supabase
                .from("organizations")
                .update({
                    require_manager_approval_for_swaps: settings.require_manager_approval_for_swaps,
                })
                .eq("id", orgId);

            if (error) throw error;

            setStatus("success");
            setMessage("Settings saved successfully!");
            setTimeout(() => setStatus("idle"), 3000);
        } catch (err) {
            console.error("Error saving settings:", err);
            setStatus("error");
            setMessage("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    if (!isManagerOrOwner) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <SettingsIcon className="h-12 w-12 text-slate-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
                <p className="text-slate-400">Only managers and owners can access settings.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-lg shadow-orange-500/5">
                        <SettingsIcon className="h-7 w-7 text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Settings</h1>
                        <p className="text-slate-400">Manage organization preferences</p>
                    </div>
                </div>
                <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="btn btn-primary gap-2"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </button>
            </div>

            {/* Status Message */}
            {status !== "idle" && (
                <div className={cn(
                    "p-4 rounded-xl flex items-center gap-3",
                    status === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                    {status === "success" ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {message}
                </div>
            )}

            {/* Shift Swaps Section */}
            <div className="card space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                        <RefreshCw className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Shift Swaps</h2>
                        <p className="text-xs text-slate-500">Configure how shift swaps are handled</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Manager Approval Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Users className="h-5 w-5 text-orange-400" />
                            </div>
                            <div>
                                <p className="font-medium text-white">Require Manager Approval</p>
                                <p className="text-xs text-slate-400 max-w-md">
                                    When enabled, shift swaps will require a manager to approve before they take effect. When disabled, swaps auto-complete when the recipient accepts.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSettings({
                                ...settings,
                                require_manager_approval_for_swaps: !settings.require_manager_approval_for_swaps
                            })}
                            className={cn(
                                "relative w-14 h-8 rounded-full transition-colors duration-200",
                                settings.require_manager_approval_for_swaps
                                    ? "bg-orange-500"
                                    : "bg-slate-700"
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200",
                                    settings.require_manager_approval_for_swaps
                                        ? "translate-x-7"
                                        : "translate-x-1"
                                )}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Organization Info */}
            <div className="card space-y-4 bg-slate-900/30">
                <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-slate-500" />
                    <h3 className="font-medium text-slate-400">Organization</h3>
                </div>
                <p className="text-sm text-slate-500">
                    Settings apply to all locations within your organization. More settings will be available soon.
                </p>
            </div>
        </div>
    );
}
