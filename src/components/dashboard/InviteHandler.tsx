"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCookie, removeCookie } from "@/lib/cookies";
import { Loader2 } from "lucide-react";

export function InviteHandler() {
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const handlePendingInvite = async () => {
            const cookieToken = getCookie("pending_invite_token");

            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) return;

            // Use cookie token or fallback to user metadata (set during signup)
            const token = cookieToken || session.user.user_metadata?.invite_token;
            if (!token) return;

            setProcessing(true);
            try {
                // Get user metadata for names
                const firstName = session.user.user_metadata?.first_name || "New";
                const lastName = session.user.user_metadata?.last_name || "Staff";

                // Call the join function
                const { error } = await (supabase as any).rpc('join_organization_via_token', {
                    token_val: token,
                    f_name: firstName,
                    l_name: lastName
                });

                if (error) {
                    // Ignore 409 conflicts (already joined) or already accepted status
                    if ((error as any).code === '409' || (error as any).message?.includes('already used')) {
                        console.log("Invitation already processed, proceeding...");
                    } else if ((error as any).code === '42883' || (error as any).status === 404) {
                        // Function missing - clear cookie to stop error spam
                        console.error("Join function missing from database:", error);
                        removeCookie("pending_invite_token");
                        return;
                    } else {
                        console.error("Error joining organization in background:", error);
                        return;
                    }
                } else {
                    console.log("Successfully joined organization in background!");

                    // Clear the invite_token from user_metadata to avoid re-runs
                    await supabase.auth.updateUser({
                        data: { invite_token: null }
                    });

                    // Refresh after a small delay to ensure state updates
                    setTimeout(() => window.location.reload(), 500);
                }
            } catch (err) {
                console.error("Unexpected error joining organization:", err);
            } finally {
                // Always clear the cookie so we don't loop
                removeCookie("pending_invite_token");
                setProcessing(false);
            }
        };

        handlePendingInvite();
    }, []);

    if (!processing) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6 text-center">
            <div className="card max-w-sm w-full space-y-4">
                <Loader2 className="h-10 w-10 text-orange-500 animate-spin mx-auto" />
                <h2 className="text-xl font-bold">Joining Organization</h2>
                <p className="text-slate-400 text-sm">
                    We're linking your account to your new team. This will only take a moment...
                </p>
            </div>
        </div>
    );
}
