"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";

export function SessionHandler() {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const setCurrentEmployee = useAppStore((state) => state.setCurrentEmployee);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const setCurrentLocation = useAppStore((state) => state.setCurrentLocation);
    const setIsOrgOwner = useAppStore((state) => state.setIsOrgOwner);

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
                const { data: activeEmp } = await supabase
                    .from("employees")
                    .select("*")
                    .eq("id", currentEmp.id)
                    .eq("is_active", true)
                    .maybeSingle();

                if (activeEmp) {
                    validatedEmployee = activeEmp;
                    // Update in store in case details changed
                    // Check for deep equality or just set it? Just set it to be safe and simple
                    // Optimization: Only set if different? For now, re-setting is fine.
                    // But strictly speaking we just want to know if they are active.
                } else {
                    // Employee found in store but not active in DB -> Revoke
                    console.warn("Current employee session revoked or inactive.");
                    setCurrentEmployee(null);
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
