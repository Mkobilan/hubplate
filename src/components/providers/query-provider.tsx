"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAppStore } from "@/stores";
import { getSyncManager } from "@/lib/offline";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60, // 1 hour
        },
    },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const setOnlineStatus = useAppStore((state) => state.setOnlineStatus);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const syncManager = getSyncManager();

        // Set initial status
        setOnlineStatus(syncManager.getStatus());

        // Listen for status changes
        const unsubscribe = syncManager.onStatusChange((online) => {
            setOnlineStatus(online);
        });

        return () => unsubscribe();
    }, [setOnlineStatus]);

    if (!mounted) {
        return null;
    }

    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}
