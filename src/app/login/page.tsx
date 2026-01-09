"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import { ChefHat, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const message = searchParams.get("message");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-slate-950 via-slate-950 to-orange-950/20">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="h-16 w-16 bg-orange-500/20 rounded-2xl overflow-hidden">
                        <img src="/logo.png" alt="HubPlate" className="h-full w-full object-cover" />
                    </div>
                    <span className="text-3xl font-bold gradient-text">HubPlate</span>
                </div>

                {/* Login Card */}
                <div className="card p-8">
                    <h1 className="text-2xl font-bold text-center mb-2">
                        {t("auth.welcomeBack")}
                    </h1>
                    <p className="text-slate-400 text-center mb-8">
                        Sign in to your restaurant dashboard
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{message}</span>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="label">
                                {t("auth.email")}
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="manager@restaurant.com"
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
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input pr-12"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
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

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-orange-500 focus:ring-orange-500"
                                />
                                <span className="text-slate-400">Remember me</span>
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-orange-400 hover:text-orange-300"
                            >
                                {t("auth.forgotPassword")}
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-3"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                t("auth.login")
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-400">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-orange-400 hover:text-orange-300 font-medium">
                            {t("auth.signUp")}
                        </Link>
                    </div>
                </div>

                {/* Staff PIN Login Link */}
                <div className="mt-6 text-center">
                    <Link
                        href="/pin-login"
                        className="text-sm text-slate-400 hover:text-slate-300"
                    >
                        Staff? Login with PIN instead →
                    </Link>
                </div>
            </div>
        </div>
    );
}
