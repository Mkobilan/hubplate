"use client";

import { ChefHat, Eye, EyeOff, Loader2, Check, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { getCookie, removeCookie } from "@/lib/cookies";

export default function SignupPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [formData, setFormData] = useState({
        restaurantName: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteData, setInviteData] = useState<any>(null);
    const [signupMode, setSignupMode] = useState<'owner' | 'employee' | null>(null);

    useEffect(() => {
        const supabase = createClient();

        // Ensure we handle session check
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // If they are already logged in, they shouldn't be here
                // but let's not force logout on mount, maybe just warn?
                // Actually, for a clean signup experience, let's clear the session
                // if they explicitly clicked to signup as a new owner.
            }
        };
        checkSession();

        const token = getCookie("pending_invite_token");
        if (token) {
            const fetchInvite = async () => {
                const { data } = await (supabase as any)
                    .from("employee_invites")
                    .select("*, locations(name)")
                    .eq("token", token)
                    .maybeSingle();

                if (data) {
                    setInviteData(data);
                }
            };
            fetchInvite();
        }
    }, []);

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
        const supabase = createClient();

        // 0. Force logout BEFORE signup to ensure we are creating/joining with the right identity
        // This prevents "It signed me in on the other organization" crossover
        await supabase.auth.signOut();

        const firstName = inviteData ? formData.firstName : (formData.restaurantName.split(' ')[0] || "Owner");
        const lastName = inviteData ? formData.lastName : (formData.restaurantName.split(' ').slice(1).join(' ') || "User");

        try {
            const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        restaurant_name: inviteData ? "Joined via Invite" : formData.restaurantName,
                        role: inviteData ? inviteData.role : "owner",
                        invite_token: inviteData ? inviteData.token : null
                    },
                    emailRedirectTo: `${window.location.origin}/login?message=Email confirmed successfully! You can now sign in.`
                },
            });

            if (signUpError) throw signUpError;
            if (!user) throw new Error("Signup failed - no user returned");

            if (inviteData) {
                // EMPLOYEE JOINING FLOW

                // If email confirmation is required (confirmed_at is null), 
                // we should not proceed to dashboard yet.
                if (!user.confirmed_at) {
                    router.push("/login?message=Account created! Please check your email to confirm your account and join the team.");
                    return;
                }

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push("/login?message=Account created! Please check your email to confirm and join the organization.");
                    return;
                }

                // Attempt join immediately
                const { error: joinError } = await (supabase as any).rpc('join_organization_via_token', {
                    token_val: inviteData.token,
                    f_name: firstName,
                    l_name: lastName
                });

                if (joinError) {
                    console.error("Immediate join error:", joinError);
                } else {
                    // Clear invite tokens to prevent InviteHandler from duplicating the join
                    removeCookie("pending_invite_token");
                    await supabase.auth.updateUser({
                        data: { invite_token: null }
                    });
                }

                router.push("/dashboard");
            } else {
                // NEW OWNER FLOW

                // The database trigger 'on_auth_user_created' now handles creating 
                // the Organization, Location, and Employee record atomically during signup.

                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    // Redirect to login with a success message if no session (email confirmation required)
                    router.push("/login?message=Restaurant account created! Please check your email to confirm your account and start your trial.");
                    return;
                }

                // If we do have a session (email confirmation off), go straight to billing-setup
                router.push("/billing-setup");
            }
        } catch (err: any) {
            console.error("Signup error details:", err);
            setError(err.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-950 via-slate-950 to-orange-950/20">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="h-16 w-16 bg-orange-500/20 rounded-2xl overflow-hidden">
                        <img src="/logo.png" alt="HubPlate" className="h-full w-full object-cover" />
                    </div>
                    <span className="text-3xl font-bold gradient-text">HubPlate</span>
                </div>

                {/* Signup Card */}
                <div className="card p-8">
                    <h1 className="text-2xl font-bold text-center mb-2">
                        {t("auth.createAccount")}
                    </h1>
                    <p className="text-slate-400 text-center mb-8">
                        {inviteData ? (
                            `Join the team as a ${inviteData.role}`
                        ) : signupMode === 'owner' ? (
                            "Start your 14-day free trial"
                        ) : signupMode === 'employee' ? (
                            "Join your restaurant's team"
                        ) : (
                            "Select an option to get started"
                        )}
                    </p>

                    {!inviteData && !signupMode && (
                        <div className="space-y-4">
                            <button
                                onClick={() => setSignupMode('owner')}
                                className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-orange-500/50 transition-all text-left flex items-center gap-4 group"
                            >
                                <div className="p-3 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-colors">
                                    <ChefHat className="h-6 w-6 text-orange-500" />
                                </div>
                                <div>
                                    <div className="font-bold">I'm a Restaurant Owner</div>
                                    <div className="text-sm text-slate-400">Create a new organization and start trial</div>
                                </div>
                            </button>
                            <button
                                onClick={() => setSignupMode('employee')}
                                className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all text-left flex items-center gap-4 group"
                            >
                                <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                                    <UserPlus className="h-6 w-6 text-blue-500" />
                                </div>
                                <div>
                                    <div className="font-bold">I'm an Employee</div>
                                    <div className="text-sm text-slate-400">Join an existing restaurant team</div>
                                </div>
                            </button>
                        </div>
                    )}

                    {!inviteData && signupMode === 'employee' && (
                        <div className="text-center space-y-6 py-4">
                            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400 text-sm">
                                To join an existing restaurant, please ask your manager to send you an invite link.
                            </div>
                            <button
                                onClick={() => setSignupMode(null)}
                                className="text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                ← Back to role selection
                            </button>
                        </div>
                    )}

                    {(inviteData || signupMode === 'owner') && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {signupMode === 'owner' && (
                                <button
                                    type="button"
                                    onClick={() => setSignupMode(null)}
                                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-2"
                                >
                                    ← Back to role selection
                                </button>
                            )}
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {!inviteData ? (
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
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">First Name</label>
                                        <input
                                            name="firstName"
                                            type="text"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            className="input"
                                            placeholder="First Name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Last Name</label>
                                        <input
                                            name="lastName"
                                            type="text"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            className="input"
                                            placeholder="Last Name"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

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
                                className="btn btn-primary w-full py-3"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    inviteData ? "Complete Registration" : "Start Free Trial"
                                )}
                            </button>
                        </form>
                    )}

                    {/* Benefits */}
                    <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
                        <Feature text="14-day free trial" />
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
