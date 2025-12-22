"use client";

import { useTranslation } from "react-i18next";
import {
    CreditCard,
    Smartphone,
    ArrowRight,
    ShieldCheck,
    Building2,
    Info,
    CheckCircle2,
    AlertCircle,
    MonitorSmartphone,
    Nfc,
    ChevronRight
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";

export default function PaymentsPage() {
    const { t } = useTranslation();
    const [isOnboarded, setIsOnboarded] = useState(false);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Payments & Payouts</h1>
                <p className="text-slate-400 mt-1">
                    Configure your merchant account and manage payment methods
                </p>
            </div>

            {!isOnboarded ? (
                <div className="card p-8 lg:p-12 text-center max-w-3xl mx-auto space-y-8">
                    <div className="w-20 h-20 bg-orange-500/20 rounded-3xl flex items-center justify-center mx-auto">
                        <CreditCard className="w-10 h-10 text-orange-500" />
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold">Accept payments with HubPlate</h2>
                        <p className="text-slate-400 text-lg">
                            We use **Stripe Connect** to ensure secure, fast payouts directly to your business bank account.
                            No monthly merchant fees, just a flat processing rate.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        <FeatureItem
                            icon={<Smartphone className="w-5 h-5 text-orange-400" />}
                            title="BYOD Tap-to-Pay"
                            desc="Accept cards using just your Android/iOS phone."
                        />
                        <FeatureItem
                            icon={<ShieldCheck className="w-5 h-5 text-orange-400" />}
                            title="PCI Compliant"
                            desc="End-to-end encryption for every transaction."
                        />
                        <FeatureItem
                            icon={<Building2 className="w-5 h-5 text-orange-400" />}
                            title="Instant Payouts"
                            desc="Access your funds in minutes with Stripe Connect."
                        />
                    </div>

                    <div className="pt-8 flex flex-col items-center gap-4">
                        <button
                            onClick={() => setIsOnboarded(true)}
                            className="btn-primary px-12 py-4 text-lg rounded-2xl shadow-xl shadow-orange-500/20"
                        >
                            Start Onboarding with Stripe
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </button>
                        <p className="text-xs text-slate-500">
                            By clicking, you will be redirected to Stripe to securely provide your business details.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Status Column */}
                    <div className="space-y-6">
                        <div className="card border-green-500/30 bg-green-500/5">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                                <h3 className="font-bold text-green-400">Account Active</h3>
                            </div>
                            <p className="text-sm text-slate-400 mb-6">
                                Your account is fully verified and ready to accept payments.
                            </p>
                            <button className="btn-secondary w-full text-xs py-2">View Stripe Dashboard</button>
                        </div>

                        <div className="card">
                            <h3 className="font-bold mb-4">Payout Schedule</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Next Payout</span>
                                    <span className="font-bold">May 24, 2025</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Amount</span>
                                    <span className="font-bold text-green-400">{formatCurrency(4285.50)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Configuration Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="card">
                            <h3 className="font-bold mb-6">Payment Methods</h3>
                            <div className="space-y-4">
                                <MethodToggle label="Visa / Mastercard / Amex" enabled={true} />
                                <MethodToggle label="Apple Pay / Google Pay" enabled={true} />
                                <MethodToggle label="Tap-to-Pay (iPhone/Android)" enabled={true} />
                                <MethodToggle label="Physical Terminal (Verifone)" enabled={false} />
                            </div>
                        </div>

                        <div className="card border-blue-500/20 bg-blue-500/5">
                            <div className="flex gap-3">
                                <AlertCircle className="h-5 w-5 text-blue-400 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-blue-400">Lower Your Rates</h4>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Your current processing rate is **2.9% + 30¢**.
                                        If your monthly volume exceeds **$50,000**, you qualify for custom enterprise pricing.
                                    </p>
                                    <button className="text-sm text-blue-400 font-medium mt-4 hover:underline">
                                        Contact sales for custom rates →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="card">
                        <h3 className="font-bold mb-4">Quick Links</h3>
                        <div className="space-y-2">
                            <Link
                                href="/dashboard/settings/payments/terminals"
                                className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <MonitorSmartphone className="h-4 w-4 text-blue-400" />
                                    <span>Manage Terminals</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                            </Link>
                            <Link
                                href="/dashboard/settings/payments/tap-to-pay"
                                className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm text-orange-400 font-medium"
                            >
                                <div className="flex items-center gap-2">
                                    <Nfc className="h-4 w-4" />
                                    <span>Setup Tap-to-Pay</span>
                                </div>
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                {icon}
                <h4 className="font-bold text-sm">{title}</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
        </div>
    );
}

function MethodToggle({ label, enabled }: { label: string, enabled: boolean }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
            <span className="font-medium text-sm">{label}</span>
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
