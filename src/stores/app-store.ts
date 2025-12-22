// Global app store using Zustand
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Employee, Location, MenuItem, Order } from "@/types/database";

interface AppState {
    // Current session
    currentLocation: Location | null;
    currentEmployee: Employee | null;
    isOnline: boolean;

    // Cached data
    menuItems: MenuItem[];
    activeOrders: Order[];

    // UI state
    language: string;
    sidebarOpen: boolean;

    // Actions
    setCurrentLocation: (location: Location | null) => void;
    setCurrentEmployee: (employee: Employee | null) => void;
    setOnlineStatus: (online: boolean) => void;
    setMenuItems: (items: MenuItem[]) => void;
    setActiveOrders: (orders: Order[]) => void;
    addOrder: (order: Order) => void;
    updateOrder: (orderId: string, updates: Partial<Order>) => void;
    setLanguage: (lang: string) => void;
    toggleSidebar: () => void;
    reset: () => void;
}

const initialState = {
    currentLocation: null,
    currentEmployee: null,
    isOnline: true,
    menuItems: [],
    activeOrders: [],
    language: "en",
    sidebarOpen: true,
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            ...initialState,

            setCurrentLocation: (location) => set({ currentLocation: location }),

            setCurrentEmployee: (employee) => set({ currentEmployee: employee }),

            setOnlineStatus: (online) => set({ isOnline: online }),

            setMenuItems: (items) => set({ menuItems: items }),

            setActiveOrders: (orders) => set({ activeOrders: orders }),

            addOrder: (order) =>
                set((state) => ({ activeOrders: [...state.activeOrders, order] })),

            updateOrder: (orderId, updates) =>
                set((state) => ({
                    activeOrders: state.activeOrders.map((o) =>
                        o.id === orderId ? { ...o, ...updates } : o
                    ),
                })),

            setLanguage: (lang) => set({ language: lang }),

            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

            reset: () => set(initialState),
        }),
        {
            name: "hubplate-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                language: state.language,
                sidebarOpen: state.sidebarOpen,
            }),
        }
    )
);
