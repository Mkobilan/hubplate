"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Smartphone,
    Nfc,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Loader2,
    Wifi,
    X,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function TapToPayPage() {
    const { t } = useTranslation();
    const [isSetUp, setIsSetUp] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [testMode, setTestMode] = useState(false);

    const handleSetup = () => {
        setIsConnecting(true);
        setTimeout(() => {
            setIsConnecting(false);
            setIsSetUp(true);
        }, 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Nfc className="h-8 w-8 text-orange-500" />
                        Tap-to-Pay Setup
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Accept contactless payments directly on your phone - no terminal required
                    </p>
                </div>
                <Link href="/dashboard/settings/payments" className="btn btn-secondary">
                    ← Back to Payments
                </Link>
            </div>

            {!isSetUp ? (
                <div className="card p-8 lg:p-12 text-center max-w-3xl mx-auto space-y-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                        <Smartphone className="w-12 h-12 text-white" />
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold">Turn your phone into a terminal</h2>
                        <p className="text-slate-400 text-lg max-w-xl mx-auto">
                            Accept **Visa, Mastercard, Amex, Apple Pay, and Google Pay** using just your iPhone or Android device.
                            No additional hardware needed.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center mb-3">
                                <Wifi className="h-5 w-5 text-green-400" />
                            </div>
                            <h4 className="font-bold mb-1">Works Offline</h4>
                            <p className="text-xs text-slate-500">Transactions sync when you reconnect.</p>
                        </div>
                        <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mb-3">
                                <CheckCircle2 className="h-5 w-5 text-blue-400" />
                            </div>
                            <h4 className="font-bold mb-1">Instant Setup</h4>
                            <p className="text-xs text-slate-500">Ready in under 2 minutes.</p>
                        </div>
                        <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3">
                                <Nfc className="h-5 w-5 text-purple-400" />
                            </div>
                            <h4 className="font-bold mb-1">All Cards Accepted</h4>
                            <p className="text-xs text-slate-500">Visa, Mastercard, Amex, Discover.</p>
                        </div>
                    </div>

                    <div className="pt-6 space-y-4">
                        <button
                            onClick={handleSetup}
                            disabled={isConnecting}
                            className="btn btn-primary px-12 py-4 text-lg rounded-2xl shadow-xl shadow-orange-500/20"
                        >
                            {isConnecting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Connecting to Stripe...
                                </>
                            ) : (
                                <>
                                    Enable Tap-to-Pay
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                        <p className="text-xs text-slate-500">
                            Requires iOS 15.4+ or Android 9+ with NFC capability.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status Card */}
                    <div className="card border-green-500/30 bg-green-500/5">
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircle2 className="h-6 w-6 text-green-400" />
                            <h3 className="text-xl font-bold text-green-400">Tap-to-Pay Active</h3>
                        </div>
                        <p className="text-sm text-slate-400 mb-6">
                            Your device is ready to accept contactless payments. Hold the customer&apos;s card near the top of your phone to process payments.
                        </p>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                                <span className="text-sm">Device</span>
                                <span className="text-sm font-bold">iPhone 14 Pro</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                                <span className="text-sm">Status</span>
                                <span className="text-sm font-bold text-green-400">Connected</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                                <span className="text-sm">Today&apos;s Transactions</span>
                                <span className="text-sm font-bold">24</span>
                            </div>
                        </div>

                        <button className="btn btn-secondary w-full text-sm">
                            View Transaction History
                        </button>
                    </div>

                    {/* Test Mode Card */}
                    <div className="card">
                        <h3 className="font-bold mb-4">Test Mode</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Enable test mode to practice accepting payments without processing real transactions.
                        </p>

                        <div
                            onClick={() => setTestMode(!testMode)}
                            className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all",
                                testMode
                                    ? "bg-amber-500/10 border-amber-500/50"
                                    : "bg-slate-900/50 border-slate-800"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <AlertCircle className={cn("h-5 w-5", testMode ? "text-amber-400" : "text-slate-500")} />
                                <div>
                                    <p className="font-medium">{testMode ? "Test Mode Active" : "Enable Test Mode"}</p>
                                    <p className="text-xs text-slate-500">
                                        {testMode ? "Using test cards only" : "Practice with fake transactions"}
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "w-10 h-5 rounded-full relative transition-colors",
                                testMode ? "bg-amber-500" : "bg-slate-700"
                            )}>
                                <div className={cn(
                                    "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform",
                                    testMode ? "translate-x-5" : ""
                                )} />
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-slate-900/50 rounded-xl">
                            <h4 className="font-bold text-sm mb-2">Test Card Numbers</h4>
                            <div className="space-y-2 text-xs font-mono text-slate-400">
                                <p>Visa: 4242 4242 4242 4242</p>
                                <p>Mastercard: 5555 5555 5555 4444</p>
                                <p>Amex: 3782 822463 10005</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
