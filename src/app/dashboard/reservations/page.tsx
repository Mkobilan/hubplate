"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";
import {
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    Users,
    Phone,
    Mail,
    Search,
    X,
    Check,
    Loader2,
    AlertCircle,
    Table2,
    Star,
    Settings2,
    MapPin,
    Armchair,
    Pencil,
    Globe,
    UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    parseISO,
    addMinutes,
    isWithinInterval,
} from "date-fns";
import { Modal } from "@/components/ui/modal";

// Types
interface Reservation {
    id: string;
    location_id: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string | null;
    wants_loyalty_enrollment: boolean;
    reservation_date: string;
    reservation_time: string;
    duration_minutes: number;
    party_size: number;
    special_accommodations: Record<string, any>;
    status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
    source?: "phone" | "online" | "walk_in";
    confirmation_code?: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

interface ReservationWithTables extends Reservation {
    tables: { id: string; label: string }[];
}

interface SeatingTable {
    id: string;
    label: string;
    capacity: number;
    map_id: string;
    shape: string;
    object_type?: string;
}

interface ReservationSettings {
    id: string;
    location_id: string;
    default_duration_minutes: number;
    reservation_color: string;
    advance_indicator_minutes: number;
    min_party_size: number;
    max_party_size: number;
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        seated: "bg-green-500/10 text-green-400 border-green-500/20",
        completed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
        no_show: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    };

    return (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border capitalize", colors[status] || colors.pending)}>
            {status.replace("_", " ")}
        </span>
    );
};

// Source badge component
const SourceBadge = ({ source }: { source?: string }) => {
    if (!source || source === "phone") return null;

    const colors: Record<string, string> = {
        online: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        walk_in: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };

    const icons: Record<string, React.ReactNode> = {
        online: <Globe className="h-3 w-3" />,
        walk_in: <UserPlus className="h-3 w-3" />,
    };

    return (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border capitalize flex items-center gap-1", colors[source] || "bg-slate-500/10 text-slate-400")}>
            {icons[source]}
            {source === "walk_in" ? "Walk-in" : source}
        </span>
    );
};

// Time slot for timeline
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return `${hour.toString().padStart(2, "0")}:00`;
});

