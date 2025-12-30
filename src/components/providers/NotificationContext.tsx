"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";
import { LocalNotifications } from '@capacitor/local-notifications';
import { Badge } from '@capawesome/capacitor-badge';
import { Capacitor } from '@capacitor/core';

type Notification = {
    id: string;
    recipient_id: string;
    location_id: string;
    type: "schedule" | "clock_in" | "clock_out" | "shift_offer" | "shift_request" | "order_ready";
    title: string;
    message: string;
    link: string | null;
    is_read: boolean;
    created_at: string;
};

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Using currentEmployee as recipient_id
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const fetchNotifications = async () => {
        if (!currentEmployee?.id) return;

        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("recipient_id", currentEmployee.id)
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            const fetchedNotifications = (data as Notification[]) || [];
            setNotifications(fetchedNotifications);

            // Update badge count if native
            if (Capacitor.isNativePlatform()) {
                const unread = fetchedNotifications.filter(n => !n.is_read).length;
                Badge.set({ count: unread }).catch(console.error);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            // Optimistic update
            setNotifications((prev: Notification[]) => {
                const updated = prev.map(n => n.id === id ? { ...n, is_read: true } : n);
                // Update badge if native
                if (Capacitor.isNativePlatform()) {
                    const unread = updated.filter(u => !u.is_read).length;
                    Badge.set({ count: unread }).catch(console.error);
                }
                return updated;
            });

            const { error } = await (supabase
                .from("notifications") as any)
                .update({ is_read: true })
                .eq("id", id);

            if (error) throw error;
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        if (!currentEmployee?.id) return;

        try {
            // Optimistic update
            setNotifications((prev: Notification[]) => prev.map(n => ({ ...n, is_read: true })));

            // Reset badge if native
            if (Capacitor.isNativePlatform()) {
                Badge.set({ count: 0 }).catch(console.error);
            }

            const { error } = await (supabase
                .from("notifications") as any)
                .update({ is_read: true })
                .eq("recipient_id", currentEmployee.id)
                .eq("is_read", false);

            if (error) throw error;
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    useEffect(() => {
        if (currentEmployee?.id) {
            fetchNotifications();

            // Request permissions for local notifications if native
            if (Capacitor.isNativePlatform()) {
                LocalNotifications.requestPermissions().then(permission => {
                    if (permission.display !== 'granted') {
                        console.warn('Local notification permission not granted');
                    }
                });
            }

            // Realtime subscription
            const channel = supabase
                .channel(`notifications:${currentEmployee.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "notifications",
                        filter: `recipient_id=eq.${currentEmployee.id}`
                    },
                    (payload) => {
                        const newNotification = payload.new as Notification;
                        setNotifications((prev: Notification[]) => {
                            const updated = [newNotification, ...prev].slice(0, 20);

                            // Trigger local notification and badge update if native
                            if (Capacitor.isNativePlatform() && !newNotification.is_read) {
                                // Update badge
                                const unread = updated.filter(n => !n.is_read).length;
                                Badge.set({ count: unread }).catch(console.error);

                                // Schedule local notification
                                LocalNotifications.schedule({
                                    notifications: [
                                        {
                                            id: Math.floor(Math.random() * 1000000), // Random ID for local notification
                                            title: newNotification.title,
                                            body: newNotification.message,
                                            largeBody: newNotification.message,
                                            summaryText: 'New Alert',
                                            schedule: { at: new Date(Date.now() + 1000) }, // Trigger almost immediately
                                            sound: 'beep.wav', // Default sound
                                            extra: {
                                                notificationId: newNotification.id,
                                                link: newNotification.link
                                            }
                                        }
                                    ]
                                }).catch(console.error);
                            } else if (!newNotification.is_read) {
                                // Browser toast for web/PWA
                                toast(newNotification.title, { icon: '🔔' });
                            }

                            return updated;
                        });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [currentEmployee?.id]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            isLoading,
            markAsRead,
            markAllAsRead,
            refreshNotifications: fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
