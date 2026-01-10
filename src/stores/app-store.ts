// Global app store using Zustand
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Employee, Location, MenuItem, Order } from "@/types/database";

interface AppState {
    // Current session
    currentLocation: Location | null;
    currentEmployee: Employee | null;
    isOrgOwner: boolean;
    isSessionChecked: boolean;
    isOnline: boolean;

    // Cached data
    menuItems: MenuItem[];
    activeOrders: Order[];

    // UI state
    language: string;
    sidebarOpen: boolean;

    // Clock-in state
    isClockedIn: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeEntry: any | null;
    isOnBreak: boolean;
    breakType: string | null;

    // Terminal state
    isTerminalMode: boolean;
    isTerminalLocked: boolean;

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
    setIsOrgOwner: (isOwner: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setClockStatus: (status: { isClockedIn: boolean; activeEntry: any | null; isOnBreak: boolean; breakType: string | null }) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    refreshClockStatus: (supabase: any, employeeId: string) => Promise<void>;
    reset: () => void;

    // Terminal actions
    setTerminalMode: (enabled: boolean) => void;
    setTerminalLocked: (locked: boolean) => void;
    setSessionChecked: (checked: boolean) => void;
}

const initialState = {
    currentLocation: null,
    currentEmployee: null,
    isOrgOwner: false,
    isSessionChecked: false,
    isOnline: true,
    menuItems: [],
    activeOrders: [],
    language: "en",
    sidebarOpen: true,
    isClockedIn: false,
    activeEntry: null,
    isOnBreak: false,
    breakType: null,
    isTerminalMode: false,
    isTerminalLocked: false,
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

            setIsOrgOwner: (isOwner) => set({ isOrgOwner: isOwner }),

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

            setClockStatus: (status) => set({ ...status }),

            refreshClockStatus: async (supabase, employeeId) => {
                if (!employeeId) return;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { data, error } = await supabase
                    .from("time_entries")
                    .select("*")
                    .eq("employee_id", employeeId)
                    .is("clock_out", null)
                    .order("clock_in", { ascending: false })
                    .limit(1);

                if (data && data.length > 0) {
                    set({
                        isClockedIn: true,
                        activeEntry: data[0],
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        isOnBreak: !!(data[0] as any).current_break_start,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        breakType: (data[0] as any).current_break_type,
                    });
                } else {
                    set({
                        isClockedIn: false,
                        activeEntry: null,
                        isOnBreak: false,
                        breakType: null,
                    });
                }
            },

            setTerminalMode: (enabled) => set({ isTerminalMode: enabled }),

            setTerminalLocked: (locked) => set({ isTerminalLocked: locked }),

            setSessionChecked: (checked: boolean) => set({ isSessionChecked: checked }),

            reset: () => set(initialState),
        }),
        {
            name: "hubplate-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                language: state.language,
                sidebarOpen: state.sidebarOpen,
                currentLocation: state.currentLocation,
                currentEmployee: state.currentEmployee,
                isOrgOwner: state.isOrgOwner,
                isTerminalMode: state.isTerminalMode,
            }),
        }
    )
);
