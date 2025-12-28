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
        const fetchSession = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) return;

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

            // 2. Fetch employee record if not already in store
            if (!currentEmployee) {
                const { data: emp } = await supabase
                    .from("employees")
                    .select("*")
                    .eq("user_id", session.user.id)
                    .eq("is_active", true)
                    .limit(1)
                    .maybeSingle();

                if (emp) {
                    setCurrentEmployee(emp as any);

                    // If no location is selected, but employee has a location_id, set it
                    if (!currentLocation && (emp as any).location_id) {
                        const { data: loc } = await supabase
                            .from("locations")
                            .select("*")
                            .eq("id", (emp as any).location_id)
                            .maybeSingle();
                        if (loc) setCurrentLocation(loc);
                    }
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

        fetchSession();
    }, []); // Run on mount to initialize session state

    return null; // This component doesn't render anything
}
