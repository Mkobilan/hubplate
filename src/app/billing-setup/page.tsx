"use client";

import { CreditCard, Check, Loader2, ChefHat, Sparkles, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

export default function BillingSetupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [cancelled, setCancelled] = useState(false);

    useEffect(() => {
        if (searchParams.get('success')) {
            if (typeof window !== 'undefined') {
                window.sessionStorage.setItem('just_paid', 'true');
            }
            toast.success("Payment successful! Redirecting to dashboard...");
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        }

        if (searchParams.get('cancelled')) {
            setCancelled(true);
            toast.error("Subscription setup was cancelled. Card info is required to start your trial.");
        }
    }, [searchParams, router]);

    const handleStartTrial = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/stripe/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || 'price_1Sk1m4LqdneHwurFvLvkPbat',
                    orgId: searchParams.get('org_id')
                }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "Failed to start trial");
            }
        } catch (error: any) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-950 via-slate-950 to-orange-950/20">
            <div className="w-full max-w-2xl">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-12">
                    <div className="p-3 bg-orange-500/20 rounded-2xl">
                        <ChefHat className="h-10 w-10 text-orange-500" />
                    </div>
                    <span className="text-3xl font-bold gradient-text">HubPlate</span>
                </div>

                <div className="card p-8 md:p-12">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold mb-4">Final Step: Secure Your Trial</h1>
                        <p className="text-slate-400 text-lg">
                            To prevent fraud and ensure a smooth transition after your trial,
                            we require a valid payment method up front.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-6">
                            <h3 className="font-bold text-xl flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-orange-500" />
                                What happens next?
                            </h3>
                            <ul className="space-y-4">
                                <StepItem
                                    icon={<Check className="h-5 w-5 text-green-500" />}
                                    text="14 days of full access for $0"
                                />
                                <StepItem
                                    icon={<Check className="h-5 w-5 text-green-500" />}
                                    text="No transaction fees. Bring Your Own Device"
                                />
                                <StepItem
                                    icon={<Check className="h-5 w-5 text-green-500" />}
                                    text="Cancel anytime with one click"
                                />
                            </ul>
                        </div>

                        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
                            <h4 className="font-bold mb-4 uppercase tracking-widest text-xs text-slate-500">Professional Plan</h4>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-4xl font-bold">$99</span>
                                <span className="text-slate-400">/mo per location</span>
                            </div>
                            <div className="space-y-2 text-sm text-slate-400">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-orange-500" />
                                    <span>All features included</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-orange-500" />
                                    <span>Unlimited staff accounts</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {searchParams.get('success') && (
                        <div className="mb-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-center animate-pulse">
                            <div className="flex items-center justify-center gap-2 mb-2 font-bold text-lg text-emerald-300">
                                <CheckCircle2 className="h-6 w-6" />
                                Payment Successful!
                            </div>
                            Setting up your dashboard...
                        </div>
                    )}

                    {cancelled && (
                        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center">
                            Please complete the billing setup to continue. You won't be charged today.
                        </div>
                    )}

                    <button
                        onClick={handleStartTrial}
                        disabled={loading}
                        className="btn btn-primary w-full py-4 text-xl font-bold shadow-xl shadow-orange-500/20 group"
                    >
                        {loading ? (
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <CreditCard className="h-6 w-6" />
                                Start My 14-Day Free Trial
                            </span>
                        )}
                    </button>

                    <p className="mt-6 text-center text-xs text-slate-500 leading-relaxed">
                        By starting your trial, you agree to our Terms of Service and Privacy Policy.
                        You will be redirected to Stripe's secure checkout to provide your details.
                    </p>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => router.push('/login')}
                        className="text-sm text-slate-500 hover:text-slate-300"
                    >
                        Sign out and finish later
                    </button>
                </div>
            </div>
        </div>
    );
}

function StepItem({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <li className="flex items-start gap-3 text-slate-300">
            <div className="mt-0.5">{icon}</div>
            <span className="font-medium">{text}</span>
        </li>
    );
}
