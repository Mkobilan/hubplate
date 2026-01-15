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
    CheckCircle2,
    Loader2,
    AlertCircle,
    UserX,
    ChevronRight,
    Calendar,
    ArrowLeft,
    ArrowRight,
    FileSpreadsheet
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
    server_color?: string;
    pin_code?: string;
    created_at?: string;
    employee_roles?: Array<{ role: string; rank: number; hourly_rate?: number }>;
    active_role?: string;
    active_hourly_rate?: number;
};

const ROLES = ["server", "bartender", "cook", "host", "busser", "dishwasher", "driver", "expo", "agm", "manager", "owner"];

interface AvailabilityRecord {
    id: string;
    employee_id: string;
    organization_id: string;
    date: string | null;
    day_of_week: number | null;
    is_available: boolean;
    start_time: string;
    end_time: string;
}

import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { Database } from "@/types/database";
import { CSVUploadModal } from "@/components/staff/CSVUploadModal";

type Role = Database["public"]["Tables"]["employee_roles"]["Row"]["role"];

export default function StaffPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
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

    // Manual Add State
    const [addMethod, setAddMethod] = useState<"choice" | "invite" | "manual">("choice");
    const [manualAddLoading, setManualAddLoading] = useState(false);
    const [manualForm, setManualForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "server",
        pin_code: "",
        hourly_rate: "15.00",
        hire_date: new Date().toISOString().split('T')[0],
        max_weekly_hours: "40.00"
    });

    // CSV Import State
    const [showCSVModal, setShowCSVModal] = useState(false);

    // Labor Cost State
    const [estLaborCost, setEstLaborCost] = useState(0);
    const [actualLaborCost, setActualLaborCost] = useState(0);

    // Staff Detail & Timeclock State
    const [selectedStaff, setSelectedStaff] = useState<Employee | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "timeclock" | "availability">("info");
    const [availability, setAvailability] = useState<AvailabilityRecord[]>([]);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
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
                .select("*, employee_roles(*)")
                .eq("location_id", currentLocation.id)
                .eq("is_active", true)
                .order("first_name");
            if (staffError) throw staffError;

            // 2. Fetch Active Time Entries
            const { data: activeEntries, error: timeError } = await supabase
                .from("time_entries")
                .select("employee_id, role, hourly_rate")
                .eq("location_id", currentLocation.id)
                .is("clock_out", null);
            if (timeError) throw timeError;

            const clockedInMap = new Map((activeEntries as any[] || []).map(entry => [entry.employee_id, entry]));

            setStaff((employees as any[] || []).map(emp => {
                const activeEntry = clockedInMap.get(emp.id);
                return {
                    ...emp,
                    clocked_in: !!activeEntry,
                    active_role: activeEntry?.role,
                    active_hourly_rate: activeEntry?.hourly_rate
                };
            }));

            // 3. Calculate Labor Costs for Today
            const today = new Date().toISOString().split('T')[0];
            const startOfToday = `${today}T00:00:00`;
            const endOfToday = `${today}T23:59:59`;

            // A. Estimated Labor Cost (from Shifts)
            const { data: todayShifts } = await supabase
                .from("shifts")
                .select("*, employees(hourly_rate)")
                .eq("location_id", currentLocation.id)
                .eq("date", today);

            let totalEst = 0;
            (todayShifts || []).forEach((shift: any) => {
                if (shift.start_time && shift.end_time) {
                    const start = new Date(`${today}T${shift.start_time}`);
                    const end = new Date(`${today}T${shift.end_time}`);
                    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    if (hours < 0) hours += 24; // Handle overnight shifts if any
                    const rate = shift.employees?.hourly_rate || 0;
                    totalEst += hours * rate;
                }
            });
            setEstLaborCost(totalEst);

            // B. Actual Labor Cost (from Time Entries)
            // Completed entries today
            const { data: completedToday } = await supabase
                .from("time_entries")
                .select("total_pay")
                .eq("location_id", currentLocation.id)
                .gte("clock_in", startOfToday)
                .lte("clock_in", endOfToday)
                .not("clock_out", "is", null);

            let totalActual = (completedToday as any[] || []).reduce((sum, e) => sum + Number(e.total_pay || 0), 0);

            // Active entries (accrued part)
            const { data: activeEntriesToday } = await supabase
                .from("time_entries")
                .select("clock_in, hourly_rate, employee_id")
                .eq("location_id", currentLocation.id)
                .is("clock_out", null);

            const now = new Date();
            (activeEntriesToday || []).forEach((entry: any) => {
                const clockIn = new Date(entry.clock_in);
                const elapsedHours = Math.max(0, (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60));
                // Use entry hourly rate or fallback to employee's current rate
                const emp = (employees as any[])?.find((e: any) => e.id === entry.employee_id);
                const rate = entry.hourly_rate || emp?.hourly_rate || 0;
                totalActual += elapsedHours * rate;
            });
            setActualLaborCost(totalActual);
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

    const handleManualAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation) return;

        // Basic validation
        if (!manualForm.first_name || !manualForm.last_name) {
            alert("First and last name are required");
            return;
        }

        try {
            setManualAddLoading(true);
            const supabase = createClient();

            // Ensure we have an organization ID
            const orgId = (currentLocation as any).organization_id || (currentEmployee as any)?.organization_id;

            if (!orgId) {
                console.error("Missing organization_id", { currentLocation, currentEmployee });
                throw new Error("Missing organization ID. Please refresh and try again.");
            }

            const payload = {
                location_id: currentLocation.id,
                organization_id: orgId,
                first_name: manualForm.first_name.trim(),
                last_name: manualForm.last_name.trim(),
                email: manualForm.email.trim() || null,
                phone: manualForm.phone.trim() || null,
                role: manualForm.role,
                pin_code: manualForm.pin_code.trim() || null,
                hourly_rate: parseFloat(manualForm.hourly_rate) || 0,
                hire_date: manualForm.hire_date || null,
                max_weekly_hours: parseFloat(manualForm.max_weekly_hours) || 40,
                is_active: true
            };

            const { data, error } = await (supabase as any)
                .from("employees")
                .insert(payload)
                .select()
                .single();

            if (error) {
                console.error("Supabase Error Details:", {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    payload
                });
                throw error;
            }

            setShowAddModal(false);
            setAddMethod("choice");
            setManualForm({
                first_name: "",
                last_name: "",
                email: "",
                phone: "",
                role: "server",
                pin_code: "",
                hourly_rate: "15.00",
                hire_date: new Date().toISOString().split('T')[0],
                max_weekly_hours: "40.00"
            });
            fetchStaff();
        } catch (err: any) {
            console.error("Full Error Object:", err);
            const errorMessage = err.message || (typeof err === 'string' ? err : "Unknown database error");
            alert(`Failed to add employee: ${errorMessage}`);
        } finally {
            setManualAddLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Invite link copied to clipboard!");
    };

    useEffect(() => {
        fetchStaff();

        // Refresh labor costs every minute if someone is clocked in
        const interval = setInterval(() => {
            fetchStaff();
        }, 60000);

        if (!currentLocation) return () => clearInterval(interval);
        const supabase = createClient();
        const subStaff = supabase.channel('staff_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => fetchStaff())
            .subscribe();

        const subTime = supabase.channel('time_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => fetchStaff())
            .subscribe();

        const subShifts = supabase.channel('shift_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => fetchStaff())
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(subStaff);
            supabase.removeChannel(subTime);
            supabase.removeChannel(subShifts);
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

    const fetchAvailability = async (employeeId: string) => {
        try {
            setAvailabilityLoading(true);
            const supabase = createClient();

            const { data, error } = await supabase
                .from("availability")
                .select("*")
                .eq("employee_id", employeeId);

            if (error) throw error;
            setAvailability(data || []);
        } catch (err) {
            console.error("Error fetching availability:", err);
        } finally {
            setAvailabilityLoading(false);
        }
    };

    useEffect(() => {
        if (isDetailModalOpen && selectedStaff) {
            fetchTimeEntries(selectedStaff.id);
            fetchAvailability(selectedStaff.id);
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

    const handleClockOut = async (entry: any) => {
        if (!confirm("Are you sure you want to clock out this employee now?")) return;

        try {
            const supabase = createClient();
            const now = new Date();
            const clockIn = new Date(entry.clock_in);

            // Calculate totals
            const totalMs = now.getTime() - clockIn.getTime();
            const totalHours = (totalMs / 3600000); // No break deduction for forced clock out unless we want to prompt? defaulting to 0 break for now or keeping existing break if any? usually active shift has 0 break yet.

            // If they have a stored hourly rate on the entry use it, otherwise use current
            const rate = entry.hourly_rate || selectedStaff?.active_hourly_rate || selectedStaff?.hourly_rate || 0;

            const { error } = await (supabase as any)
                .from("time_entries")
                .update({
                    clock_out: now.toISOString(),
                    total_hours: Number(totalHours.toFixed(2)),
                    total_pay: Number((totalHours * rate).toFixed(2))
                })
                .eq("id", entry.id);

            if (error) throw error;

            if (selectedStaff) {
                fetchTimeEntries(selectedStaff.id);
                // Also refresh main staff list to update status
                fetchStaff();
            }
        } catch (err) {
            console.error("Error clocking out:", err);
            alert("Failed to clock out employee.");
        }
    };

    const handleUpdateServerColor = async (employeeId: string, color: string) => {
        try {
            const supabase = createClient();
            const { error } = await (supabase as any)
                .from("employees")
                .update({ server_color: color })
                .eq("id", employeeId);

            if (error) throw error;

            // Update local state
            setStaff(staff.map(emp => emp.id === employeeId ? { ...emp, server_color: color } : emp));
            if (selectedStaff?.id === employeeId) {
                setSelectedStaff({ ...selectedStaff, server_color: color });
            }
        } catch (err) {
            console.error("Error updating server color:", err);
            alert("Failed to update server color.");
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
            alert(`Failed to update ${field.replace('_', ' ')}.`);
        }
    };

    const isOwnerOrManager = isOrgOwner || currentEmployee?.role === 'owner' || currentEmployee?.role === 'manager' || currentEmployee?.role === 'gm' || currentEmployee?.role === 'agm';

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
                <div className="flex gap-2">
                    <button onClick={() => window.location.href = "/dashboard/locations"} className="btn btn-primary">
                        Go to Locations
                    </button>
                </div>
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
                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.href = "/dashboard/staff/discontinued"}
                        className="btn btn-secondary"
                        title="View inactive employees"
                    >
                        <UserX className="h-4 w-4" />
                        Discontinued
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                        <UserPlus className="h-4 w-4" />
                        Add Employee
                    </button>
                    {isOwnerOrManager && (
                        <button
                            onClick={() => setShowCSVModal(true)}
                            className="btn btn-secondary"
                            title="Bulk import employees from CSV"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Import CSV
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    label="Est Labor Cost"
                    value={formatCurrency(estLaborCost)}
                    icon={<Calendar className="h-4 w-4" />}
                    title="Based on today's schedule"
                />
                <QuickStat
                    label="Actual Labor Cost"
                    value={formatCurrency(actualLaborCost)}
                    icon={<DollarSign className="h-4 w-4" />}
                    variant={actualLaborCost > estLaborCost && estLaborCost > 0 ? "warning" : "default"}
                    title="Completed shifts + active accrual"
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
                    className="input !pl-10"
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
                                                    {emp.clocked_in
                                                        ? `Clocked In${emp.active_role ? ` (${emp.active_role})` : ''}`
                                                        : "Clocked Out"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-slate-600">Tracked via POS</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-slate-300">
                                            {formatCurrency(emp.clocked_in && emp.active_hourly_rate ? emp.active_hourly_rate : emp.hourly_rate)}/hr
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">

                                                {/* Only show trash for GM/Owner */}
                                                {isOwnerOrManager && emp.id !== currentEmployee?.id && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowDiscontinueModal(emp);
                                                        }}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 hover:text-red-400 transition-colors"
                                                        title="Delete Employee"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
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
                        setAddMethod("choice");
                    }} />
                    <div className="relative card w-full max-w-lg animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">
                                {addMethod === "choice" ? "Add Staff Member" : addMethod === "invite" ? "Invite Staff Member" : "Add Staff Manually"}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setInviteLink(null);
                                    setAddMethod("choice");
                                }}
                                className="p-2 hover:bg-slate-800 rounded-lg"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {addMethod === "choice" ? (
                            <div className="grid grid-cols-1 gap-4 py-4">
                                <button
                                    onClick={() => setAddMethod("invite")}
                                    className="flex items-center gap-4 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                        <Mail className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Generate Invite Link</h3>
                                        <p className="text-slate-400 text-sm">Send a signup link to the employee&apos;s email</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-600 ml-auto" />
                                </button>

                                <button
                                    onClick={() => setAddMethod("manual")}
                                    className="flex items-center gap-4 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                        <UserPlus className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Add Manually</h3>
                                        <p className="text-slate-400 text-sm">Enter employee details directly into the system</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-600 ml-auto" />
                                </button>
                            </div>
                        ) : addMethod === "invite" ? (
                            <div>
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
                                                    {ROLES.map(role => (
                                                        <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                                    ))}
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
                                                onClick={() => setAddMethod("choice")}
                                                className="btn btn-secondary flex-1"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={inviteLoading}
                                                className="btn btn-primary flex-1 gap-2"
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
                                                    className="btn btn-secondary px-4 hover:bg-orange-500/20 hover:text-orange-400"
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
                                                setAddMethod("choice");
                                            }}
                                            className="btn btn-primary w-full"
                                        >
                                            Done
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleManualAdd} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="label">First Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="John"
                                            value={manualForm.first_name}
                                            onChange={(e) => setManualForm({ ...manualForm, first_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="label">Last Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Doe"
                                            value={manualForm.last_name}
                                            onChange={(e) => setManualForm({ ...manualForm, last_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="label">Email Address</label>
                                        <input
                                            type="email"
                                            className="input"
                                            placeholder="john@example.com"
                                            value={manualForm.email}
                                            onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="label">Phone Number</label>
                                        <input
                                            type="tel"
                                            className="input"
                                            placeholder="555-0123"
                                            value={manualForm.phone}
                                            onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="label">Role</label>
                                        <select
                                            className="input"
                                            value={manualForm.role}
                                            onChange={(e) => setManualForm({ ...manualForm, role: e.target.value })}
                                        >
                                            {ROLES.map(role => (
                                                <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="label">Terminal PIN</label>
                                        <input
                                            type="text"
                                            maxLength={4}
                                            className="input"
                                            placeholder="1234"
                                            value={manualForm.pin_code}
                                            onChange={(e) => setManualForm({ ...manualForm, pin_code: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="label">Hourly Rate ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="input"
                                            placeholder="15.00"
                                            value={manualForm.hourly_rate}
                                            onChange={(e) => setManualForm({ ...manualForm, hourly_rate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="label">Hire Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={manualForm.hire_date}
                                            onChange={(e) => setManualForm({ ...manualForm, hire_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="label">Max Weekly Hours</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="40"
                                        value={manualForm.max_weekly_hours}
                                        onChange={(e) => setManualForm({ ...manualForm, max_weekly_hours: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setAddMethod("choice")}
                                        className="btn btn-secondary flex-1"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={manualAddLoading}
                                        className="btn btn-primary flex-1 gap-2"
                                    >
                                        {manualAddLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                        Add Employee
                                    </button>
                                </div>
                            </form>
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
                                    This will discontinue the user&apos;s access to the app immediately. All employee data, wages, and history will remain intact for tax and reporting purposes.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowDiscontinueModal(null)}
                                    className="btn btn-secondary flex-1"
                                    disabled={discontinuing}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDiscontinue}
                                    disabled={discontinuing}
                                    className="btn btn-primary bg-red-600 hover:bg-red-500 flex-1 gap-2"
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
                            <button
                                onClick={() => setActiveTab("availability")}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium transition-colors border-b-2",
                                    activeTab === "availability" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-slate-200"
                                )}
                            >
                                Availability
                            </button>
                        </div>

                        {activeTab === "info" ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-3">Roles & Priorities</p>
                                            <div className="space-y-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                                                {/* Primary Role (Rank 1) */}
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-orange-500 uppercase font-bold">Primary Role (Rank 1)</p>

                                                        {isOwnerOrManager ? (
                                                            <select
                                                                className="bg-transparent border-none text-sm font-bold p-0 focus:ring-0 capitalize cursor-pointer hover:text-orange-400 transition-colors"
                                                                value={selectedStaff.role}
                                                                onChange={async (e) => {
                                                                    const newRole = e.target.value;
                                                                    const supabase = createClient();

                                                                    try {
                                                                        // Optimistic update
                                                                        setSelectedStaff(prev => prev ? { ...prev, role: newRole } : null);

                                                                        // Save to DB
                                                                        const { error } = await (supabase as any)
                                                                            .from("employees")
                                                                            .update({ role: newRole })
                                                                            .eq("id", selectedStaff.id);

                                                                        if (error) throw error;
                                                                        fetchStaff();
                                                                    } catch (err) {
                                                                        console.error("Error updating primary role:", err);
                                                                        alert("Failed to update role");
                                                                    }
                                                                }}
                                                            >
                                                                {ROLES.map(role => (
                                                                    <option key={role} value={role}>{role}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <p className="font-bold capitalize">{selectedStaff.role}</p>
                                                        )}
                                                    </div>

                                                    {isOwnerOrManager ? (
                                                        <div className="flex items-center gap-1">
                                                            <DollarSign className="w-3 h-3 text-slate-500" />
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                className="w-16 bg-transparent border-none text-sm text-right p-0 focus:ring-0"
                                                                value={selectedStaff.hourly_rate || ""}
                                                                placeholder="0.00"
                                                                onChange={async (e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (isNaN(val)) return;

                                                                    // Optimistic update
                                                                    setSelectedStaff(prev => prev ? { ...prev, hourly_rate: val } : null);

                                                                    // Save to DB
                                                                    const supabase = createClient();
                                                                    await (supabase as any).from("employees")
                                                                        .update({ hourly_rate: val })
                                                                        .eq("id", selectedStaff.id);

                                                                    await fetchStaff();
                                                                }}
                                                            />
                                                            <span className="text-xs text-slate-500">/hr</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-500 italic">Managed via profile</div>
                                                    )}
                                                </div>

                                                {/* Secondary Role (Rank 2) */}
                                                <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-800">
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Secondary Role (Rank 2)</p>
                                                        <select
                                                            className="bg-transparent border-none text-sm font-bold p-0 focus:ring-0 capitalize cursor-pointer hover:text-orange-400 transition-colors"
                                                            value={selectedStaff.employee_roles?.find(r => r.rank === 2)?.role || "none"}
                                                            onChange={async (e) => {
                                                                const newRole = e.target.value;
                                                                const supabase = createClient();
                                                                const existing = selectedStaff.employee_roles?.find(r => r.rank === 2);

                                                                try {
                                                                    if (newRole === "none") {
                                                                        if (existing) {
                                                                            await (supabase as any).from("employee_roles").delete().eq("employee_id", selectedStaff.id).eq("rank", 2);
                                                                        }
                                                                    } else {
                                                                        if (existing) {
                                                                            await (supabase as any).from("employee_roles").update({ role: newRole }).eq("employee_id", selectedStaff.id).eq("rank", 2);
                                                                        } else {
                                                                            await (supabase as any).from("employee_roles").insert({ employee_id: selectedStaff.id, role: newRole, rank: 2, hourly_rate: selectedStaff.hourly_rate });
                                                                        }
                                                                    }
                                                                    fetchStaff();
                                                                    setSelectedStaff(prev => prev ? {
                                                                        ...prev,
                                                                        employee_roles: newRole === "none"
                                                                            ? (prev.employee_roles || []).filter(r => r.rank !== 2)
                                                                            : [
                                                                                ...(prev.employee_roles || []).filter(r => r.rank !== 2),
                                                                                { ...existing!, role: newRole, rank: 2, hourly_rate: existing?.hourly_rate || selectedStaff.hourly_rate }
                                                                            ]
                                                                    } : null);
                                                                } catch (err) {
                                                                    console.error("Error updating secondary role:", err);
                                                                }
                                                            }}
                                                        >
                                                            <option value="none">-- None --</option>
                                                            {ROLES.filter(r => r !== selectedStaff.role).map(role => (
                                                                <option key={role} value={role}>{role}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {selectedStaff.employee_roles?.find(r => r.rank === 2) && (
                                                        <div className="flex items-center gap-1">
                                                            <DollarSign className="w-3 h-3 text-slate-500" />
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                className="w-16 bg-transparent border-none text-sm text-right p-0 focus:ring-0"
                                                                value={selectedStaff.employee_roles?.find(r => r.rank === 2)?.hourly_rate || ""}
                                                                placeholder="0.00"
                                                                onChange={async (e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (isNaN(val)) return;

                                                                    const roleEntry = selectedStaff.employee_roles?.find(r => r.rank === 2);
                                                                    if (!roleEntry) return;

                                                                    // Optimistic update
                                                                    setSelectedStaff(prev => {
                                                                        if (!prev) return null;
                                                                        const newRoles = prev.employee_roles?.map(r =>
                                                                            r.rank === 2 ? { ...r, hourly_rate: val } : r
                                                                        ) || [];
                                                                        return { ...prev, employee_roles: newRoles };
                                                                    });

                                                                    // Save to DB
                                                                    const supabase = createClient();
                                                                    await (supabase as any).from("employee_roles")
                                                                        .update({ hourly_rate: val })
                                                                        .eq("employee_id", selectedStaff.id)
                                                                        .eq("rank", 2);

                                                                    await fetchStaff();
                                                                }}
                                                            />
                                                            <span className="text-xs text-slate-500">/hr</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Third Role (Rank 3) */}
                                                <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-800">
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Third Role (Rank 3)</p>
                                                        <select
                                                            className="bg-transparent border-none text-sm font-bold p-0 focus:ring-0 capitalize cursor-pointer hover:text-orange-400 transition-colors"
                                                            value={selectedStaff.employee_roles?.find(r => r.rank === 3)?.role || "none"}
                                                            onChange={async (e) => {
                                                                const newRole = e.target.value;
                                                                const supabase = createClient();
                                                                const existing = selectedStaff.employee_roles?.find(r => r.rank === 3);

                                                                try {
                                                                    if (newRole === "none") {
                                                                        if (existing) {
                                                                            await (supabase as any).from("employee_roles").delete().eq("employee_id", selectedStaff.id).eq("rank", 3);
                                                                        }
                                                                    } else {
                                                                        if (existing) {
                                                                            await (supabase as any).from("employee_roles").update({ role: newRole }).eq("employee_id", selectedStaff.id).eq("rank", 3);
                                                                        } else {
                                                                            await (supabase as any).from("employee_roles").insert({ employee_id: selectedStaff.id, role: newRole, rank: 3, hourly_rate: selectedStaff.hourly_rate });
                                                                        }
                                                                    }
                                                                    fetchStaff();
                                                                    setSelectedStaff(prev => prev ? {
                                                                        ...prev,
                                                                        employee_roles: newRole === "none"
                                                                            ? (prev.employee_roles || []).filter(r => r.rank !== 3)
                                                                            : [
                                                                                ...(prev.employee_roles || []).filter(r => r.rank !== 3),
                                                                                { ...existing!, role: newRole, rank: 3, hourly_rate: existing?.hourly_rate || selectedStaff.hourly_rate }
                                                                            ]
                                                                    } : null);
                                                                } catch (err) {
                                                                    console.error("Error updating third role:", err);
                                                                }
                                                            }}
                                                        >
                                                            <option value="none">-- None --</option>
                                                            {ROLES.filter(r => r !== selectedStaff.role && r !== selectedStaff.employee_roles?.find(x => x.rank === 2)?.role).map(role => (
                                                                <option key={role} value={role}>{role}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {selectedStaff.employee_roles?.find(r => r.rank === 3) && (
                                                        <div className="flex items-center gap-1">
                                                            <DollarSign className="w-3 h-3 text-slate-500" />
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                className="w-16 bg-transparent border-none text-sm text-right p-0 focus:ring-0"
                                                                value={selectedStaff.employee_roles?.find(r => r.rank === 3)?.hourly_rate || ""}
                                                                placeholder="0.00"
                                                                onChange={async (e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (isNaN(val)) return;

                                                                    const roleEntry = selectedStaff.employee_roles?.find(r => r.rank === 3);
                                                                    if (!roleEntry) return;

                                                                    // Optimistic update
                                                                    setSelectedStaff(prev => {
                                                                        if (!prev) return null;
                                                                        const newRoles = prev.employee_roles?.map(r =>
                                                                            r.rank === 3 ? { ...r, hourly_rate: val } : r
                                                                        ) || [];
                                                                        return { ...prev, employee_roles: newRoles };
                                                                    });

                                                                    // Save to DB
                                                                    const supabase = createClient();
                                                                    await (supabase as any).from("employee_roles")
                                                                        .update({ hourly_rate: val })
                                                                        .eq("employee_id", selectedStaff.id)
                                                                        .eq("rank", 3);

                                                                    await fetchStaff();
                                                                }}
                                                            />
                                                            <span className="text-xs text-slate-500">/hr</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase font-bold">Hourly Rate</p>
                                            <p>{formatCurrency(selectedStaff.hourly_rate)}/hr</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase font-bold">Joined Date</p>
                                            {isOwnerOrManager ? (
                                                <input
                                                    type="date"
                                                    className="bg-transparent border-none text-sm p-0 focus:ring-0 cursor-pointer hover:text-orange-400 transition-colors"
                                                    value={selectedStaff.hire_date || (selectedStaff.created_at ? format(new Date(selectedStaff.created_at), "yyyy-MM-dd") : "")}
                                                    onChange={(e) => handleUpdateDate(selectedStaff.id, 'hire_date', e.target.value)}
                                                />
                                            ) : (
                                                <p className="text-sm">
                                                    {selectedStaff.hire_date ? format(new Date(selectedStaff.hire_date), "MMM d, yyyy") : (selectedStaff.created_at ? format(new Date(selectedStaff.created_at), "MMM d, yyyy") : "N/A")}
                                                </p>
                                            )}
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
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500 uppercase font-bold">Table Color</p>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={(selectedStaff as any).server_color || "#334155"}
                                                    onChange={(e) => handleUpdateServerColor(selectedStaff.id, e.target.value)}
                                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-slate-700 hover:border-slate-500 transition-colors"
                                                    title="Assign color to this server"
                                                />
                                                <span className="text-xs text-slate-400 font-mono uppercase">{(selectedStaff as any).server_color || "#334155"}</span>
                                            </div>
                                        </div>
                                        {!selectedStaff.is_active && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-slate-500 uppercase font-bold text-red-400">Termination Date</p>
                                                {isOwnerOrManager ? (
                                                    <input
                                                        type="date"
                                                        className="bg-transparent border-none text-sm p-0 focus:ring-0 cursor-pointer hover:text-red-400 transition-colors text-red-400"
                                                        value={selectedStaff.termination_date || ""}
                                                        onChange={(e) => handleUpdateDate(selectedStaff.id, 'termination_date', e.target.value)}
                                                    />
                                                ) : (
                                                    <p className="text-red-400 text-sm">
                                                        {selectedStaff.termination_date ? format(new Date(selectedStaff.termination_date), "MMM d, yyyy") : "N/A"}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-800">
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-500 uppercase font-bold">Terminal PIN Code</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    placeholder="Enter 4 or 6 digit PIN"
                                                    className="input font-mono tracking-widest"
                                                    value={selectedStaff.pin_code || ""}
                                                    onChange={async (e) => {
                                                        const newPin = e.target.value.replace(/\D/g, "");
                                                        if (newPin.length <= 6) {
                                                            const updatedStaff = { ...selectedStaff, pin_code: newPin };
                                                            setSelectedStaff(updatedStaff);

                                                            // Auto-save when PIN is 4 or 6 digits
                                                            if (newPin.length === 4 || newPin.length === 6) {
                                                                try {
                                                                    const supabase = createClient();
                                                                    const { error } = await (supabase as any)
                                                                        .from("employees")
                                                                        .update({ pin_code: newPin })
                                                                        .eq("id", selectedStaff.id);
                                                                    if (error) throw error;
                                                                    setStaff(staff.map(emp => emp.id === selectedStaff.id ? { ...emp, pin_code: newPin } : emp));
                                                                } catch (err) {
                                                                    console.error("Error saving PIN:", err);
                                                                    alert("Failed to save PIN. It might already be in use.");
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                                <p className="text-[10px] text-slate-500 self-center">
                                                    Used for Terminal Mode login and clock-in.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-800">
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
                        ) : activeTab === "timeclock" ? (
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
                                        className="btn btn-primary py-1.5 text-xs h-auto px-3"
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
                                                                {!entry.clock_out && (
                                                                    <button
                                                                        onClick={() => handleClockOut(entry)}
                                                                        className="p-1.5 hover:bg-orange-500/20 rounded text-orange-400 hover:text-orange-300 mr-2"
                                                                        title="Clock Out Employee"
                                                                    >
                                                                        <span className="text-[10px] font-bold uppercase border border-orange-500/50 px-1 rounded">Clock Out</span>
                                                                    </button>
                                                                )}
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
                        ) : (
                            <div className="space-y-4">
                                {availabilityLoading ? (
                                    <div className="py-12 text-center text-slate-500">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 opacity-20" />
                                        <p>Fetching availability...</p>
                                    </div>
                                ) : availability.length > 0 ? (
                                    <div className="space-y-4">
                                        {(() => {
                                            const weekStart = startOfWeek(new Date());
                                            const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

                                            const effectiveAvailability = weekDays.map(date => {
                                                const dateStr = format(date, "yyyy-MM-dd");
                                                const dayOfWeek = date.getDay();

                                                // 1. Check for specific date override
                                                const override = availability.find(a => a.date === dateStr);
                                                if (override) return { date, status: override };

                                                // 2. Fall back to recurring pattern
                                                const recurring = availability.find(a => !a.date && a.day_of_week === dayOfWeek);
                                                return { date, status: recurring };
                                            });

                                            // Check if "Open" - all 7 days in effective week are available and have full coverage (simplified check)
                                            const isOpen = effectiveAvailability.every(d => d.status?.is_available);

                                            if (isOpen) {
                                                return (
                                                    <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl text-center">
                                                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                                        <h3 className="text-xl font-bold text-white mb-1">Open Availability</h3>
                                                        <p className="text-sm text-green-400/80">This employee has open availability this week</p>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {effectiveAvailability.map(({ date, status }) => (
                                                        <div key={date.toISOString()} className={cn(
                                                            "flex items-center justify-between p-3 rounded-xl border",
                                                            status?.is_available
                                                                ? "bg-slate-900/50 border-slate-800"
                                                                : "bg-red-500/5 border-red-500/10 opacity-50"
                                                        )}>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-sm">{format(date, "EEEE")}</span>
                                                                <span className="text-[10px] text-slate-500">{format(date, "MMM d")}</span>
                                                            </div>
                                                            {status?.is_available ? (
                                                                <div className="flex items-center gap-2 text-xs font-mono text-orange-400">
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>{status.start_time.slice(0, 5)} - {status.end_time.slice(0, 5)}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] uppercase font-bold text-red-500">Unavailable</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}

                                        {availability.some(a => a.date && new Date(a.date) > addDays(startOfWeek(new Date()), 6)) && (
                                            <div className="mt-6 pt-6 border-t border-slate-800">
                                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-wider">Future Overrides</p>
                                                <div className="space-y-2">
                                                    {availability
                                                        .filter(a => a.date && new Date(a.date!) > addDays(startOfWeek(new Date()), 6))
                                                        .sort((a, b) => a.date!.localeCompare(b.date!))
                                                        .slice(0, 5)
                                                        .map(avail => (
                                                            <div key={avail.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-500/5 border border-orange-500/10 text-xs text-orange-400">
                                                                <span>{format(new Date(avail.date!), "MMM d, yyyy")}</span>
                                                                <span>{avail.is_available ? `${avail.start_time.slice(0, 5)} - ${avail.end_time.slice(0, 5)}` : "Unavailable"}</span>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-slate-500">
                                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>No availability rules set for this employee.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="btn btn-secondary flex-1"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </Modal >

            {/* Time Entry Edit Modal */}
            < Modal
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
                            className="btn btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary flex-1"
                        >
                            Save Entry
                        </button>
                    </div>
                </form>
            </Modal >

            {/* CSV Upload Modal */}
            < CSVUploadModal
                isOpen={showCSVModal}
                onClose={() => setShowCSVModal(false)}
                locationId={currentLocation.id}
                organizationId={(currentLocation as any).organization_id}
                onImportComplete={() => fetchStaff()}
            />
        </div >
    );
}

function QuickStat({ label, value, icon, variant = "default", title }: { label: string, value: string, icon: React.ReactNode, variant?: "default" | "success" | "warning", title?: string }) {
    return (
        <div className="card flex items-center gap-4" title={title}>
            <div className={cn(
                "p-3 rounded-xl",
                variant === "success" ? "bg-green-500/10 text-green-400" :
                    variant === "warning" ? "bg-amber-500/10 text-amber-400" : "bg-orange-500/10 text-orange-400"
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


