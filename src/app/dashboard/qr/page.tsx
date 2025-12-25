"use client";

import { useTranslation } from "react-i18next";
import {
    QrCode,
    Smartphone,
    Download,
    Copy,
    ExternalLink,
    Info
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function QRPage() {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    // TODO: Fetch restaurant ID from Supabase profile
    const restaurantId = "cznamqic";
    const restaurantUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/m/${restaurantId}`
        : `https://hubplate.app/m/${restaurantId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(restaurantUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">QR Code Ordering</h1>
                <p className="text-slate-400 mt-1">
                    Give customers zero-friction ordering from their own devices
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main QR Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card p-8 flex flex-col items-center text-center">
                        <div className="p-6 bg-white rounded-3xl mb-6 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                            {/* This would be a real QR component in production */}
                            <div className="w-48 h-48 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                <QrCode className="w-40 h-40 text-slate-900" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-orange-500 p-2 rounded-xl border-4 border-white">
                                        <Smartphone className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold mb-2">Your Digital Menu is Live</h2>
                        <p className="text-slate-400 mb-8 max-w-sm">
                            Customers can scan this code to view the menu, customize items, and place orders directly to the kitchen.
                        </p>

                        <div className="flex flex-wrap gap-4 justify-center w-full">
                            <button className="btn btn-primary px-8">
                                <Download className="h-4 w-4" />
                                Download PNG
                            </button>
                            <button className="btn btn-secondary px-8">
                                <Download className="h-4 w-4" />
                                Download PDF
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="font-semibold mb-4">Direct Menu Link</h3>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 flex items-center text-slate-300 font-mono text-sm overflow-hidden whitespace-nowrap">
                                {restaurantUrl}
                            </div>
                            <button
                                onClick={handleCopy}
                                className={cn(
                                    "btn btn-secondary px-4 transition-all",
                                    copied && "bg-green-500/20 text-green-400 border-green-500/50"
                                )}
                            >
                                {copied ? "Copied!" : <Copy className="h-4 w-4" />}
                            </button>
                            <button className="btn btn-secondary px-4">
                                <ExternalLink className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Settings & Info */}
                <div className="space-y-6">
                    <div className="card">
                        <h3 className="font-semibold mb-4">QR Settings</h3>
                        <div className="space-y-4">
                            <ToggleSetting
                                label="Self-Ordering"
                                description="Allow customers to place orders"
                                enabled={true}
                            />
                            <ToggleSetting
                                label="Table Assignment"
                                description="Require table selection on scan"
                                enabled={true}
                            />
                            <ToggleSetting
                                label="Pre-Payment"
                                description="Require payment before order"
                                enabled={false}
                            />
                        </div>
                    </div>

                    <div className="card bg-blue-500/5 border-blue-500/30">
                        <div className="flex gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg h-fit text-blue-400">
                                <Info className="h-5 w-5" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-blue-400">Pro Tip</h4>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    Print individual QR codes for each table to auto-assign table numbers and speed up ordering.
                                </p>
                                <button className="text-sm text-blue-400 font-medium hover:underline">
                                    Generate table stickers →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToggleSetting({ label, description, enabled }: { label: string, description: string, enabled: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
            <div className={cn(
                "w-10 h-5 rounded-full relative transition-colors cursor-pointer shrink-0",
                enabled ? "bg-orange-500" : "bg-slate-700"
            )}>
                <div className={cn(
                    "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform",
                    enabled ? "translate-x-5" : ""
                )} />
            </div>
        </div>
    );
}
