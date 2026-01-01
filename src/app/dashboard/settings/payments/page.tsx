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
    ChevronRight,
    Loader2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

function PaymentsContent() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [locations, setLocations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [connectingId, setConnectingId] = useState<string | null>(null);
    const supabase = createClient();

    // Check onboarding status
    useEffect(() => {
        async function fetchLocations() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('locations')
                    .select('id, name, stripe_account_id, stripe_onboarding_complete')
                    .eq('owner_id', user.id);

                if (error) throw error;
                setLocations(data || []);

                const success = searchParams.get('success');
                const locationId = searchParams.get('locationId');

                if (success === 'true' && locationId) {
                    // Manually verify status with the backend
                    const syncResponse = await fetch(`/api/stripe/connect?locationId=${locationId}`);
                    const syncData = await syncResponse.json();

                    if (syncData.status === 'complete') {
                        toast.success(`Stripe account connected successfully!`);
                        // Update status locally
                        setLocations(prev => prev.map(loc =>
                            loc.id === locationId ? { ...loc, stripe_onboarding_complete: true } : loc
                        ));
                    } else {
                        toast.error(`Onboarding not yet complete. Please finish all steps in Stripe.`);
                    }

                    // Clean URL
                    router.replace('/dashboard/settings/payments');
                }
            } catch (error) {
                console.error("Error fetching locations:", error);
                toast.error("Failed to load payment settings");
            } finally {
                setIsLoading(false);
            }
        }

        fetchLocations();
    }, [supabase, searchParams, router]);

    const handleOnboarding = async (locationId: string) => {
        setConnectingId(locationId);
        try {
            const response = await fetch('/api/stripe/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationId }),
            });
            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error(data.error || "Failed to start onboarding");
            }
        } catch (error) {
            console.error("Onboarding error:", error);
            toast.error("Something went wrong");
        } finally {
            setConnectingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Payments & Payouts</h1>
                <p className="text-slate-400 mt-1">
                    Configure Stripe Connect for each of your restaurant locations
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {locations.length === 0 ? (
                    <div className="card p-12 text-center">
                        <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold">No locations found</h3>
                        <p className="text-slate-400">Please add a location first to setup payments.</p>
                    </div>
                ) : (
                    locations.map((location) => (
                        <div key={location.id} className="card p-6 lg:p-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-orange-500" />
                                        <h3 className="text-xl font-bold">{location.name}</h3>
                                    </div>
                                    <p className="text-sm text-slate-400">
                                        {location.stripe_onboarding_complete
                                            ? "Stripe account connected and active"
                                            : "Connect your Stripe account to start accepting payments"}
                                    </p>
                                </div>

                                <div>
                                    {location.stripe_onboarding_complete ? (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 text-sm font-medium">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Active
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleOnboarding(location.id)}
                                            disabled={connectingId !== null}
                                            className="btn btn-primary px-6 py-2 rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50"
                                        >
                                            {connectingId === location.id ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Connecting...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    Connect Stripe
                                                    <ArrowRight className="w-4 h-4" />
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {!location.stripe_onboarding_complete && (
                                <div className="mt-8 pt-8 border-t border-slate-800">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FeatureItem
                                            icon={<Smartphone className="w-5 h-5 text-orange-400" />}
                                            title="BYOD Tap-to-Pay"
                                            desc="Accept cards using just your phone."
                                        />
                                        <FeatureItem
                                            icon={<ShieldCheck className="w-5 h-5 text-orange-400" />}
                                            title="PCI Compliant"
                                            desc="End-to-end encryption for every transaction."
                                        />
                                        <FeatureItem
                                            icon={<Building2 className="w-5 h-5 text-orange-400" />}
                                            title="Instant Payouts"
                                            desc="Access funds in minutes with Stripe."
                                        />
                                    </div>
                                </div>
                            )}

                            {location.stripe_onboarding_complete && (
                                <div className="mt-8 pt-8 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Payment Options</h4>
                                        <div className="space-y-2">
                                            <MethodToggle label="Visa / Mastercard / Amex" enabled={true} />
                                            <MethodToggle label="Apple Pay / Google Pay" enabled={true} />
                                            <MethodToggle label="Tap-to-Pay" enabled={true} />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Quick Actions</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            <Link
                                                href={`/dashboard/settings/payments/terminals?locationId=${location.id}`}
                                                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <MonitorSmartphone className="h-4 w-4 text-blue-400" />
                                                    <span>Manage Terminals</span>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-600" />
                                            </Link>
                                            <Link
                                                href={`/dashboard/settings/payments/tap-to-pay?locationId=${location.id}`}
                                                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Nfc className="h-4 w-4 text-orange-400" />
                                                    <span>Setup Tap-to-Pay</span>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-600" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function PaymentsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
            <PaymentsContent />
        </Suspense>
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
