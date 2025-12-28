"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifications } from "@/components/providers/NotificationContext";
import { Bell, Check, Clock, Calendar, User, Info, Utensils, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'schedule': return <Calendar className="h-4 w-4 text-blue-400" />;
            case 'shift_offer': return <Calendar className="h-4 w-4 text-green-400" />;
            case 'shift_request': return <User className="h-4 w-4 text-amber-400" />;
            case 'clock_in': return <Clock className="h-4 w-4 text-green-400" />;
            case 'clock_out': return <Clock className="h-4 w-4 text-slate-400" />;
            case 'order_ready': return <Utensils className="h-4 w-4 text-orange-400" />;
            default: return <Info className="h-4 w-4 text-slate-400" />;
        }
    };

    const handleNotificationClick = async (notification: any) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        if (notification.link) {
            router.push(notification.link);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-slate-800 transition-colors group"
            >
                <Bell className={cn("h-5 w-5 text-slate-400 group-hover:text-white transition-colors", unreadCount > 0 && "animate-pulse")} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
                        <span className="sr-only">{unreadCount} unread notifications</span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed left-4 right-4 top-20 w-auto slide-in-from-top-2 md:absolute md:left-full md:top-0 md:ml-2 md:w-80 md:slide-in-from-left-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-[100] animate-in overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm sticky top-0">
                        <h3 className="font-bold">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1"
                            >
                                <CheckCircle className="h-3 w-3" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {notifications.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No notifications</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={cn(
                                        "p-3 rounded-lg transition-colors cursor-pointer border",
                                        n.is_read
                                            ? "bg-transparent border-transparent hover:bg-slate-800/50 opacity-70"
                                            : "bg-slate-800/80 border-slate-700/50 hover:bg-slate-800"
                                    )}
                                >
                                    <div className="flex gap-3">
                                        <div className={cn("mt-1 p-1.5 rounded-lg bg-slate-950 border border-slate-800 h-fit")}>
                                            {getIcon(n.type)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className={cn("text-sm font-medium leading-none", !n.is_read && "text-white")}>
                                                    {n.title}
                                                </p>
                                                {!n.is_read && <div className="h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0 mt-1" />}
                                            </div>
                                            <p className="text-xs text-slate-400 line-clamp-2">{n.message}</p>
                                            <p className="text-[10px] text-slate-500">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
