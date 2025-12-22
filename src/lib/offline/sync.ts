// Sync manager for offline/online synchronization
import { createClient } from "@/lib/supabase/client";
import {
    getSyncQueue,
    removeFromSyncQueue,
    addToSyncQueue,
} from "./db";

export class SyncManager {
    private isOnline: boolean = true;
    private isSyncing: boolean = false;
    private listeners: Set<(online: boolean) => void> = new Set();

    constructor() {
        if (typeof window !== "undefined") {
            this.isOnline = navigator.onLine;
            window.addEventListener("online", () => this.handleOnline());
            window.addEventListener("offline", () => this.handleOffline());
        }
    }

    private handleOnline() {
        this.isOnline = true;
        this.notifyListeners();
        this.sync();
    }

    private handleOffline() {
        this.isOnline = false;
        this.notifyListeners();
    }

    private notifyListeners() {
        this.listeners.forEach((listener) => listener(this.isOnline));
    }

    onStatusChange(listener: (online: boolean) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getStatus() {
        return this.isOnline;
    }

    async sync() {
        if (!this.isOnline || this.isSyncing) return;

        this.isSyncing = true;
        const supabase = createClient();

        try {
            const queue = await getSyncQueue();

            for (const item of queue) {
                try {
                    switch (item.type) {
                        case "create":
                            await supabase.from(item.table).insert(item.data as Record<string, unknown>);
                            break;
                        case "update":
                            const updateData = item.data as { id: string;[key: string]: unknown };
                            await supabase
                                .from(item.table)
                                .update(updateData)
                                .eq("id", updateData.id);
                            break;
                        case "delete":
                            const deleteData = item.data as { id: string };
                            await supabase.from(item.table).delete().eq("id", deleteData.id);
                            break;
                    }
                    await removeFromSyncQueue(item.id);
                } catch (error) {
                    console.error(`Sync failed for item ${item.id}:`, error);
                    // TODO: Implement retry logic with exponential backoff
                }
            }
        } finally {
            this.isSyncing = false;
        }
    }

    // Queue an operation for sync
    async queueOperation(
        type: "create" | "update" | "delete",
        table: string,
        data: unknown
    ) {
        await addToSyncQueue(type, table, data);

        // Try to sync immediately if online
        if (this.isOnline) {
            this.sync();
        }
    }
}

// Singleton instance
let syncManager: SyncManager | null = null;

export function getSyncManager(): SyncManager {
    if (!syncManager) {
        syncManager = new SyncManager();
    }
    return syncManager;
}
