"use client";

import { useState, useEffect } from "react";
import {
    Users,
    Search,
    Shield,
    RefreshCcw,
    ArrowLeft,
    Loader2,
    AlertCircle,
    UserX,
    ShieldAlert,
    Clock,
    DollarSign,
    Mail,
    Phone,
    Plus,
    Trash2,
    Edit2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { format, startOfWeek, endOfWeek } from "date-fns";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";

// Employee type definition matching the main staff page
type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    email: string;
    phone?: string;
    hourly_rate: number;
    hire_date?: string;
    termination_date?: string;
    is_active: boolean;
    clocked_in?: boolean;
    server_color?: string;
    pin_code?: string;
    created_at?: string;
    employee_roles?: Array<{ role: string; rank: number; hourly_rate?: number }>;
};

const ROLES = ["server", "bartender", "cook", "host", "busser", "dishwasher", "driver", "expo", "agm", "gm", "manager", "owner"];

export default function DiscontinuedStaffPage() {
    const [staff, setStaff] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [restoring, setRestoring] = useState<string | null>(null);

    // Detail Modal State
    const [selectedStaff, setSelectedStaff] = useState<Employee | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "timeclock">("info");
    const [timeEntries, setTimeEntries] = useState<any[]>([]);
    const [timeLoading, setTimeLoading] = useState(false);
    const [timeFilter, setTimeFilter] = useState({
        start: format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd"),
        end: format(endOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd")
    });

    const currentLocation = useAppStore((state) => state.currentLocation);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const currentEmployeeFromStore = useAppStore((state) => state.currentEmployee);
    const isOwnerOrManager = isOrgOwner || currentEmployeeFromStore?.role === 'owner' || currentEmployeeFromStore?.role === 'manager' || currentEmployeeFromStore?.role === 'gm' || currentEmployeeFromStore?.role === 'agm';

    const fetchStaff = async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            const { data: employees, error: staffError } = await supabase
                .from("employees")
                .select("*, employee_roles(*)")
                .eq("location_id", currentLocation.id)
                .eq("is_active", false)
                .order("first_name");

            if (staffError) throw staffError;

            setStaff(employees || []);
        } catch (err) {
            console.error("Error fetching inactive staff:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTimeEntries = async (employeeId: string) => {
        if (!currentLocation) return;

        try {
            setTimeLoading(true);
            const supabase = createClient();

            const { data, error } = await supabase
                .from("time_entries")
                .select("*")
                .eq("employee_id", employeeId)
                .gte("clock_in", `${timeFilter.start}T00:00:00`)
                .lte("clock_in", `${timeFilter.end}T23:59:59`)
                .order("clock_in", { ascending: false });

            if (error) throw error;
            setTimeEntries(data || []);
        } catch (err) {
            console.error("Error fetching time entries:", err);
        } finally {
            setTimeLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, [currentLocation?.id]);

    useEffect(() => {
        if (selectedStaff && activeTab === "timeclock") {
            fetchTimeEntries(selectedStaff.id);
        }
    }, [selectedStaff?.id, activeTab, timeFilter]);

    const handleRestore = async (employeeId: string) => {
        try {
            setRestoring(employeeId);
            const supabase = createClient();

            const { error } = await (supabase as any)
                .from("employees")
                .update({
                    is_active: true
                })
                .eq("id", employeeId);

            if (error) throw error;

            fetchStaff();
        } catch (err) {
            console.error("Error restoring staff:", err);
            alert("Failed to restore employee.");
        } finally {
            setRestoring(null);
        }
    };

    const handleUpdateDate = async (employeeId: string, field: 'hire_date' | 'termination_date', date: string) => {
        try {
            const supabase = createClient();
            const { error } = await (supabase as any)
                .from("employees")
                .update({ [field]: date })
                .eq("id", employeeId);

            if (error) throw error;

            // Update local state
            setStaff(staff.map(emp => emp.id === employeeId ? { ...emp, [field]: date } : emp));
            if (selectedStaff?.id === employeeId) {
                setSelectedStaff({ ...selectedStaff, [field]: date });
            }
        } catch (err) {
            console.error(`Error updating ${field}:`, err);
            alert(`Failed to update ${field.replace('_', ' ')}.`);
        }
    };

    const handleUpdateContact = async (employeeId: string, field: 'email' | 'phone', value: string) => {
        try {
            const supabase = createClient();
            const { error } = await (supabase as any)
                .from("employees")
                .update({ [field]: value })
                .eq("id", employeeId);

            if (error) throw error;

            // Update local state
            setStaff(staff.map(emp => emp.id === employeeId ? { ...emp, [field]: value } : emp));
            if (selectedStaff?.id === employeeId) {
                setSelectedStaff({ ...selectedStaff, [field]: value });
            }
        } catch (err) {
            console.error(`Error updating ${field}:`, err);
            alert(`Failed to update ${field}.`);
        }
    };

    const filteredEmployees = staff.filter(emp =>
        (`${emp.first_name} ${emp.last_name}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.role || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view staff.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link
                            href="/dashboard/staff"
                            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-3xl font-bold">Discontinued Staff</h1>
                    </div>
                    <p className="text-slate-400">
                        {currentLocation.name} - View and restore inactive team members
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search inactive staff..."
                    className="input !pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Inactive Staff Table */}
            <div className="card overflow-hidden border-orange-500/10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/50">
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Employee</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Role</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Discontinued Date</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredEmployees.length > 0 ? (
                                filteredEmployees.map((emp) => (
                                    <tr
                                        key={emp.id}
                                        className="hover:bg-slate-900/40 transition-colors group cursor-pointer"
                                        onClick={() => {
                                            setSelectedStaff(emp);
                                            setIsDetailModalOpen(true);
                                            setActiveTab("info");
                                        }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold border border-slate-700 text-slate-500">
                                                    {emp.first_name[0]}{emp.last_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-400">{emp.first_name} {emp.last_name}</p>
                                                    <p className="text-xs text-slate-600">{emp.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 capitalize">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Shield className="h-3 w-3" />
                                                <span className="text-sm">{emp.role}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-500">
                                                {emp.termination_date ? format(new Date(emp.termination_date), "MMM d, yyyy") : "N/A"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {isOwnerOrManager && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRestore(emp.id);
                                                    }}
                                                    disabled={restoring === emp.id}
                                                    className="p-2 hover:bg-orange-500/10 rounded-lg text-slate-400 hover:text-orange-500 transition-colors flex items-center gap-2 text-sm"
                                                    title="Restore Employee"
                                                >
                                                    {restoring === emp.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <RefreshCcw className="h-4 w-4" />
                                                    )}
                                                    <span className="hidden sm:inline">Restore</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-500">
                                            <UserX className="h-8 w-8 opacity-20" />
                                            <p>No discontinued employees found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Staff Detail / Timeclock Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={selectedStaff ? `${selectedStaff.first_name} ${selectedStaff.last_name}` : "Employee Details"}
            >
                {selectedStaff && (
                    <div className="space-y-6">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-800">
                            <button
                                onClick={() => setActiveTab("info")}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium transition-colors border-b-2",
                                    activeTab === "info" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-slate-200"
                                )}
                            >
                                Information
                            </button>
                            <button
                                onClick={() => setActiveTab("timeclock")}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium transition-colors border-b-2",
                                    activeTab === "timeclock" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-slate-200"
                                )}
                            >
                                Timeclock
                            </button>
                        </div>

                        {activeTab === "info" ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-3">Roles & Priorities</p>
                                            <div className="space-y-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-orange-500 uppercase font-bold">Primary Role (Rank 1)</p>
                                                        <p className="font-bold capitalize">{selectedStaff.role}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm font-bold text-slate-300">{formatCurrency(selectedStaff.hourly_rate)}/hr</span>
                                                    </div>
                                                </div>

                                                {selectedStaff.employee_roles?.filter(r => r.rank > 1).map(role => (
                                                    <div key={role.rank} className="flex items-center justify-between gap-4 pt-3 border-t border-slate-800">
                                                        <div>
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Rank {role.rank} Role</p>
                                                            <p className="text-sm font-bold capitalize text-slate-400">{role.role}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-slate-400">
                                                            <span className="text-sm">{formatCurrency(role.hourly_rate || selectedStaff.hourly_rate)}/hr</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase font-bold">Status</p>
                                            <span className="badge badge-danger text-[10px]">
                                                Discontinued
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase font-bold text-red-400">Discontinued Date</p>
                                            {isOwnerOrManager ? (
                                                <input
                                                    type="date"
                                                    className="bg-transparent border-none text-sm p-0 focus:ring-0 cursor-pointer hover:text-red-400 transition-colors text-red-400 font-medium"
                                                    value={selectedStaff.termination_date || ""}
                                                    onChange={(e) => handleUpdateDate(selectedStaff.id, 'termination_date', e.target.value)}
                                                />
                                            ) : (
                                                <p className="text-red-400 font-medium">
                                                    {selectedStaff.termination_date ? format(new Date(selectedStaff.termination_date), "MMMM d, yyyy") : "N/A"}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase font-bold">Joined Date</p>
                                            {isOwnerOrManager ? (
                                                <input
                                                    type="date"
                                                    className="bg-transparent border-none text-sm p-0 focus:ring-0 cursor-pointer hover:text-orange-400 transition-colors text-slate-300"
                                                    value={selectedStaff.hire_date || (selectedStaff.created_at ? format(new Date(selectedStaff.created_at), "yyyy-MM-dd") : "")}
                                                    onChange={(e) => handleUpdateDate(selectedStaff.id, 'hire_date', e.target.value)}
                                                />
                                            ) : (
                                                <p className="text-slate-300">
                                                    {selectedStaff.hire_date ? format(new Date(selectedStaff.hire_date), "MMM d, yyyy") : (selectedStaff.created_at ? format(new Date(selectedStaff.created_at), "MMM d, yyyy") : "N/A")}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="pt-4 md:pt-0">
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Contact Info</p>
                                            <div className="space-y-3">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                                        <Mail className="h-4 w-4 text-slate-500" />
                                                        {isOwnerOrManager ? (
                                                            <input
                                                                type="email"
                                                                className="bg-transparent border-none text-sm p-0 focus:ring-0 cursor-text hover:text-orange-400 transition-colors w-full"
                                                                value={selectedStaff.email || ""}
                                                                onChange={(e) => handleUpdateContact(selectedStaff.id, 'email', e.target.value)}
                                                            />
                                                        ) : (
                                                            <span>{selectedStaff.email}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                                        <Phone className="h-4 w-4 text-slate-500" />
                                                        {isOwnerOrManager ? (
                                                            <input
                                                                type="text"
                                                                className="bg-transparent border-none text-sm p-0 focus:ring-0 cursor-text hover:text-orange-400 transition-colors w-full"
                                                                placeholder="Add phone number..."
                                                                value={selectedStaff.phone || ""}
                                                                onChange={(e) => handleUpdateContact(selectedStaff.id, 'phone', e.target.value)}
                                                            />
                                                        ) : (
                                                            <span>{selectedStaff.phone || "N/A"}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="input py-1.5 text-xs h-auto"
                                        value={timeFilter.start}
                                        onChange={(e) => setTimeFilter({ ...timeFilter, start: e.target.value })}
                                    />
                                    <span className="text-slate-500 self-center text-xs">to</span>
                                    <input
                                        type="date"
                                        className="input py-1.5 text-xs h-auto"
                                        value={timeFilter.end}
                                        onChange={(e) => setTimeFilter({ ...timeFilter, end: e.target.value })}
                                    />
                                </div>

                                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden text-xs">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-800/50 text-slate-400">
                                            <tr>
                                                <th className="px-3 py-2">Date</th>
                                                <th className="px-3 py-2">In/Out</th>
                                                <th className="px-3 py-2 text-center">Hrs</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {timeLoading ? (
                                                <tr>
                                                    <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                                                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                                    </td>
                                                </tr>
                                            ) : timeEntries.length > 0 ? (
                                                timeEntries.map((entry) => (
                                                    <tr key={entry.id} className="text-slate-300">
                                                        <td className="px-3 py-2">
                                                            {format(new Date(entry.clock_in), "MMM d, yyyy")}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="flex flex-col">
                                                                <span>{format(new Date(entry.clock_in), "h:mm a")}</span>
                                                                <span className="text-slate-500">
                                                                    {entry.clock_out ? format(new Date(entry.clock_out), "h:mm a") : "---"}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-center font-bold">
                                                            {entry.total_hours?.toFixed(1) || "0.0"}h
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="px-3 py-8 text-center text-slate-500 italic">
                                                        No history for selected dates
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="btn btn-secondary flex-1"
                            >
                                Close
                            </button>
                            {isOwnerOrManager && (
                                <button
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleRestore(selectedStaff.id);
                                    }}
                                    disabled={restoring === selectedStaff.id}
                                    className="btn btn-primary flex-1 gap-2"
                                >
                                    {restoring === selectedStaff.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                    Restore Employee
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
