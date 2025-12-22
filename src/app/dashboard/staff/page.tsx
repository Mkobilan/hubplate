"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Plus,
    Search,
    Mail,
    Phone,
    Shield,
    Clock,
    MoreVertical,
    Edit2,
    Trash2,
    UserPlus,
    ArrowUpRight,
    TrendingUp,
    DollarSign,
    Info,
    CalendarCheck,
    X,
    Check,
    Users
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Employee type definition for Supabase integration
type Employee = {
    id: string;
    name: string;
    role: string;
    email: string;
    phone?: string;
    hourly_rate: number;
    status: string;
    sales_today: number;
    tips_today: number;
    clocked_in: boolean;
    clock_in_time?: string;
};

// TODO: Replace with Supabase query
const employees: Employee[] = [];

export default function StaffPage() {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [showAvailability, setShowAvailability] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Staff Management</h1>
                    <p className="text-slate-400 mt-1">
                        Manage your team, track performance, and monitor clock-ins
                    </p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary">
                    <UserPlus className="h-4 w-4" />
                    Add Employee
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickStat
                    label="Total Staff"
                    value={employees.length.toString()}
                    icon={<Users className="h-4 w-4" />}
                />
                <QuickStat
                    label="Clocked In"
                    value={employees.filter(e => e.clocked_in).length.toString()}
                    icon={<Clock className="h-4 w-4" />}
                    variant="success"
                />
                <QuickStat
                    label="Daily Labor Cost"
                    value={formatCurrency(450)}
                    icon={<DollarSign className="h-4 w-4" />}
                />
                <QuickStat
                    label="Avg Sales/Server"
                    value={formatCurrency(1068)}
                    icon={<TrendingUp className="h-4 w-4" />}
                />
            </div>

            {/* Search & Filters */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search by name, role, or email..."
                    className="input pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Staff Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/50">
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Employee</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Role</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Today&apos;s Performance</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Rate</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-900/40 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold border border-slate-700">
                                                {emp.name.split(" ").map(n => n[0]).join("")}
                                            </div>
                                            <div>
                                                <p className="font-medium">{emp.name}</p>
                                                <p className="text-xs text-slate-500">{emp.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 capitalize">
                                        <div className="flex items-center gap-2">
                                            <Shield className={cn(
                                                "h-3 w-3",
                                                emp.role === "manager" ? "text-orange-500" : "text-slate-400"
                                            )} />
                                            <span className="text-sm">{emp.role}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={cn(
                                                "badge text-[10px]",
                                                emp.clocked_in ? "badge-success" : "badge-danger"
                                            )}>
                                                {emp.clocked_in ? "Clocked In" : "Clocked Out"}
                                            </span>
                                            {emp.clock_in_time && (
                                                <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                                    <Clock className="w-2 h-2" /> {emp.clock_in_time}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {emp.sales_today > 0 ? (
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-green-400">{formatCurrency(emp.sales_today)} sales</p>
                                                <p className="text-[10px] text-slate-500">{formatCurrency(emp.tips_today)} in tips</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-600">No activity today</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-300">
                                        {formatCurrency(emp.hourly_rate)}/hr
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowAvailability(emp.id)}
                                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-orange-400"
                                                title="Manage Availability"
                                            >
                                                <CalendarCheck className="h-4 w-4" />
                                            </button>
                                            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Availability Modal */}
            {showAvailability && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowAvailability(null)} />
                    <div className="relative card w-full max-w-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Manage Availability</h2>
                            <button
                                onClick={() => setShowAvailability(null)}
                                className="p-2 hover:bg-slate-800 rounded-lg"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <p className="text-sm text-slate-400">
                                Set preferred working days and core hours for **{employees.find(e => e.id === showAvailability)?.name || "Staff Member"}**.
                            </p>

                            <div className="space-y-4">
                                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                                    <div key={day} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded border border-slate-700 bg-orange-500 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                            <span className="text-sm font-medium">{day}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="time" defaultValue="09:00" className="bg-slate-800 border-none rounded px-2 py-1 text-xs" />
                                            <span className="text-slate-600">-</span>
                                            <input type="time" defaultValue="17:00" className="bg-slate-800 border-none rounded px-2 py-1 text-xs" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAvailability(null)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="button" className="btn-primary flex-1">
                                    Save Availability
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Employee Modal (Placeholder) */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
                    <div className="relative card w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-6">Add New Staff Member</h2>
                        <form className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Full Name</label>
                                    <input type="text" className="input" placeholder="e.g. Maria Garcia" />
                                </div>
                                <div>
                                    <label className="label">Role</label>
                                    <select className="input">
                                        <option value="server">Server</option>
                                        <option value="cook">Cook</option>
                                        <option value="manager">Manager</option>
                                        <option value="host">Host</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="label">Email Address</label>
                                <input type="email" className="input" placeholder="maria@restaurant.com" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Hourly Rate ($)</label>
                                    <input type="number" className="input" placeholder="15.00" />
                                </div>
                                <div>
                                    <label className="label">Employee PIN</label>
                                    <input type="password" maxLength={4} className="input" placeholder="4 digits" />
                                </div>
                            </div>

                            <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl flex gap-3">
                                <Info className="h-5 w-5 text-orange-400 shrink-0" />
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Employees will use their **PIN** to log in to the POS and clock in/out. They will receive an invitation email to set their password for the dashboard.
                                </p>
                            </div>

                            <div className="flex gap-2 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    Save Employee
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function QuickStat({ label, value, icon, variant = "default" }: { label: string, value: string, icon: React.ReactNode, variant?: "default" | "success" }) {
    return (
        <div className="card flex items-center gap-4">
            <div className={cn(
                "p-3 rounded-xl",
                variant === "success" ? "bg-green-500/10 text-green-400" : "bg-orange-500/10 text-orange-400"
            )}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-500 font-medium">{label}</p>
                <p className="text-lg font-bold">{value}</p>
            </div>
        </div>
    );
}

