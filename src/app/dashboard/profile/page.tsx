"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    User,
    Mail,
    Phone,
    Calendar,
    Clock,
    Save,
    CalendarCheck,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Check,
    CheckCircle2,
    AlertCircle,
    Edit2,
    Key,
    Lock,
    Activity
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { ClockInOut } from "@/components/dashboard/clock-in";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { AvailabilityCalendar } from "@/components/dashboard/AvailabilityCalendar";
import { HoursWorkedModal } from "@/components/dashboard/HoursWorkedModal";


export default function ProfilePage() {
    const { t } = useTranslation();
    const currentEmployeeFromStore = useAppStore((state) => state.currentEmployee);
    const currentLocation = useAppStore((state) => state.currentLocation);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);

    const [profile, setProfile] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: ""
    });

    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [newPin, setNewPin] = useState("");
    const [pinConfirm, setPinConfirm] = useState("");
    const [pinSuccess, setPinSuccess] = useState(false);


    const [shifts, setShifts] = useState<any[]>([]);

    const [selectedWeek, setSelectedWeek] = useState(new Date());

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                window.location.href = "/login";
                return;
            }

            let employeeId = currentEmployeeFromStore?.id;
            let organizationId = (currentEmployeeFromStore as any)?.organization_id;

            // 1. If no employee in store, fetch by user_id
            if (!employeeId) {
                const { data: emp, error: empError } = await supabase
                    .from("employees")
                    .select("*")
                    .eq("user_id", session.user.id)
                    .eq("is_active", true)
                    .limit(1)
                    .single();

                if (empError) {
                    console.error("No active employee record found for user:", empError);
                    setStatus("error");
                    setMessage("Employee profile not found. Please contact support.");
                    setLoading(false);
                    return;
                }

                employeeId = (emp as any).id;
                organizationId = (emp as any).organization_id;

                // Update store so other components know who we are
                useAppStore.getState().setCurrentEmployee(emp as any);

                // Also set location if not set
                if (!currentLocation && (emp as any).location_id) {
                    const { data: loc } = await supabase
                        .from("locations")
                        .select("*")
                        .eq("id", (emp as any).location_id)
                        .single();
                    if (loc) useAppStore.getState().setCurrentLocation(loc);
                }
            }

            // 2. Fetch full profile details
            const { data: employee, error: empError } = await (supabase as any)
                .from("employees")
                .select("*")
                .eq("id", employeeId)
                .single();

            if (empError) throw empError;

            setProfile({
                first_name: (employee as any).first_name || "",
                last_name: (employee as any).last_name || "",
                email: (employee as any).email || "",
                phone: (employee as any).phone || ""
            });

            // Update store so it's always fresh (e.g. after PIN update)
            useAppStore.getState().setCurrentEmployee(employee as any);


            // 3. Fetch Shifts

            const start = startOfWeek(selectedWeek).toISOString();
            const end = endOfWeek(selectedWeek).toISOString();

            const { data: shiftData, error: shiftError } = await (supabase as any)
                .from("shifts")
                .select("*")
                .eq("employee_id", employeeId)
                .gte("date", format(startOfWeek(selectedWeek), "yyyy-MM-dd"))
                .lte("date", format(endOfWeek(selectedWeek), "yyyy-MM-dd"));

            if (shiftError) throw shiftError;
            setShifts(shiftData || []);

        } catch (err) {
            console.error("Error fetching profile data:", err);
            setStatus("error");
            setMessage("Failed to load profile data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, [currentEmployeeFromStore?.id, selectedWeek]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentEmployeeFromStore) return;

        try {
            setSaving(true);
            setStatus("idle");
            const supabase = createClient();

            const { data, error } = await (supabase as any)
                .from("employees")
                .update({
                    phone: profile.phone,
                    email: profile.email
                })
                .eq("id", currentEmployeeFromStore.id)
                .select()
                .single();

            if (error) throw error;

            // Sync store with new data
            if (data) {
                useAppStore.getState().setCurrentEmployee(data);
                setProfile({
                    first_name: data.first_name || "",
                    last_name: data.last_name || "",
                    email: data.email || "",
                    phone: data.phone || ""
                });
            }

            setStatus("success");
            setMessage("Profile updated successfully!");
            setIsEditing(false);
            setTimeout(() => setStatus("idle"), 3000);
        } catch (err) {
            console.error("Error updating profile:", err);
            setStatus("error");
            setMessage("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentEmployeeFromStore) return;
        if (newPin.length !== 4 || isNaN(Number(newPin))) {
            setStatus("error");
            setMessage("PIN must be 4 digits.");
            return;
        }

        try {
            setSaving(true);
            const supabase = createClient();
            const { error } = await (supabase as any)
                .from("employees")
                .update({ pin_code: newPin })
                .eq("id", currentEmployeeFromStore.id);

            if (error) throw error;

            setPinSuccess(true);
            setTimeout(() => {
                setIsPinModalOpen(false);
                setPinSuccess(false);
                setNewPin("");
                fetchProfileData(); // Refresh to see updated PIN state
            }, 2000);
        } catch (err) {
            console.error("Error updating PIN:", err);
            setStatus("error");
            setMessage("Failed to update PIN.");
        } finally {
            setSaving(false);
        }
    };




    if (loading && !profile.first_name) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-2xl font-bold text-orange-500 shadow-lg shadow-orange-500/5">
                        {profile.first_name[0]}{profile.last_name[0]}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{profile.first_name} {profile.last_name}</h1>
                        <p className="text-slate-400 capitalize flex items-center gap-2">
                            <span className="badge badge-primary text-[10px]">{currentEmployeeFromStore?.role}</span>
                            <span>•</span>
                            <span>{currentLocation?.name}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <ClockInOut />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Personal Info & PIN Access */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Personal Information */}
                    <div className="card space-y-6">
                        <div className="flex items-center justify-between text-white font-bold">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-orange-500" />
                                <h2>Personal Information</h2>
                            </div>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-orange-400 transition-colors"
                                    title="Edit Profile"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleUpdateProfile} className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="label">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <input
                                            type="email"
                                            className="input pl-10"
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            placeholder="your@email.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="label">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <input
                                            type="tel"
                                            className="input pl-10"
                                            value={profile.phone}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            placeholder="(555) 000-0000"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn-primary flex-1 gap-2"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Save
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Email Address</label>
                                    <p className="text-sm text-slate-300 flex items-center gap-2">
                                        <Mail className="h-3 w-3 text-slate-500" />
                                        {profile.email || <span className="italic text-slate-600">Not provided</span>}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Phone Number</label>
                                    <p className="text-sm text-slate-300 flex items-center gap-2">
                                        <Phone className="h-3 w-3 text-slate-500" />
                                        {profile.phone || <span className="italic text-slate-600">Not provided</span>}
                                    </p>
                                </div>
                            </div>
                        )}

                        {status !== "idle" && (
                            <div className={cn(
                                "p-3 rounded-xl flex items-center gap-2 text-sm",
                                status === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                            )}>
                                {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                {message}
                            </div>
                        )}
                    </div>

                    {/* Staff PIN Access */}
                    <div className="card flex flex-col items-center justify-center p-8 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                            <Lock className="h-6 w-6 text-orange-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Staff PIN Access</h3>
                        <p className="text-xs text-slate-400 text-center max-w-sm mb-6">
                            Your 4-digit PIN is required for clocking in and out. Keep it secure and do not share it with others.
                        </p>
                        <button
                            onClick={() => setIsPinModalOpen(true)}
                            className="btn-secondary gap-2 px-8 w-full"
                        >
                            <Key className="h-4 w-4" />
                            {currentEmployeeFromStore?.pin_code ? "Reset Staff PIN" : "Set Staff PIN"}
                        </button>
                    </div>
                </div>

                {/* Right Column: Availability Calendar */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="card space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-xl">
                                    <CalendarCheck className="h-6 w-6 text-green-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">My Availability</h2>
                                    <p className="text-xs text-slate-500">Manage your working preferences and date-specific exceptions</p>
                                </div>
                            </div>
                        </div>
                        <AvailabilityCalendar />
                    </div>
                </div>
            </div>

            {/* My Schedule - Full Width Below */}
            <div className="card space-y-6 min-h-[400px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-white font-bold">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <h2>My Schedule</h2>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
                            className="p-1.5 hover:bg-slate-800 rounded-md"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-medium px-2 whitespace-nowrap">
                            {format(startOfWeek(selectedWeek), "MMM d")} - {format(endOfWeek(selectedWeek), "MMM d, yyyy")}
                        </span>
                        <button
                            onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
                            className="p-1.5 hover:bg-slate-800 rounded-md"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Weekly Shifts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                        const date = addDays(startOfWeek(selectedWeek), dayIdx);
                        const dayShifts = shifts.filter(s => s.date === format(date, "yyyy-MM-dd"));
                        const isToday = format(new Date(), "yyyy-MM-dd") === format(date, "yyyy-MM-dd");

                        return (
                            <div
                                key={dayIdx}
                                className={cn(
                                    "flex flex-col rounded-2xl border transition-all min-h-[140px]",
                                    isToday ? "bg-orange-500/5 border-orange-500/30 ring-1 ring-orange-500/20" : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                                )}
                            >
                                <div className={cn(
                                    "p-3 border-b text-center",
                                    isToday ? "border-orange-500/20" : "border-slate-800"
                                )}>
                                    <p className="text-[10px] uppercase font-bold text-slate-500">{format(date, "EEE")}</p>
                                    <p className={cn("text-lg font-bold", isToday ? "text-orange-500" : "text-white")}>{format(date, "d")}</p>
                                </div>
                                <div className="p-2 space-y-2 flex-1">
                                    {dayShifts.length > 0 ? (
                                        dayShifts.map((shift, i) => (
                                            <div key={i} className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                                                <p className="text-[10px] font-bold text-orange-400">
                                                    {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                                </p>
                                                <p className="text-[9px] text-slate-400 truncate uppercase mt-0.5">{shift.role || "Shift"}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full flex items-center justify-center">
                                            <span className="text-[10px] text-slate-600 font-medium whitespace-nowrap opacity-40">No Shift</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Total Hours Summary */}
                <div className="mt-8 p-6 bg-slate-900/50 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Clock className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Weekly Total</p>
                            <h3 className="text-2xl font-bold text-white">
                                {shifts.reduce((sum, s) => {
                                    const start = new Date(`1970-01-01T${s.start_time}`);
                                    const end = new Date(`1970-01-01T${s.end_time}`);
                                    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                                }, 0).toFixed(1)} Hours
                            </h3>
                        </div>
                    </div>
                    <div className="flex flex-col md:items-end">
                        <p className="text-xs text-slate-500 font-medium">Est. Earnings</p>
                        <h3 className="text-2xl font-bold text-green-400">
                            {formatCurrency(shifts.reduce((sum, s) => {
                                const start = new Date(`1970-01-01T${s.start_time}`);
                                const end = new Date(`1970-01-01T${s.end_time}`);
                                const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                                return sum + (hours * (currentEmployeeFromStore?.hourly_rate || 0));
                            }, 0))}
                        </h3>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={() => setIsHoursModalOpen(true)}
                        className="group flex items-center gap-3 px-8 py-4 bg-orange-600/10 hover:bg-orange-600 border border-orange-500/20 hover:border-orange-500 rounded-2xl transition-all duration-300"
                    >
                        <div className="p-2 bg-orange-500/20 group-hover:bg-white/20 rounded-xl transition-colors">
                            <Activity className="h-5 w-5 text-orange-500 group-hover:text-white" />
                        </div>
                        <div className="text-left">
                            <p className="text-white font-bold group-hover:scale-105 transition-transform">Hours Worked</p>
                            <p className="text-[10px] text-orange-400 font-medium group-hover:text-orange-100 uppercase tracking-wider">View detailed records</p>
                        </div>
                    </button>
                </div>

                <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-2xl flex gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-400 shrink-0" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Schedule data is updated in real-time by management. Contact your GM if you notice any discrepancies in your hours or shifts.
                    </p>
                </div>
            </div>

            {/* PIN Modal */}
            {isPinModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPinModalOpen(false)} />
                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-sm animate-slide-up shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                                <Key className="h-8 w-8 text-orange-500" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">{currentEmployeeFromStore?.pin_code ? "Reset Your PIN" : "Set Your PIN"}</h2>
                            <p className="text-slate-400 text-sm">Enter a 4-digit numeric code for quick access</p>
                        </div>

                        {pinSuccess ? (
                            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in zoom-in-95 duration-300">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Check className="h-8 w-8 text-green-500" />
                                </div>
                                <p className="text-green-500 font-bold">PIN Updated Successfully!</p>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdatePin} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="label text-center block">Enter 4-Digit PIN</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                        className="input text-center text-4xl tracking-widest font-bold h-20 bg-slate-800 border-2 focus:border-orange-500"
                                        value={newPin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "");
                                            if (val.length <= 4) setNewPin(val);
                                        }}
                                        placeholder="••••"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsPinModalOpen(false)}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || newPin.length !== 4}
                                        className="btn-primary flex-1 gap-2"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Save PIN
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
            {/* Hours Worked Modal */}
            <HoursWorkedModal
                isOpen={isHoursModalOpen}
                onClose={() => setIsHoursModalOpen(false)}
                employeeId={currentEmployeeFromStore?.id || ""}
            />
        </div>
    );
}
