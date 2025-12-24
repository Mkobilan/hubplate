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
    Users,
    Copy,
    ExternalLink,
    Loader2,
    AlertCircle
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Employee type definition for Supabase integration
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
    sales_today?: number;
    tips_today?: number;
    clocked_in?: boolean;
    clock_in_time?: string;
    created_at?: string;
};

import { format, startOfWeek, endOfWeek } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

export default function StaffPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDiscontinueModal, setShowDiscontinueModal] = useState<any | null>(null);
    const [discontinuing, setDiscontinuing] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        role: "server",
        hourly_rate: "15.00",
        email: ""
    });

    // Staff Detail & Timeclock State
    const [selectedStaff, setSelectedStaff] = useState<Employee | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "timeclock">("info");
    const [timeEntries, setTimeEntries] = useState<any[]>([]);
    const [timeLoading, setTimeLoading] = useState(false);
    const [timeFilter, setTimeFilter] = useState({
        start: format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd"),
        end: format(endOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd")
    });

    // Timeclock Edit State
    const [editingEntry, setEditingEntry] = useState<any | null>(null);
    const [isEditEntryModalOpen, setIsEditEntryModalOpen] = useState(false);
    const [isAddingEntry, setIsAddingEntry] = useState(false);
    const [entryForm, setEntryForm] = useState({
        clock_in: "",
        clock_out: "",
        break_minutes: 0,
        notes: ""
    });

    const fetchStaff = async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            const { data: employees, error: staffError } = await supabase
                .from("employees")
                .select("*")
                .eq("location_id", currentLocation.id)
                .order("first_name");
            if (staffError) throw staffError;

            // 2. Fetch Active Time Entries
            const { data: activeEntries, error: timeError } = await supabase
                .from("time_entries")
                .select("employee_id")
                .eq("location_id", currentLocation.id)
                .is("clock_out", null);
            if (timeError) throw timeError;

            const clockedInIds = new Set((activeEntries as any[] || []).map(entry => entry.employee_id));

            setStaff((employees as any[] || []).map(emp => ({
                ...emp,
                clocked_in: clockedInIds.has(emp.id)
            })));
        } catch (err) {
            console.error("Error fetching staff:", err);
        } finally {
            setLoading(false);
        }
    };

    const generateInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation) return;

        try {
            setInviteLoading(true);
            const supabase = createClient();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await (supabase as any)
                .from("employee_invites")
                .insert([{
                    location_id: currentLocation.id,
                    organization_id: (currentLocation as any).organization_id,
                    role: inviteForm.role as any,
                    hourly_rate: parseFloat(inviteForm.hourly_rate),
                    email: inviteForm.email || null,
                    created_by: user.id,
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) throw error;

            const origin = window.location.origin;
            const link = `${origin}/invite/${(data as any).token}`;
            setInviteLink(link);
        } catch (err) {
            console.error("Error generating invite:", err);
            alert("Failed to generate invite link. Please try again.");
        } finally {
            setInviteLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Invite link copied to clipboard!");
    };

    useEffect(() => {
        fetchStaff();

        if (!currentLocation) return;
        const supabase = createClient();
        const subStaff = supabase.channel('staff_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => fetchStaff())
            .subscribe();

        const subTime = supabase.channel('time_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => fetchStaff())
            .subscribe();

        return () => {
            supabase.removeChannel(subStaff);
            supabase.removeChannel(subTime);
        };
    }, [currentLocation?.id]);

    const handleDiscontinue = async () => {
        if (!showDiscontinueModal) return;

        try {
            setDiscontinuing(true);
            const supabase = createClient();
            const today = format(new Date(), "yyyy-MM-dd");

            const { error } = await (supabase as any)
                .from("employees")
                .update({
                    is_active: false,
                    termination_date: today
                })
                .eq("id", showDiscontinueModal.id);

            if (error) throw error;

            setShowDiscontinueModal(null);
            fetchStaff();
        } catch (err) {
            console.error("Error discontinuing staff:", err);
            alert("Failed to discontinue employee.");
        } finally {
            setDiscontinuing(false);
        }
    };

    const fetchTimeEntries = async (employeeId: string) => {
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
        if (isDetailModalOpen && selectedStaff) {
            fetchTimeEntries(selectedStaff.id);
        }
    }, [isDetailModalOpen, selectedStaff?.id, timeFilter]);

    const handleSaveEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStaff || !currentLocation) return;

        try {
            const supabase = createClient();
            const clockIn = new Date(entryForm.clock_in);
            const clockOut = entryForm.clock_out ? new Date(entryForm.clock_out) : null;

            let totalHours = 0;
            if (clockIn && clockOut) {
                const totalMs = clockOut.getTime() - clockIn.getTime();
                totalHours = (totalMs / 3600000) - (entryForm.break_minutes / 60);
            }

            const payload = {
                employee_id: selectedStaff.id,
                location_id: currentLocation.id,
                organization_id: (selectedStaff as any).organization_id || (currentLocation as any).organization_id,
                clock_in: clockIn.toISOString(),
                clock_out: clockOut ? clockOut.toISOString() : null,
                break_minutes: entryForm.break_minutes,
                total_hours: Number(totalHours.toFixed(2)),
                hourly_rate: selectedStaff.hourly_rate || 0,
                total_pay: Number((totalHours * (selectedStaff.hourly_rate || 0)).toFixed(2)),
                notes: entryForm.notes
            };

            let error;
            if (editingEntry) {
                const { error: err } = await (supabase as any)
                    .from("time_entries")
                    .update(payload)
                    .eq("id", editingEntry.id);
                error = err;
            } else {
                const { error: err } = await (supabase as any)
                    .from("time_entries")
                    .insert([payload]);
                error = err;
            }

            if (error) throw error;

            setIsEditEntryModalOpen(false);
            setEditingEntry(null);
            fetchTimeEntries(selectedStaff.id);
        } catch (err) {
            console.error("Error saving time entry:", err);
            alert("Failed to save time entry.");
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm("Are you sure you want to delete this time entry?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("time_entries")
                .delete()
                .eq("id", entryId);

            if (error) throw error;
            if (selectedStaff) fetchTimeEntries(selectedStaff.id);
        } catch (err) {
            console.error("Error deleting time entry:", err);
            alert("Failed to delete time entry.");
        }
    };

    const currentEmployeeFromStore = useAppStore((state) => state.currentEmployee);
    const isOwnerOrManager = currentEmployeeFromStore?.role === 'owner' || currentEmployeeFromStore?.role === 'manager';

    const filteredEmployees = staff.filter(emp =>
        (`${emp.first_name} ${emp.last_name}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.role || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const clockedInCount = staff.filter(e => e.clocked_in).length;

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view staff.</p>
                <button onClick={() => window.location.href = "/dashboard/locations"} className="btn-primary">
                    Go to Locations
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Staff Management</h1>
                    <p className="text-slate-400 mt-1">
                        {currentLocation.name} - Manage your team and track performance
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
                    value={staff.length.toString()}
                    icon={<Users className="h-4 w-4" />}
                />
                <QuickStat
                    label="Clocked In"
                    value={clockedInCount.toString()}
                    icon={<Clock className="h-4 w-4" />}
                    variant="success"
                />
                <QuickStat
                    label="Daily Labor Cost"
                    value={formatCurrency(staff.reduce((sum, e) => sum + Number(e.hourly_rate || 0), 0))}
                    icon={<DollarSign className="h-4 w-4" />}
                />
                <QuickStat
                    label="Active Locations"
                    value="1"
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
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Performance</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Rate</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredEmployees.length > 0 ? (
                                filteredEmployees.map((emp) => (
                                    <tr
                                        key={emp.id}
                                        onClick={() => {
                                            setSelectedStaff(emp);
                                            setIsDetailModalOpen(true);
                                            setActiveTab("info");
                                        }}
                                        className="hover:bg-slate-900/40 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold border border-slate-700">
                                                    {emp.first_name[0]}{emp.last_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{emp.first_name} {emp.last_name}</p>
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
                                                    emp.clocked_in ? "badge-success" : "badge-secondary"
                                                )}>
                                                    {emp.clocked_in ? "Clocked In" : "Clocked Out"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-slate-600">Tracked via POS</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-slate-300">
                                            {formatCurrency(emp.hourly_rate)}/hr
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">

                                                {/* Only show trash for GM/Owner */}
                                                {isOwnerOrManager && emp.id !== currentEmployeeFromStore?.id && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowDiscontinueModal(emp);
                                                        }}
                                                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400"
                                                        title="Discontinue Staff Member"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No employees found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Invite Employee Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
                        setShowAddModal(false);
                        setInviteLink(null);
                    }} />
                    <div className="relative card w-full max-w-lg animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Invite Staff Member</h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setInviteLink(null);
                                }}
                                className="p-2 hover:bg-slate-800 rounded-lg"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {!inviteLink ? (
                            <form onSubmit={generateInvite} className="space-y-4">
                                <p className="text-slate-400 text-sm mb-6">
                                    Generate an invitation link for a new team member. They will be prompted to create their account and set their PIN.
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="label">Role</label>
                                        <select
                                            className="input"
                                            value={inviteForm.role}
                                            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                        >
                                            <option value="server">Server</option>
                                            <option value="cook">Cook</option>
                                            <option value="manager">Manager</option>
                                            <option value="bartender">Bartender</option>
                                            <option value="host">Host</option>
                                            <option value="busser">Busser</option>
                                            <option value="dishwasher">Dishwasher</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="label">Hourly Rate ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="input"
                                            placeholder="15.00"
                                            value={inviteForm.hourly_rate}
                                            onChange={(e) => setInviteForm({ ...inviteForm, hourly_rate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="label">Email Address</label>
                                    <input
                                        type="email"
                                        className="input"
                                        placeholder="employee@example.com"
                                        value={inviteForm.email}
                                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                        required
                                    />
                                    <p className="text-[10px] text-slate-500 italic">Crucial for identifying the employee and tracking their invitation flow.</p>
                                </div>

                                <div className="flex gap-3 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={inviteLoading}
                                        className="btn-primary flex-1 gap-2"
                                    >
                                        {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                        Generate Invite Link
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-6 py-4">
                                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-2xl flex items-center gap-3 text-green-400">
                                    <Check className="h-5 w-5" />
                                    <p className="text-sm font-medium">Invitation link generated successfully!</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="label text-xs uppercase tracking-wider text-slate-500">Share this link</label>
                                    <div className="flex gap-2">
                                        <div className="input flex-1 truncate text-sm font-mono bg-slate-900 border-slate-700 py-3">
                                            {inviteLink}
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(inviteLink)}
                                            className="btn-secondary px-4 hover:bg-orange-500/20 hover:text-orange-400"
                                            title="Copy link"
                                        >
                                            <Copy className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-2xl flex gap-3">
                                    <Info className="h-5 w-5 text-orange-400 shrink-0" />
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Anyone with this link can join your organization as a **{inviteForm.role}**. The link will expire in 7 days.
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setInviteLink(null);
                                    }}
                                    className="btn-primary w-full"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Discontinue Modal */}
            {showDiscontinueModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDiscontinueModal(null)} />
                    <div className="relative card w-full max-w-md animate-slide-up border-red-500/20 shadow-2xl shadow-red-500/5">
                        <div className="flex items-center gap-3 text-red-500 mb-6">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <Trash2 className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold">Discontinue Employee?</h2>
                        </div>

                        <div className="space-y-4">
                            <p className="text-slate-300">
                                You are about to discontinue <span className="font-bold text-white">{showDiscontinueModal.first_name} {showDiscontinueModal.last_name}</span>.
                            </p>

                            <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl flex gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    This will discontinue the user's access to the app immediately. All employee data, wages, and history will remain intact for tax and reporting purposes.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowDiscontinueModal(null)}
                                    className="btn-secondary flex-1"
                                    disabled={discontinuing}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDiscontinue}
                                    disabled={discontinuing}
                                    className="btn-primary bg-red-600 hover:bg-red-500 flex-1 gap-2"
                                >
                                    {discontinuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    Discontinue User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Role</p>
                                        <p className="capitalize">{selectedStaff.role}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Hourly Rate</p>
                                        <p>{formatCurrency(selectedStaff.hourly_rate)}/hr</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-500 uppercase font-bold">
                                            {selectedStaff.hire_date ? "Hire Date" : "Joined Date"}
                                        </p>
                                        <p>{selectedStaff.hire_date ? format(new Date(selectedStaff.hire_date), "MMM d, yyyy") : (selectedStaff.created_at ? format(new Date(selectedStaff.created_at), "MMM d, yyyy") : "N/A")}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Status</p>
                                        <span className={cn(
                                            "badge text-[10px]",
                                            selectedStaff.is_active ? "badge-success" : "badge-danger"
                                        )}>
                                            {selectedStaff.is_active ? "Active" : "Discontinued"}
                                        </span>
                                    </div>
                                    {!selectedStaff.is_active && selectedStaff.termination_date && (
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase font-bold text-red-400">Termination Date</p>
                                            <p className="text-red-400">{format(new Date(selectedStaff.termination_date), "MMM d, yyyy")}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-800">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Contact Info</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                            <Mail className="h-4 w-4 text-slate-500" />
                                            {selectedStaff.email}
                                        </div>
                                        {selectedStaff.phone && (
                                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                                <Phone className="h-4 w-4 text-slate-500" />
                                                {selectedStaff.phone}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            className="input py-1.5 text-xs h-auto"
                                            value={timeFilter.start}
                                            onChange={(e) => setTimeFilter({ ...timeFilter, start: e.target.value })}
                                        />
                                        <span className="text-slate-500 self-center">to</span>
                                        <input
                                            type="date"
                                            className="input py-1.5 text-xs h-auto"
                                            value={timeFilter.end}
                                            onChange={(e) => setTimeFilter({ ...timeFilter, end: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingEntry(null);
                                            setEntryForm({
                                                clock_in: format(new Date(), "yyyy-MM-dd'T'09:00"),
                                                clock_out: format(new Date(), "yyyy-MM-dd'T'17:00"),
                                                break_minutes: 0,
                                                notes: ""
                                            });
                                            setIsEditEntryModalOpen(true);
                                        }}
                                        className="btn-primary py-1.5 text-xs h-auto px-3"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add Entry
                                    </button>
                                </div>

                                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-800/50">
                                            <tr>
                                                <th className="px-3 py-2 font-semibold">Date</th>
                                                <th className="px-3 py-2 font-semibold">In/Out</th>
                                                <th className="px-3 py-2 font-semibold text-center">Hrs</th>
                                                <th className="px-3 py-2 font-semibold text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {timeLoading ? (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                                                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                                                        Loading records...
                                                    </td>
                                                </tr>
                                            ) : timeEntries.length > 0 ? (
                                                timeEntries.map((entry) => (
                                                    <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-3 py-2 text-slate-400">
                                                            {format(new Date(entry.clock_in), "MMM d")}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="flex flex-col">
                                                                <span>{format(new Date(entry.clock_in), "h:mm a")}</span>
                                                                <span className="text-slate-500">
                                                                    {entry.clock_out ? format(new Date(entry.clock_out), "h:mm a") : "Active"}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-center font-bold">
                                                            {entry.total_hours?.toFixed(1)}h
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingEntry(entry);
                                                                        setEntryForm({
                                                                            clock_in: format(new Date(entry.clock_in), "yyyy-MM-dd'T'HH:mm"),
                                                                            clock_out: entry.clock_out ? format(new Date(entry.clock_out), "yyyy-MM-dd'T'HH:mm") : "",
                                                                            break_minutes: entry.break_minutes || 0,
                                                                            notes: entry.notes || ""
                                                                        });
                                                                        setIsEditEntryModalOpen(true);
                                                                    }}
                                                                    className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                                                >
                                                                    <Edit2 className="h-3 w-3" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                                    className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                                                        No time entries found
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
                                className="btn-secondary flex-1"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Time Entry Edit Modal */}
            <Modal
                isOpen={isEditEntryModalOpen}
                onClose={() => setIsEditEntryModalOpen(false)}
                title={editingEntry ? "Edit Time Entry" : "Add Manual Time Entry"}
            >
                <form onSubmit={handleSaveEntry} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="label">Clock In</label>
                            <input
                                type="datetime-local"
                                className="input"
                                value={entryForm.clock_in}
                                onChange={(e) => setEntryForm({ ...entryForm, clock_in: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="label">Clock Out</label>
                            <input
                                type="datetime-local"
                                className="input"
                                value={entryForm.clock_out}
                                onChange={(e) => setEntryForm({ ...entryForm, clock_out: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="label">Break Minutes</label>
                        <input
                            type="number"
                            className="input"
                            value={entryForm.break_minutes}
                            onChange={(e) => setEntryForm({ ...entryForm, break_minutes: parseInt(e.target.value) || 0 })}
                            min="0"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="label">Notes</label>
                        <textarea
                            className="input min-h-[80px] py-3"
                            placeholder="Reason for manual edit..."
                            value={entryForm.notes}
                            onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsEditEntryModalOpen(false)}
                            className="btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex-1"
                        >
                            Save Entry
                        </button>
                    </div>
                </form>
            </Modal>
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


