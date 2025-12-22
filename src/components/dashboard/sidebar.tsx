"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
    ChefHat,
    ClipboardList,
    LayoutDashboard,
    UtensilsCrossed,
    Calendar,
    Package,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    Users,
    CreditCard,
    Heart,
} from "lucide-react";
import { useAppStore } from "@/stores";
import { ClockInOut } from "./clock-in";

interface NavItem {
    href: string;
    icon: React.ReactNode;
    label: string;
}

export function DashboardSidebar() {
    const { t } = useTranslation();
    const pathname = usePathname();
    const sidebarOpen = useAppStore((state) => state.sidebarOpen);
    const toggleSidebar = useAppStore((state) => state.toggleSidebar);
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems: NavItem[] = [
        {
            href: "/dashboard",
            icon: <LayoutDashboard className="h-5 w-5" />,
            label: t("nav.dashboard"),
        },
        {
            href: "/dashboard/staff",
            icon: <Users className="h-5 w-5" />,
            label: t("nav.staff"),
        },
        {
            href: "/dashboard/orders",
            icon: <ClipboardList className="h-5 w-5" />,
            label: t("nav.orders"),
        },
        {
            href: "/dashboard/menu",
            icon: <UtensilsCrossed className="h-5 w-5" />,
            label: t("nav.menu"),
        },
        {
            href: "/dashboard/kitchen",
            icon: <ChefHat className="h-5 w-5" />,
            label: t("nav.kitchen"),
        },
        {
            href: "/dashboard/schedule",
            icon: <Calendar className="h-5 w-5" />,
            label: t("nav.schedule"),
        },
        {
            href: "/dashboard/inventory",
            icon: <Package className="h-5 w-5" />,
            label: t("nav.inventory"),
        },
        {
            href: "/dashboard/reports",
            icon: <BarChart3 className="h-5 w-5" />,
            label: t("nav.reports"),
        },
        {
            href: "/dashboard/settings/payments",
            icon: <CreditCard className="h-5 w-5" />,
            label: t("nav.payments"),
        },
        {
            href: "/dashboard/customers",
            icon: <Heart className="h-5 w-5" />,
            label: t("nav.customers"),
        },
        {
            href: "/dashboard/settings",
            icon: <Settings className="h-5 w-5" />,
            label: t("nav.settings"),
        },
    ];

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-800">
                <ChefHat className="h-8 w-8 text-orange-500" />
                {sidebarOpen && (
                    <span className="text-xl font-bold gradient-text">HubPlate</span>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                                isActive
                                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                            )}
                        >
                            {item.icon}
                            {sidebarOpen && (
                                <span className="font-medium">{item.label}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse Button (Desktop) */}
            <div className="hidden md:flex p-4 border-t border-slate-800">
                <button
                    onClick={toggleSidebar}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors"
                >
                    <ChevronLeft
                        className={cn(
                            "h-5 w-5 transition-transform",
                            !sidebarOpen && "rotate-180"
                        )}
                    />
                    {sidebarOpen && <span className="text-sm">Collapse</span>}
                </button>
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-slate-800 space-y-4">
                <ClockInOut />
                <Link
                    href="/logout"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                    <LogOut className="h-5 w-5" />
                    {sidebarOpen && <span className="font-medium">{t("auth.logout")}</span>}
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-50 md:hidden p-2 bg-slate-900 rounded-lg border border-slate-800"
            >
                <Menu className="h-6 w-6 text-slate-300" />
            </button>

            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 flex flex-col transform transition-transform md:hidden",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-100"
                >
                    <X className="h-5 w-5" />
                </button>
                <SidebarContent />
            </aside>

            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden md:flex flex-col fixed inset-y-0 left-0 z-30 bg-slate-950 border-r border-slate-800 transition-all duration-300",
                    sidebarOpen ? "w-64" : "w-16"
                )}
            >
                <SidebarContent />
            </aside>
        </>
    );
}
