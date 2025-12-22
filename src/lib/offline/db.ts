// IndexedDB offline storage using idb library
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { MenuItem, Order, OrderItem } from "@/types/database";

interface HubPlateDB extends DBSchema {
    menu_items: {
        key: string;
        value: MenuItem;
        indexes: { "by-location": string; "by-category": string };
    };
    orders: {
        key: string;
        value: Order;
        indexes: { "by-location": string; "by-status": string };
    };
    order_items: {
        key: string;
        value: OrderItem;
        indexes: { "by-order": string };
    };
    sync_queue: {
        key: string;
        value: {
            id: string;
            type: "create" | "update" | "delete";
            table: string;
            data: unknown;
            timestamp: number;
            attempts: number;
        };
    };
}

let dbInstance: IDBPDatabase<HubPlateDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<HubPlateDB>> {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB<HubPlateDB>("hubplate-db", 1, {
        upgrade(db) {
            // Menu items store
            const menuStore = db.createObjectStore("menu_items", { keyPath: "id" });
            menuStore.createIndex("by-location", "location_id");
            menuStore.createIndex("by-category", "category");

            // Orders store
            const ordersStore = db.createObjectStore("orders", { keyPath: "id" });
            ordersStore.createIndex("by-location", "location_id");
            ordersStore.createIndex("by-status", "status");

            // Order items store
            const orderItemsStore = db.createObjectStore("order_items", {
                keyPath: "id",
            });
            orderItemsStore.createIndex("by-order", "order_id");

            // Sync queue for offline changes
            db.createObjectStore("sync_queue", { keyPath: "id" });
        },
    });

    return dbInstance;
}

// Menu items operations
export async function cacheMenuItems(items: MenuItem[]) {
    const db = await getDB();
    const tx = db.transaction("menu_items", "readwrite");
    await Promise.all([...items.map((item) => tx.store.put(item)), tx.done]);
}

export async function getCachedMenuItems(locationId: string): Promise<MenuItem[]> {
    const db = await getDB();
    return db.getAllFromIndex("menu_items", "by-location", locationId);
}

// Orders operations
export async function cacheOrder(order: Order) {
    const db = await getDB();
    await db.put("orders", order);
}

export async function getCachedOrders(locationId: string): Promise<Order[]> {
    const db = await getDB();
    return db.getAllFromIndex("orders", "by-location", locationId);
}

// Sync queue operations
export async function addToSyncQueue(
    type: "create" | "update" | "delete",
    table: string,
    data: unknown
) {
    const db = await getDB();
    await db.put("sync_queue", {
        id: crypto.randomUUID(),
        type,
        table,
        data,
        timestamp: Date.now(),
        attempts: 0,
    });
}

export async function getSyncQueue() {
    const db = await getDB();
    return db.getAll("sync_queue");
}

export async function removeFromSyncQueue(id: string) {
    const db = await getDB();
    await db.delete("sync_queue", id);
}

export async function clearSyncQueue() {
    const db = await getDB();
    await db.clear("sync_queue");
}
