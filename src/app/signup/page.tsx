"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChefHat, Eye, EyeOff, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [formData, setFormData] = useState({
        restaurantName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        restaurant_name: formData.restaurantName,
                    },
                },
            });

            if (error) throw error;
            router.push("/onboarding");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-950 via-slate-950 to-orange-950/20">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="p-3 bg-orange-500/20 rounded-2xl">
                        <ChefHat className="h-10 w-10 text-orange-500" />
                    </div>
                    <span className="text-3xl font-bold gradient-text">HubPlate</span>
                </div>

                {/* Signup Card */}
                <div className="card p-8">
                    <h1 className="text-2xl font-bold text-center mb-2">
                        {t("auth.createAccount")}
                    </h1>
                    <p className="text-slate-400 text-center mb-8">
                        Start your 14-day free trial
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="restaurantName" className="label">
                                Restaurant Name
                            </label>
                            <input
                                id="restaurantName"
                                name="restaurantName"
                                type="text"
                                value={formData.restaurantName}
                                onChange={handleChange}
                                className="input"
                                placeholder="Joe's Diner"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="label">
                                {t("auth.email")}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input"
                                placeholder="you@restaurant.com"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="label">
                                {t("auth.password")}
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input pr-12"
                                    placeholder="Min. 8 characters"
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="label">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="input"
                                placeholder="Confirm your password"
                                required
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                "Start Free Trial"
                            )}
                        </button>
                    </form>

                    {/* Benefits */}
                    <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
                        <Feature text="14-day free trial, no credit card" />
                        <Feature text="Works on any phone or tablet" />
                        <Feature text="Cancel anytime" />
                    </div>

                    <div className="mt-6 text-center text-sm text-slate-400">
                        Already have an account?{" "}
                        <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium">
                            {t("auth.login")}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Feature({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="p-0.5 rounded-full bg-green-500/20">
                <Check className="h-3 w-3 text-green-400" />
            </div>
            {text}
        </div>
    );
}
