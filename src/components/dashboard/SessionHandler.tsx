"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export function SessionHandler() {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const setCurrentEmployee = useAppStore((state) => state.setCurrentEmployee);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const setCurrentLocation = useAppStore((state) => state.setCurrentLocation);
    const setIsOrgOwner = useAppStore((state) => state.setIsOrgOwner);
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();

        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                // No session, ensure store is clear just in case
                // But don't clear if we are in terminal mode and maybe offline? 
                // Actually safer to clear strict auth state if no session.
                return;
            }

            // 1. Check if user is an organization owner
            const { data: orgData } = await supabase
                .from("organizations")
                .select("*")
                .eq("owner_id", session.user.id)
                .limit(1);

            const org = orgData?.[0] as any;
            // Only set org owner if NOT in terminal mode (in terminal mode, permissions are determined by PIN login)
            if (org && !useAppStore.getState().isTerminalMode) {
                setIsOrgOwner(true);

                // 1.5 Strict Onboarding & Subscription Check
                const status = org.subscription_status;
                const onboarding = org.onboarding_status;

                // If they are an owner but haven't set up billing, force them to do so
                // Except if they are already on the billing page or logging out
                const isBillingPage = window.location.pathname === '/billing-setup';

                if (status === 'inactive' && onboarding === 'none' && !isBillingPage) {
                    // Check if we just came from a successful payment
                    const justPaid = (typeof window !== 'undefined' && window.sessionStorage.getItem('just_paid') === 'true') ||
                        window.location.search.includes('signup_success=true') ||
                        window.location.search.includes('success=true');

                    if (justPaid) {
                        console.log("Just paid. Attempting to sync status...");
                        try {
                            // Call sync endpoint
                            await fetch('/api/stripe/sync-status', { method: 'POST' });
                            // After sync, re-fetch session or just let the next effect cycle handle it?
                            // Better to reload to force a fresh fetch
                            window.location.href = '/dashboard';
                            return;
                        } catch (err) {
                            console.error("Sync failed", err);
                        }
                    } else if (org.stripe_customer_id) {
                        // Fallback attempt: If they have a customer ID but are inactive, maybe webhook failed?
                        console.log("Inactive but has customer ID. Attempting auto-sync...");
                        try {
                            const res = await fetch('/api/stripe/sync-status', { method: 'POST' });
                            const data = await res.json();
                            if (data.synced && (data.status === 'active' || data.status === 'trialing')) {
                                window.location.reload();
                                return;
                            }
                        } catch (err) {
                            console.error("Auto-sync failed", err);
                        }
                    }

                    // If still here, redirect to billing
                    router.push('/billing-setup');
                    return;
                }

                if (status === 'active' || status === 'trialing') {
                    if (typeof window !== 'undefined') {
                        window.sessionStorage.removeItem('just_paid');
                    }
                }

                // If no location set, pick first location for this org
                if (!currentLocation) {
                    const { data: locData } = await supabase
                        .from("locations")
                        .select("*")
                        .eq("organization_id", org.id)
                        .limit(1);
                    if (locData?.[0]) setCurrentLocation(locData[0]);
                }
            }

            // 2. Fetch/Validate employee record
            // If we have a current employee, we must verify they are still active
            // If we don't, we fetch them based on the auth session

            let validatedEmployee = null;
            const currentEmp = useAppStore.getState().currentEmployee;

            if (currentEmp) {
                // Special handling for Virtual Owner Session in Terminal Mode
                // Virtual owners use their user_id (org owner_id) as their employee_id, and have role="owner"
                // They might not have a physical record in 'employees' table.
                const isVirtualOwner = useAppStore.getState().isTerminalMode &&
                    currentEmp.role === 'owner' &&
                    (currentEmp as any).is_virtual === true; // We can add a flag, or just infer from context. 
                // Actually, we can just skip validation if role is owner and we are in terminal mode,
                // trusting the PIN pad logic.

                // Better safety:
                const isTerminalOwner = useAppStore.getState().isTerminalMode && currentEmp.role === 'owner';

                if (isTerminalOwner) {
                    // Skip DB validation for terminal owners (pinned in), assume session is valid until logout
                    validatedEmployee = currentEmp;
                } else {
                    const { data: activeEmp } = await supabase
                        .from("employees")
                        .select("*")
                        .eq("id", currentEmp.id)
                        .eq("is_active", true)
                        .maybeSingle();

                    if (activeEmp) {
                        validatedEmployee = activeEmp;
                    } else {
                        console.warn("Current employee session revoked or inactive.");
                        setCurrentEmployee(null);
                    }
                }
            }

            // If not found valid in store or revoked, try fetching from session user_id
            if (!validatedEmployee && session.user) {
                const { data: emp } = await supabase
                    .from("employees")
                    .select("*")
                    .eq("user_id", session.user.id)
                    .eq("is_active", true)
                    .limit(1)
                    .maybeSingle();

                if (emp) validatedEmployee = emp;
            }

            if (validatedEmployee) {
                setCurrentEmployee(validatedEmployee as any);

                // If no location is selected, but employee has a location_id, set it
                if (!currentLocation && (validatedEmployee as any).location_id) {
                    const { data: loc } = await supabase
                        .from("locations")
                        .select("*")
                        .eq("id", (validatedEmployee as any).location_id)
                        .maybeSingle();
                    if (loc) setCurrentLocation(loc);
                }
            }

            // 3. Ensure currentLocation is up to date with organization_id (Fix stale localStorage data)
            if (currentLocation && !(currentLocation as any).organization_id) {
                const { data: loc } = await supabase
                    .from("locations")
                    .select("*")
                    .eq("id", currentLocation.id)
                    .maybeSingle();
                if (loc) setCurrentLocation(loc);
            }
        };

        // Initial fetch
        fetchSession();

        // Listen for auth changes (token refresh, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                fetchSession();
            } else if (event === 'SIGNED_OUT') {
                setCurrentEmployee(null);
                setIsOrgOwner(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return null; // This component doesn't render anything
}
