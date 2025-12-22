"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    MonitorSmartphone,
    Wifi,
    WifiOff,
    CheckCircle2,
    AlertCircle,
    Plus,
    Settings,
    RefreshCw,
    ChevronRight,
    Loader2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";

// Type definition for Stripe Terminal integration
type Terminal = { id: string; name: string; type: string; status: "online" | "offline"; lastSeen: string; battery: number };

// TODO: Replace with Stripe Terminal API query
const terminals: Terminal[] = [];

export default function TerminalsPage() {
    const { t } = useTranslation();
    const [isDiscovering, setIsDiscovering] = useState(false);

    const handleDiscover = () => {
        setIsDiscovering(true);
        setTimeout(() => setIsDiscovering(false), 3000);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <MonitorSmartphone className="h-8 w-8 text-orange-500" />
                        Payment Terminals
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Manage your Stripe Terminal readers and hardware
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/settings/payments" className="btn-secondary">
                        ← Back
                    </Link>
                    <button onClick={handleDiscover} disabled={isDiscovering} className="btn-primary">
                        {isDiscovering ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Discovering...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4" />
                                Discover Readers
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card text-center">
                    <p className="text-3xl font-bold text-green-400">{terminals.filter(t => t.status === "online").length}</p>
                    <p className="text-sm text-slate-500 mt-1">Online</p>
                </div>
                <div className="card text-center">
                    <p className="text-3xl font-bold text-red-400">{terminals.filter(t => t.status === "offline").length}</p>
                    <p className="text-sm text-slate-500 mt-1">Offline</p>
                </div>
                <div className="card text-center">
                    <p className="text-3xl font-bold">{formatCurrency(12450.75)}</p>
                    <p className="text-sm text-slate-500 mt-1">Today&apos;s Volume</p>
                </div>
            </div>

            {/* Terminal List */}
            <div className="space-y-4">
                {terminals.map((terminal) => (
                    <div
                        key={terminal.id}
                        className={cn(
                            "card flex items-center justify-between transition-all",
                            terminal.status === "offline" && "opacity-60"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "p-3 rounded-2xl",
                                terminal.status === "online" ? "bg-green-500/10" : "bg-red-500/10"
                            )}>
                                {terminal.status === "online" ? (
                                    <Wifi className="h-6 w-6 text-green-400" />
                                ) : (
                                    <WifiOff className="h-6 w-6 text-red-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold">{terminal.name}</h3>
                                <p className="text-sm text-slate-500">{terminal.type}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium">
                                    {terminal.status === "online" ? (
                                        <span className="text-green-400">Online</span>
                                    ) : (
                                        <span className="text-red-400">Offline</span>
                                    )}
                                </p>
                                <p className="text-xs text-slate-500">{terminal.lastSeen}</p>
                            </div>

                            {/* Battery Indicator */}
                            <div className="hidden md:flex items-center gap-2">
                                <div className="w-8 h-4 border border-slate-600 rounded-sm relative">
                                    <div
                                        className={cn(
                                            "absolute left-0 top-0 bottom-0 rounded-sm",
                                            terminal.battery > 50 ? "bg-green-500" : terminal.battery > 20 ? "bg-amber-500" : "bg-red-500"
                                        )}
                                        style={{ width: `${terminal.battery}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500">{terminal.battery}%</span>
                            </div>

                            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                                <Settings className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Terminal */}
            <div className="card border-dashed border-slate-700 p-8 text-center">
                <Plus className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <h3 className="font-bold mb-2">Add New Terminal</h3>
                <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
                    Connect a new Stripe Terminal reader to accept in-person payments at your location.
                </p>
                <button className="btn-secondary">
                    Order a Reader
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Help Card */}
            <div className="card border-blue-500/20 bg-blue-500/5">
                <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-400 shrink-0" />
                    <div>
                        <h4 className="font-bold text-blue-400">Terminal Troubleshooting</h4>
                        <p className="text-sm text-slate-400 mt-1">
                            If a terminal shows as offline, try these steps:
                        </p>
                        <ul className="text-sm text-slate-400 mt-2 space-y-1 list-disc list-inside">
                            <li>Ensure the terminal is powered on and charged</li>
                            <li>Check that it&apos;s connected to WiFi or has cellular signal</li>
                            <li>Try pressing &quot;Discover Readers&quot; to refresh the connection</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