export default function ReservationsPage() {
    console.log("ReservationsPage Rendered - v2");
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);

    // State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [reservations, setReservations] = useState<ReservationWithTables[]>([]);
    const [tables, setTables] = useState<SeatingTable[]>([]);
    const [settings, setSettings] = useState<ReservationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // View mode: 'list' or 'timeline'
    const [viewMode, setViewMode] = useState<"list" | "timeline">("list");

    // Edit mode
    const [editingReservation, setEditingReservation] = useState<ReservationWithTables | null>(null);

    // New reservation form
    const [newReservation, setNewReservation] = useState({
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        customer_birthday: "", // Add birthday field
        wants_loyalty_enrollment: false,
        reservation_date: format(new Date(), "yyyy-MM-dd"),
        reservation_time: "18:00",
        duration_minutes: 120,
        party_size: 2,
        special_accommodations: {
            allergies: "",
            birthday: false,
            anniversary: false,
            wheelchair: false,
            high_chair: false,
            notes: "",
        } as Record<string, any>,
        table_ids: [] as string[],
    });

    // Settings form
    const [settingsForm, setSettingsForm] = useState({
        default_duration_minutes: 120,
        reservation_color: "#3b82f6",
        advance_indicator_minutes: 15,
        min_party_size: 1,
        max_party_size: 20,
    });

    const MANAGEMENT_ROLES = ["owner", "manager"];
    const isTerminalMode = useAppStore((state) => state.isTerminalMode);
    const isManager = isTerminalMode
        ? (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role))
        : isOrgOwner || (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role));

    const supabase = createClient();

    // Fetch data
    useEffect(() => {
        if (currentLocation?.id) {
            fetchData();
            setupRealtimeSubscription();
        }
    }, [currentLocation?.id, selectedDate]);

    const fetchData = async () => {
        if (!currentLocation?.id) return;

        try {
            setLoading(true);

            // Fetch settings
            const { data: settingsData } = await (supabase as any)
                .from("reservation_settings")
                .select("*")
                .eq("location_id", currentLocation.id)
                .single();

            if (settingsData) {
                setSettings(settingsData as ReservationSettings);
                setSettingsForm({
                    default_duration_minutes: settingsData.default_duration_minutes,
                    reservation_color: settingsData.reservation_color,
                    advance_indicator_minutes: settingsData.advance_indicator_minutes,
                    min_party_size: settingsData.min_party_size,
                    max_party_size: settingsData.max_party_size,
                });
                setNewReservation((prev) => ({
                    ...prev,
                    duration_minutes: settingsData.default_duration_minutes,
                }));
            }

            // Fetch reservations for the selected date
            const { data: reservationsData, error: resError } = await (supabase as any)
                .from("reservations")
                .select("*")
                .eq("location_id", currentLocation.id)
                .eq("reservation_date", format(selectedDate, "yyyy-MM-dd"))
                .order("reservation_time", { ascending: true });

            if (resError) throw resError;

            // Fetch reservation tables
            if (reservationsData && reservationsData.length > 0) {
                const resIds = reservationsData.map((r: any) => r.id);
                const { data: tablesData } = await (supabase as any)
                    .from("reservation_tables")
                    .select("reservation_id, table_id, seating_tables(id, label)")
                    .in("reservation_id", resIds);

                const reservationsWithTables = reservationsData.map((res: any) => ({
                    ...res,
                    tables:
                        (tablesData as any[])
                            ?.filter((t: any) => t.reservation_id === res.id)
                            .map((t: any) => ({ id: t.seating_tables?.id, label: t.seating_tables?.label })) || [],
                }));

                setReservations(reservationsWithTables);
            } else {
                setReservations([]);
            }

            // Fetch all tables for booking (exclude walls, doors, chairs, seats)
            const { data: allTables } = await (supabase as any)
                .from("seating_tables")
                .select("id, label, capacity, map_id, shape, object_type")
                .eq("is_active", true)
                .order("label", { ascending: true });

            // Filter to only actual tables in maps for this location
            if (allTables) {
                const { data: maps } = await (supabase as any)
                    .from("seating_maps")
                    .select("id")
                    .eq("location_id", currentLocation.id);

                const mapIds = (maps as any[])?.map((m: any) => m.id) || [];
                // Filter: must be in location maps AND must be a table (not wall, door, chair, seat)
                const tablesOnly = (allTables as any[]).filter((t: any) =>
                    mapIds.includes(t.map_id) &&
                    (!t.object_type || t.object_type === 'table')
                );
                setTables(tablesOnly);
            }
        } catch (err) {
            console.error("Error fetching reservations:", err);
            toast.error("Failed to load reservations");
        } finally {
            setLoading(false);
        }
    };

    const setupRealtimeSubscription = () => {
        if (!currentLocation?.id) return;

        const channel = supabase
            .channel("reservations-realtime")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "reservations",
                    filter: `location_id=eq.${currentLocation.id}`,
                },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    // Check table availability for double-booking prevention
    const checkTableAvailability = async (tableIds: string[], date: string, time: string, duration: number, excludeReservationId?: string): Promise<{ available: boolean, conflictingTable?: string }> => {
        if (tableIds.length === 0) return { available: true };

        const startDateTime = new Date(`${date}T${time}`);
        const endDateTime = addMinutes(startDateTime, duration);

        // Fetch existing reservations for this date that aren't cancelled
        const { data: existingRes } = await (supabase as any)
            .from("reservations")
            .select("id, reservation_time, duration_minutes")
            .eq("location_id", currentLocation?.id)
            .eq("reservation_date", date)
            .not("status", "in", "(cancelled,no_show,completed)");

        if (!existingRes || existingRes.length === 0) return { available: true };

        // Get table assignments for these reservations
        const resIds = existingRes.filter((r: any) => !excludeReservationId || r.id !== excludeReservationId).map((r: any) => r.id);
        if (resIds.length === 0) return { available: true };

        const { data: tableAssignments } = await (supabase as any)
            .from("reservation_tables")
            .select("reservation_id, table_id")
            .in("reservation_id", resIds);

        // Check each of our requested tables for conflicts
        for (const tableId of tableIds) {
            const assignedRes = (tableAssignments as any[])?.filter((ta: any) => ta.table_id === tableId) || [];

            for (const assignment of assignedRes) {
                const conflictRes = existingRes.find((r: any) => r.id === assignment.reservation_id);
                if (!conflictRes) continue;

                const existingStart = new Date(`${date}T${conflictRes.reservation_time}`);
                const existingEnd = addMinutes(existingStart, conflictRes.duration_minutes);

                // Check for time overlap
                if (startDateTime < existingEnd && endDateTime > existingStart) {
                    const table = tables.find(t => t.id === tableId);
                    return { available: false, conflictingTable: table?.label || tableId };
                }
            }
        }

        return { available: true };
    };

    // Create or update reservation
    const handleCreateReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation?.id) return;

        try {
            setSaving(true);

            // Check for double-booking
            if (newReservation.table_ids.length > 0) {
                const { available, conflictingTable } = await checkTableAvailability(
                    newReservation.table_ids,
                    newReservation.reservation_date,
                    newReservation.reservation_time + ":00",
                    newReservation.duration_minutes,
                    editingReservation?.id
                );

                if (!available) {
                    toast.error(`Table ${conflictingTable} is already booked for this time slot!`);
                    setSaving(false);
                    return;
                }
            }

            let reservationId: string;

            if (editingReservation) {
                // Update existing reservation
                const { error: updateError } = await (supabase as any)
                    .from("reservations")
                    .update({
                        customer_name: newReservation.customer_name,
                        customer_phone: newReservation.customer_phone,
                        customer_email: newReservation.customer_email || null,
                        wants_loyalty_enrollment: newReservation.wants_loyalty_enrollment,
                        reservation_date: newReservation.reservation_date,
                        reservation_time: newReservation.reservation_time + ":00",
                        duration_minutes: newReservation.duration_minutes,
                        party_size: newReservation.party_size,
                        special_accommodations: newReservation.special_accommodations,
                    })
                    .eq("id", editingReservation.id);

                if (updateError) throw updateError;
                reservationId = editingReservation.id;

                // Delete old table assignments and re-insert
                await (supabase as any)
                    .from("reservation_tables")
                    .delete()
                    .eq("reservation_id", editingReservation.id);
            } else {
                // Insert new reservation
                const { data: reservation, error: resError } = await (supabase as any)
                    .from("reservations")
                    .insert({
                        location_id: currentLocation.id,
                        customer_name: newReservation.customer_name,
                        customer_phone: newReservation.customer_phone,
                        customer_email: newReservation.customer_email || null,
                        wants_loyalty_enrollment: newReservation.wants_loyalty_enrollment,
                        reservation_date: newReservation.reservation_date,
                        reservation_time: newReservation.reservation_time + ":00",
                        duration_minutes: newReservation.duration_minutes,
                        party_size: newReservation.party_size,
                        special_accommodations: newReservation.special_accommodations,
                        status: "confirmed",
                        created_by: currentEmployee?.id,
                    })
                    .select()
                    .single();

                if (resError) throw resError;
                reservationId = reservation.id;
            }

            // Insert table assignments
            if (newReservation.table_ids.length > 0) {
                const tableInserts = newReservation.table_ids.map((tableId) => ({
                    reservation_id: reservationId,
                    table_id: tableId,
                }));

                const { error: tableError } = await (supabase as any).from("reservation_tables").insert(tableInserts);
                if (tableError) throw tableError;
            }

            // Handle loyalty enrollment - create or update customer record
            if (newReservation.wants_loyalty_enrollment && newReservation.customer_phone) {
                const cleanPhone = newReservation.customer_phone.replace(/\D/g, "");

                // Split name into first and last
                const nameParts = newReservation.customer_name.trim().split(/\s+/);
                const firstName = nameParts[0] || "Guest";
                const lastName = nameParts.slice(1).join(" ") || "";

                // Check if customer already exists by phone and location
                const { data: existingCustomer, error: checkError } = await (supabase as any)
                    .from("customers")
                    .select("id, is_loyalty_member")
                    .eq("phone", cleanPhone)
                    .eq("location_id", currentLocation.id)
                    .maybeSingle();

                if (checkError) console.error("Error checking customer:", checkError);

                if (existingCustomer) {
                    // Update existing customer to be a loyalty member if they aren't already
                    if (!existingCustomer.is_loyalty_member) {
                        const { error: updateError } = await (supabase as any)
                            .from("customers")
                            .update({
                                first_name: firstName,
                                last_name: lastName,
                                email: newReservation.customer_email || null,
                                birthday: newReservation.customer_birthday || null,
                                is_loyalty_member: true,
                            })
                            .eq("id", existingCustomer.id);

                        if (updateError) console.error("Error updating customer:", updateError);
                    }
                } else {
                    // Create new customer as a loyalty member
                    const { error: insertError } = await (supabase as any)
                        .from("customers")
                        .insert({
                            location_id: currentLocation.id,
                            first_name: firstName,
                            last_name: lastName,
                            phone: cleanPhone,
                            email: newReservation.customer_email || null,
                            birthday: newReservation.customer_birthday || null,
                            is_loyalty_member: true,
                            loyalty_points: 0,
                            total_spent: 0,
                            total_visits: 0,
                        });

                    if (insertError) console.error("Error inserting customer:", insertError);
                }
            }

            toast.success(editingReservation ? "Reservation updated!" : "Reservation created!");
            setIsModalOpen(false);
            setEditingReservation(null);
            resetForm();
            fetchData();
        } catch (err) {
            console.error("Error saving reservation:", err);
            toast.error("Failed to save reservation");
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setNewReservation({
            customer_name: "",
            customer_phone: "",
            customer_email: "",
            customer_birthday: "",
            wants_loyalty_enrollment: false,
            reservation_date: format(new Date(), "yyyy-MM-dd"),
            reservation_time: "18:00",
            duration_minutes: settings?.default_duration_minutes || 120,
            party_size: 2,
            special_accommodations: {
                allergies: "",
                birthday: false,
                anniversary: false,
                wheelchair: false,
                high_chair: false,
                notes: "",
            } as Record<string, any>,
            table_ids: [],
        });
    };

    // Open modal to edit an existing reservation
    const handleEditReservation = (res: ReservationWithTables) => {
        setEditingReservation(res);
        setNewReservation({
            customer_name: res.customer_name,
            customer_phone: res.customer_phone,
            customer_email: res.customer_email || "",
            customer_birthday: "", // Reset birthday on edit (or we could fetch it if available, but simplest is reset)
            wants_loyalty_enrollment: res.wants_loyalty_enrollment,
            reservation_date: res.reservation_date,
            reservation_time: res.reservation_time.slice(0, 5), // Remove seconds
            duration_minutes: res.duration_minutes,
            party_size: res.party_size,
            special_accommodations: res.special_accommodations || {
                allergies: "",
                birthday: false,
                anniversary: false,
                wheelchair: false,
                high_chair: false,
                notes: "",
            },
            table_ids: res.tables.map(t => t.id),
        });
        setIsModalOpen(true);
    };

    // Update reservation status
    const handleStatusChange = async (id: string, status: string) => {
        try {
            const { error } = await (supabase as any).from("reservations").update({ status }).eq("id", id);

            if (error) throw error;

            toast.success(`Reservation ${status}`);
            fetchData();
        } catch (err) {
            console.error("Error updating status:", err);
            toast.error("Failed to update status");
        }
    };

    // Save settings
    const handleSaveSettings = async () => {
        if (!currentLocation?.id) return;

        try {
            setSaving(true);

            const { error } = await (supabase as any)
                .from("reservation_settings")
                .upsert({
                    location_id: currentLocation.id,
                    ...settingsForm,
                })
                .eq("location_id", currentLocation.id);

            if (error) throw error;

            toast.success("Settings saved!");
            setIsSettingsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Error saving settings:", err);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    // Calendar helpers
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const calendarDays = useMemo(() => {
        const days: Date[] = [];
        let day = calendarStart;
        while (day <= calendarEnd) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentMonth]);

    // Filter reservations
    const filteredReservations = useMemo(() => {
        if (!searchQuery) return reservations;
        const query = searchQuery.toLowerCase();
        return reservations.filter(
            (r) =>
                r.customer_name.toLowerCase().includes(query) ||
                r.customer_phone.includes(query) ||
                r.customer_email?.toLowerCase().includes(query)
        );
    }, [reservations, searchQuery]);

    // Calculate timeline data
    const timelineData = useMemo(() => {
        // Create a map of table id -> reservations during each hour
        const tableReservations: Record<string, Record<string, ReservationWithTables>> = {};

        tables.forEach((table) => {
            tableReservations[table.id] = {};
        });

        filteredReservations.forEach((res) => {
            if (res.status === "cancelled" || res.status === "no_show") return;

            const startTime = res.reservation_time.slice(0, 5);
            const [startHour] = startTime.split(":").map(Number);
            const endDate = addMinutes(new Date(`2000-01-01T${res.reservation_time}`), res.duration_minutes);
            const endHour = endDate.getHours();

            res.tables.forEach((table) => {
                // Only process if this table exists in our filtered tables list
                if (!tableReservations[table.id]) return;

                for (let h = startHour; h <= endHour; h++) {
                    const hourKey = `${h.toString().padStart(2, "0")}:00`;
                    tableReservations[table.id][hourKey] = res;
                }
            });
        });

        return tableReservations;
    }, [filteredReservations, tables]);

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <CalendarClock className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location to view reservations.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Reservations</h1>
                    <p className="text-slate-400 mt-1">Manage table reservations and bookings</p>
                </div>
                <div className="flex gap-2">
                    {isManager && (
                        <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="btn btn-secondary gap-2"
                        >
                            <Settings2 className="h-4 w-4" />
                            Settings
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setNewReservation((prev) => ({
                                ...prev,
                                reservation_date: format(selectedDate, "yyyy-MM-dd"),
                            }));
                            setIsModalOpen(true);
                        }}
                        className="btn btn-primary gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        New Reservation
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Mini Calendar */}
                <div className="card p-4 border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-800 rounded">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-800 rounded">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                            <div key={i} className="text-slate-500 font-medium py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, i) => {
                            const isSelected = isSameDay(day, selectedDate);
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isToday = isSameDay(day, new Date());

                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(day)}
                                    className={cn(
                                        "p-2 text-xs rounded-lg transition-colors relative",
                                        isSelected
                                            ? "bg-orange-500 text-white"
                                            : isToday
                                                ? "bg-blue-500/20 text-blue-400"
                                                : isCurrentMonth
                                                    ? "hover:bg-slate-800 text-slate-300"
                                                    : "text-slate-600 hover:bg-slate-800/50"
                                    )}
                                >
                                    {format(day, "d")}
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Stats */}
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Today's Reservations</span>
                            <span className="font-bold">{reservations.filter((r) => r.status !== "cancelled").length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Total Guests</span>
                            <span className="font-bold">
                                {reservations.filter((r) => r.status !== "cancelled").reduce((sum, r) => sum + r.party_size, 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Reservations List / Timeline */}
                <div className="lg:col-span-3 card p-0 border-slate-800 overflow-hidden">
                    {/* List Header */}
                    <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="flex items-center gap-4">
                            <h2 className="font-bold text-lg">{format(selectedDate, "EEEE, MMMM d, yyyy")}</h2>
                            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={cn(
                                        "px-3 py-1 rounded text-sm font-medium transition-colors",
                                        viewMode === "list" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    List
                                </button>
                                <button
                                    onClick={() => setViewMode("timeline")}
                                    className={cn(
                                        "px-3 py-1 rounded text-sm font-medium transition-colors",
                                        viewMode === "timeline" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Timeline
                                </button>
                            </div>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search reservations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input pl-10 w-full"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        </div>
                    ) : viewMode === "list" ? (
                        /* List View */
                        <div className="divide-y divide-slate-800">
                            {filteredReservations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <CalendarClock className="h-12 w-12 text-slate-600 mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-400">No Reservations</h3>
                                    <p className="text-slate-500 text-sm mt-1">No reservations for this date.</p>
                                </div>
                            ) : (
                                filteredReservations.map((res) => (
                                    <div
                                        key={res.id}
                                        className="p-4 hover:bg-slate-900/50 transition-colors flex flex-col sm:flex-row gap-4 justify-between"
                                    >
                                        <div className="flex gap-4">
                                            {/* Time */}
                                            <div className="text-center">
                                                <div className="text-lg font-bold">
                                                    {format(new Date(`2000-01-01T${res.reservation_time}`), "h:mm")}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {format(new Date(`2000-01-01T${res.reservation_time}`), "a")}
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{res.customer_name}</span>
                                                    <StatusBadge status={res.status} />
                                                    <SourceBadge source={res.source} />
                                                    {res.wants_loyalty_enrollment && (
                                                        <span title="Wants loyalty enrollment">
                                                            <Star className="h-3 w-3 text-yellow-400" />
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" /> {res.party_size} guests
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> {res.duration_minutes} min
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" /> {res.customer_phone}
                                                    </span>
                                                    {res.tables.length > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <Table2 className="h-3 w-3" />
                                                            {res.tables.map((t) => t.label).join(", ")}
                                                        </span>
                                                    )}
                                                    {res.confirmation_code && (
                                                        <span className="flex items-center gap-1 text-purple-400 font-mono">
                                                            #{res.confirmation_code}
                                                        </span>
                                                    )}
                                                </div>
                                                {res.special_accommodations?.allergies && (
                                                    <div className="flex items-center gap-1.5 text-red-500 font-medium text-xs mt-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 w-fit">
                                                        <AlertCircle className="h-3 w-3" />
                                                        <span>Allergies: {res.special_accommodations.allergies}</span>
                                                    </div>
                                                )}
                                                {res.special_accommodations?.notes && (
                                                    <div className="text-xs text-slate-500 italic">{res.special_accommodations.notes}</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 sm:self-center">
                                            {/* Edit Button */}
                                            <button
                                                onClick={() => handleEditReservation(res)}
                                                className="btn btn-secondary text-xs gap-1"
                                                title="Edit reservation"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </button>
                                            {res.status === "pending" && (
                                                <button
                                                    onClick={() => handleStatusChange(res.id, "confirmed")}
                                                    className="btn btn-secondary text-xs gap-1"
                                                >
                                                    <Check className="h-3 w-3" /> Confirm
                                                </button>
                                            )}
                                            {res.status === "confirmed" && (
                                                <button
                                                    onClick={() => handleStatusChange(res.id, "seated")}
                                                    className="btn btn-primary text-xs gap-1"
                                                >
                                                    <Check className="h-3 w-3" /> Seat
                                                </button>
                                            )}
                                            {res.status === "seated" && (
                                                <button
                                                    onClick={() => handleStatusChange(res.id, "completed")}
                                                    className="btn btn-secondary text-xs gap-1"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                            {(res.status === "pending" || res.status === "confirmed") && (
                                                <button
                                                    onClick={() => handleStatusChange(res.id, "cancelled")}
                                                    className="btn btn-secondary text-xs text-red-400 hover:text-red-300"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        /* Timeline View - Scrollable with sticky table column */
                        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                            <div className="min-w-[1400px] relative">
                                {/* Timeline Header - Sticky at top */}
                                <div className="flex border-b border-slate-800 sticky top-0 bg-slate-950 z-20">
                                    <div className="w-[100px] min-w-[100px] p-2 text-xs font-semibold text-slate-400 border-r border-slate-800 bg-slate-950 sticky left-0 z-30">Tables</div>
                                    <div className="flex flex-1">
                                        {TIME_SLOTS.map((slot) => (
                                            <div key={slot} className="w-[50px] min-w-[50px] p-2 text-xs text-center text-slate-500 border-r border-slate-800">
                                                {slot}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Timeline Rows */}
                                <div>
                                    {tables.filter(t => !t.object_type || t.object_type === 'table').map((table) => (
                                        <div
                                            key={table.id}
                                            className="flex border-b border-slate-800 hover:bg-slate-900/30"
                                        >
                                            {/* Sticky table label */}
                                            <div className="w-[100px] min-w-[100px] p-2 text-sm font-medium border-r border-slate-800 flex items-center gap-2 bg-slate-950 sticky left-0 z-10">
                                                <Table2 className="h-3 w-3 text-slate-500" />
                                                {table.label}
                                            </div>
                                            {/* Time slots */}
                                            <div className="flex flex-1">
                                                {TIME_SLOTS.map((slot) => {
                                                    const reservation = timelineData[table.id]?.[slot];
                                                    const isReserved = !!reservation;
                                                    const isStart = reservation?.reservation_time?.slice(0, 5) === slot.slice(0, 5);

                                                    return (
                                                        <div
                                                            key={slot}
                                                            className={cn(
                                                                "w-[50px] min-w-[50px] p-1 border-r border-slate-800 min-h-[40px] flex items-center justify-center",
                                                                isReserved
                                                                    ? "bg-blue-500/20"
                                                                    : "hover:bg-slate-800/50 cursor-pointer"
                                                            )}
                                                            title={reservation ? `${reservation.customer_name} - Party of ${reservation.party_size}` : "Available"}
                                                            onClick={() => {
                                                                if (!isReserved) {
                                                                    setNewReservation((prev) => ({
                                                                        ...prev,
                                                                        reservation_date: format(selectedDate, "yyyy-MM-dd"),
                                                                        reservation_time: slot,
                                                                        table_ids: [table.id],
                                                                    }));
                                                                    setIsModalOpen(true);
                                                                }
                                                            }}
                                                        >
                                                            {isStart && reservation && (
                                                                <div className="text-[10px] text-blue-400 truncate">
                                                                    {reservation.customer_name.split(" ")[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reservation Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingReservation(null);
                    resetForm();
                }}
                title={editingReservation ? "Edit Reservation" : "New Reservation"}
            >
                <form onSubmit={handleCreateReservation} className="space-y-4">
                    {/* Customer Info */}
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="label">Customer Name *</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="John Smith"
                                value={newReservation.customer_name}
                                onChange={(e) => setNewReservation({ ...newReservation, customer_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="label">Phone *</label>
                                <input
                                    type="tel"
                                    className="input"
                                    placeholder="(555) 123-4567"
                                    value={newReservation.customer_phone}
                                    onChange={(e) => setNewReservation({ ...newReservation, customer_phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    className="input"
                                    placeholder="john@example.com"
                                    value={newReservation.customer_email}
                                    onChange={(e) => setNewReservation({ ...newReservation, customer_email: e.target.value })}
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={newReservation.wants_loyalty_enrollment}
                                onChange={(e) => setNewReservation({ ...newReservation, wants_loyalty_enrollment: e.target.checked })}
                                className="rounded border-slate-600"
                            />
                            <span className="text-sm">Would you like to join our loyalty program?</span>
                        </label>

                        {newReservation.wants_loyalty_enrollment && (
                            <div className="space-y-1 animate-in slide-in-from-top-2">
                                <label className="label">Birthday <span className="text-orange-400 text-xs font-normal ml-2">For a Birthday Reward! 🎉</span></label>
                                <input
                                    type="date"
                                    className="input"
                                    value={newReservation.customer_birthday || ""}
                                    onChange={(e) => setNewReservation({ ...newReservation, customer_birthday: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Date/Time/Duration */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="label">Date *</label>
                            <input
                                type="date"
                                className="input"
                                value={newReservation.reservation_date}
                                onChange={(e) => setNewReservation({ ...newReservation, reservation_date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="label">Time *</label>
                            <input
                                type="time"
                                className="input"
                                value={newReservation.reservation_time}
                                onChange={(e) => setNewReservation({ ...newReservation, reservation_time: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="label">Duration (min) *</label>
                            <input
                                type="number"
                                className="input"
                                min={30}
                                step={15}
                                value={newReservation.duration_minutes || ''}
                                onChange={(e) => setNewReservation({ ...newReservation, duration_minutes: parseInt(e.target.value) || 120 })}
                                required
                            />
                        </div>
                    </div>

                    {/* Party Size */}
                    <div className="space-y-1">
                        <label className="label">Party Size *</label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setNewReservation({ ...newReservation, party_size: Math.max(1, newReservation.party_size - 1) })
                                }
                                className="btn btn-secondary px-3"
                            >
                                -
                            </button>
                            <span className="text-xl font-bold w-12 text-center">{newReservation.party_size}</span>
                            <button
                                type="button"
                                onClick={() => setNewReservation({ ...newReservation, party_size: newReservation.party_size + 1 })}
                                className="btn btn-secondary px-3"
                            >
                                +
                            </button>
                            <span className="text-sm text-slate-400">guests</span>
                        </div>
                    </div>

                    {/* Table Selection - Visual Grid */}
                    <div className="space-y-2">
                        <label className="label">Select Table(s)</label>
                        <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-3 max-h-[200px] overflow-auto">
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                                {tables.filter(t => !t.object_type || t.object_type === 'table').map((table) => {
                                    const isSelected = newReservation.table_ids.includes(table.id);
                                    return (
                                        <button
                                            key={table.id}
                                            type="button"
                                            onClick={() => {
                                                setNewReservation({
                                                    ...newReservation,
                                                    table_ids: isSelected
                                                        ? newReservation.table_ids.filter((id) => id !== table.id)
                                                        : [...newReservation.table_ids, table.id],
                                                });
                                            }}
                                            className={cn(
                                                "aspect-square rounded-lg flex flex-col items-center justify-center transition-all border-2",
                                                isSelected
                                                    ? "bg-orange-500/30 border-orange-500 text-orange-300"
                                                    : "bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-700"
                                            )}
                                        >
                                            <Table2 className={cn("h-4 w-4 mb-0.5", isSelected ? "text-orange-400" : "text-slate-400")} />
                                            <span className="text-xs font-semibold">{table.label}</span>
                                            <span className="text-[9px] text-slate-500">{table.capacity} seats</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {newReservation.table_ids.length > 0 && (
                            <div className="text-xs text-slate-400 flex items-center justify-between">
                                <span>{newReservation.table_ids.length} table(s) selected</span>
                                <button
                                    type="button"
                                    onClick={() => setNewReservation({ ...newReservation, table_ids: [] })}
                                    className="text-slate-500 hover:text-slate-300"
                                >
                                    Clear all
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Special Accommodations */}
                    <div className="space-y-3">
                        <label className="label">Special Accommodations</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { key: "birthday", label: "Birthday" },
                                { key: "anniversary", label: "Anniversary" },
                                { key: "wheelchair", label: "Wheelchair Access" },
                                { key: "high_chair", label: "High Chair" },
                            ].map((item) => (
                                <label key={item.key} className="flex items-center gap-2 cursor-pointer text-sm">
                                    <input
                                        type="checkbox"
                                        checked={newReservation.special_accommodations[item.key] || false}
                                        onChange={(e) =>
                                            setNewReservation({
                                                ...newReservation,
                                                special_accommodations: {
                                                    ...newReservation.special_accommodations,
                                                    [item.key]: e.target.checked,
                                                },
                                            })
                                        }
                                        className="rounded border-slate-600"
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                        <input
                            type="text"
                            className="input"
                            placeholder="Allergies (e.g., peanuts, shellfish)"
                            value={newReservation.special_accommodations.allergies || ""}
                            onChange={(e) =>
                                setNewReservation({
                                    ...newReservation,
                                    special_accommodations: {
                                        ...newReservation.special_accommodations,
                                        allergies: e.target.value,
                                    },
                                })
                            }
                        />
                        <textarea
                            className="input min-h-[60px]"
                            placeholder="Additional notes..."
                            value={newReservation.special_accommodations.notes || ""}
                            onChange={(e) =>
                                setNewReservation({
                                    ...newReservation,
                                    special_accommodations: {
                                        ...newReservation.special_accommodations,
                                        notes: e.target.value,
                                    },
                                })
                            }
                        />
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsModalOpen(false);
                                setEditingReservation(null);
                                resetForm();
                            }}
                            className="btn btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="btn btn-primary flex-1 gap-2">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editingReservation ? "Update Reservation" : "Create Reservation"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Settings Modal */}
            <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Reservation Settings">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="label">Default Duration (minutes)</label>
                        <input
                            type="number"
                            className="input"
                            min={30}
                            step={15}
                            value={settingsForm.default_duration_minutes}
                            onChange={(e) => setSettingsForm({ ...settingsForm, default_duration_minutes: parseInt(e.target.value) })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="label">Reservation Color (on Seat Map)</label>
                        <div className="flex gap-3 items-center">
                            <input
                                type="color"
                                value={settingsForm.reservation_color}
                                onChange={(e) => setSettingsForm({ ...settingsForm, reservation_color: e.target.value })}
                                className="w-12 h-10 rounded border border-slate-700 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={settingsForm.reservation_color}
                                onChange={(e) => setSettingsForm({ ...settingsForm, reservation_color: e.target.value })}
                                className="input flex-1"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="label">Show on Seat Map (minutes before)</label>
                        <input
                            type="number"
                            className="input"
                            min={0}
                            step={5}
                            value={settingsForm.advance_indicator_minutes}
                            onChange={(e) => setSettingsForm({ ...settingsForm, advance_indicator_minutes: parseInt(e.target.value) })}
                        />
                        <p className="text-xs text-slate-500">How many minutes before the reservation the table will change color</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="label">Min Party Size</label>
                            <input
                                type="number"
                                className="input"
                                min={1}
                                value={settingsForm.min_party_size}
                                onChange={(e) => setSettingsForm({ ...settingsForm, min_party_size: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="label">Max Party Size</label>
                            <input
                                type="number"
                                className="input"
                                min={1}
                                value={settingsForm.max_party_size}
                                onChange={(e) => setSettingsForm({ ...settingsForm, max_party_size: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setIsSettingsModalOpen(false)} className="btn btn-secondary flex-1">
                            Cancel
                        </button>
                        <button onClick={handleSaveSettings} disabled={saving} className="btn btn-primary flex-1 gap-2">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save Settings
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
