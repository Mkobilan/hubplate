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
    Lock,
    Smartphone,
    Monitor,
    Bell,
    BellRing,
    Mail,
    MessageSquare,
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
        admin_pin: "",
        google_review_link: "",
    });

    const MANAGEMENT_ROLES = ["owner", "manager", "gm", "agm"];
    const isManagerOrOwner = (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role)) || isOrgOwner;

    const fetchSettings = async () => {
        const orgId = (currentEmployee as any)?.organization_id || currentLocation?.organization_id;
        const locationId = currentLocation?.id;

        if (!orgId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const supabase = createClient();

            // Fetch Organization Settings
            const { data: orgData, error: orgError } = await supabase
                .from("organizations")
                .select("require_manager_approval_for_swaps, admin_pin")
                .eq("id", orgId)
                .single();

            if (orgError) throw orgError;

            // Fetch Location Settings
            let googleLink = "";
            if (locationId) {
                const { data: locData } = await supabase
                    .from("locations")
                    .select("google_review_link")
                    .eq("id", locationId)
                    .single();

                if (locData) {
                    googleLink = (locData as any).google_review_link || "";
                }
            }

            if (orgData) {
                setSettings({
                    require_manager_approval_for_swaps: (orgData as any).require_manager_approval_for_swaps || false,
                    admin_pin: (orgData as any).admin_pin || "",
                    google_review_link: googleLink,
                });
            } else {
                // If orgData not found/accessible, at least set the google link
                setSettings(prev => ({
                    ...prev,
                    google_review_link: googleLink
                }));
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
    }, [currentEmployee?.id, currentLocation?.id]);

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            setStatus("idle");
            const supabase = createClient();

            const orgId = (currentEmployee as any)?.organization_id || currentLocation?.organization_id;
            const locationId = currentLocation?.id;

            if (!orgId) throw new Error("No organization found");

            // Save Org Settings (Only for Owners)
            if (isOrgOwner) {
                const { error: orgError } = await (supabase.from("organizations") as any)
                    .update({
                        require_manager_approval_for_swaps: settings.require_manager_approval_for_swaps,
                        admin_pin: settings.admin_pin || null,
                    })
                    .eq("id", orgId);

                if (orgError) throw orgError;
            }

            // Save Location Settings (For Managers/Owners)
            if (locationId) {
                const { error: locError } = await (supabase.from("locations") as any)
                    .update({
                        google_review_link: settings.google_review_link || null
                    })
                    .eq("id", locationId);

                if (locError) throw locError;
            }

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
            {isManagerOrOwner && (
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
                                onClick={() => isOrgOwner && setSettings({
                                    ...settings,
                                    require_manager_approval_for_swaps: !settings.require_manager_approval_for_swaps
                                })}
                                disabled={!isOrgOwner}
                                className={cn(
                                    "relative w-14 h-8 rounded-full transition-colors duration-200",
                                    settings.require_manager_approval_for_swaps
                                        ? "bg-orange-500"
                                        : "bg-slate-700",
                                    !isOrgOwner && "opacity-50 cursor-not-allowed"
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
            )}

            {/* Organization Master PIN */}
            {isManagerOrOwner && (
                <div className="card space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                        <div className="p-2 bg-red-500/10 rounded-xl">
                            <Lock className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Organization Master PIN</h2>
                            <p className="text-xs text-slate-500">Master access for all terminals</p>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="label">Master PIN Code</label>
                                <p className="text-xs text-slate-400 mb-2">
                                    This PIN allows owners to log in to ANY terminal within the organization, overriding location restrictions.
                                </p>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={settings.admin_pin}
                                    disabled={!isOrgOwner}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setSettings({ ...settings, admin_pin: val });
                                    }}
                                    className={cn("input max-w-xs", !isOrgOwner && "opacity-50")}
                                    placeholder={isOrgOwner ? "Enter 4-6 digit PIN" : "Only owners can change PIN"}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Marketing Settings */}
            {isManagerOrOwner && (
                <div className="card space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                        <div className="p-2 bg-yellow-500/10 rounded-xl">
                            <MessageSquare className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Marketing Settings</h2>
                            <p className="text-xs text-slate-500">Configure links and preferences for automated campaigns</p>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <div>
                            <label className="label">Google Maps Review Link</label>
                            <p className="text-xs text-slate-400 mb-2">
                                Provide your Google Maps review link here. This will be automatically included in "Review Request" campaigns.
                            </p>
                            <input
                                type="url"
                                value={settings.google_review_link}
                                onChange={(e) => setSettings({ ...settings, google_review_link: e.target.value })}
                                className="input w-full"
                                placeholder="https://g.page/r/YOUR_CODE/review"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Terminal Mode Section */}
            {isManagerOrOwner && (
                <div className="card space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                        <div className="p-2 bg-purple-500/10 rounded-xl">
                            <Smartphone className="h-6 w-6 text-purple-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Terminal Mode</h2>
                            <p className="text-xs text-slate-500">Configure device specific settings</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Monitor className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="font-medium text-white">Enable Terminal Mode</p>
                                <p className="text-xs text-slate-400 max-w-md">
                                    Lock this device into Terminal Mode. This will log you out and present the Terminal PIN pad for employee access.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                if (confirm("Are you sure you want to switch to Terminal Mode? You will need to log back in to access settings.")) {
                                    const useAppStore = require("@/stores").useAppStore;
                                    useAppStore.getState().setTerminalMode(true);
                                    useAppStore.getState().setCurrentEmployee(null); // Logout current user
                                    window.location.href = "/terminal";
                                }
                            }}
                            className="btn btn-secondary text-sm"
                        >
                            Switch to Terminal
                        </button>
                    </div>
                </div>
            )}

            {/* Notifications Section */}
            <div className="card space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                    <div className="p-2 bg-green-500/10 rounded-xl">
                        <Bell className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Notifications</h2>
                        <p className="text-xs text-slate-500">Manage how you receive alerts</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Push Notifications */}
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-800 rounded-lg">
                                <BellRing className="h-5 w-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="font-medium text-white">Push Notifications</p>
                                <p className="text-xs text-slate-400">Receive alerts on this device</p>
                            </div>
                        </div>
                        <Toggle
                            checked={true} // TODO: State binding
                            onChange={() => { }}
                        />
                    </div>

                    {/* Email Notifications */}
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-800 rounded-lg">
                                <Mail className="h-5 w-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="font-medium text-white">Email Notifications</p>
                                <p className="text-xs text-slate-400">Receive summaries and important alerts</p>
                            </div>
                        </div>
                        <Toggle
                            checked={true} // TODO: State binding
                            onChange={() => { }}
                        />
                    </div>

                    {/* SMS Notifications */}
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-800 rounded-lg">
                                <MessageSquare className="h-5 w-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="font-medium text-white">SMS Notifications</p>
                                <p className="text-xs text-slate-400">Get text alerts for critical updates</p>
                            </div>
                        </div>
                        <Toggle
                            checked={false} // TODO: State binding
                            onChange={() => { }}
                        />
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

function Toggle({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={cn(
                "relative w-14 h-8 rounded-full transition-colors duration-200",
                checked ? "bg-orange-500" : "bg-slate-700"
            )}
        >
            <span
                className={cn(
                    "absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200",
                    checked ? "translate-x-7" : "translate-x-1"
                )}
            />
        </button>
    );
}
