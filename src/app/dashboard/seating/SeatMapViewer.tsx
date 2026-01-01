"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";
import { Order, WaitlistEntry } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, addMinutes, isWithinInterval, differenceInMinutes } from "date-fns";
import {
    Loader2,
    PenLine,
    X,
    UserCheck,
    Trash2,
    ChefHat,
    CalendarClock,
    Clock,
    DollarSign,
    Users,
    Hourglass,
    CheckCircle2,
    Utensils,
    Receipt,
    Plus
} from "lucide-react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import { formatCurrency, cn } from "@/lib/utils";
import CloseTicketModal from "../orders/components/CloseTicketModal";
import { Modal } from "@/components/ui/modal";
import { WaitlistSidebar } from "@/components/waitlist/WaitlistSidebar";
interface TableConfig {
    id: string;
    label: string;
    shape: "rect" | "circle" | "oval" | "booth" | "chair" | "door" | "wall";
    object_type?: "table" | "structure" | "seat";
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    capacity: number;
    assigned_server_id?: string | null;
}

interface Server {
    id: string;
    first_name: string;
    last_name: string;
    server_color: string | null;
}

interface MapConfig {
    id: string;
    name: string;
    location_id: string;
}

interface Reservation {
    id: string;
    customer_name: string;
    reservation_date: string;
    reservation_time: string;
    duration_minutes: number;
    party_size: number;
    status: string;
    table_ids: string[];
}

interface ReservationSettings {
    reservation_color: string;
    advance_indicator_minutes: number;
}

export default function SeatMapViewer() {
    const router = useRouter();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const isTerminalMode = useAppStore((state) => state.isTerminalMode);

    // Check permissions
    const MANAGEMENT_ROLES = ["owner", "manager"];
    const canEdit = !!(isTerminalMode
        ? (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role))
        : isOrgOwner || (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role)));
    const [maps, setMaps] = useState<MapConfig[]>([]);
    const [servers, setServers] = useState<Server[]>([]);
    const [currentMap, setCurrentMap] = useState<MapConfig | null>(null);
    const [tables, setTables] = useState<TableConfig[]>([]);
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);
    const [reservationSettings, setReservationSettings] = useState<ReservationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState<TableConfig | null>(null);
    const [payingOrder, setPayingOrder] = useState<any | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
    const [newSectionName, setNewSectionName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
    const [seatedWaitlist, setSeatedWaitlist] = useState<WaitlistEntry[]>([]);

    // Request tracking for race conditions
    const lastRequestId = useRef<number>(0);
    const supabaseRef = useRef(createClient());
    const locationRef = useRef(currentLocation);

    // Keep location ref in sync
    useEffect(() => {
        locationRef.current = currentLocation;
    }, [currentLocation]);

    // Initial Fetch
    useEffect(() => {
        if (currentLocation?.id) {
            console.log("SeatMapViewer: Initializing for location", currentLocation.id);
            const init = async () => {
                await fetchMaps();
                await fetchServers();
                await fetchActiveOrders();
                await fetchReservationSettings();
                await fetchUpcomingReservations();
                await fetchSeatedWaitlist();
            };
            init();

            // Real-time subscription for orders
            const channel = supabaseRef.current
                .channel('seat-map-viewer')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `location_id=eq.${currentLocation.id}`
                    },
                    () => fetchActiveOrders()
                )
                .subscribe();

            // Real-time subscription for waitlist
            const waitlistChannel = supabaseRef.current
                .channel('waitlist-seating')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'waitlist',
                        filter: `location_id=eq.${currentLocation.id}`
                    },
                    () => fetchSeatedWaitlist()
                )
                .subscribe();

            return () => {
                supabaseRef.current.removeChannel(channel);
                supabaseRef.current.removeChannel(waitlistChannel);
            };
        }
    }, [currentLocation?.id]);

    // Fetch Tables when Map changes
    useEffect(() => {
        if (currentMap) {
            fetchTables(currentMap.id);

            // Subscribe to table changes for this map
            const channel = supabaseRef.current
                .channel(`map-${currentMap.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'seating_tables',
                        filter: `map_id=eq.${currentMap.id}`
                    },
                    () => fetchTables(currentMap.id)
                )
                .subscribe();

            return () => { supabaseRef.current.removeChannel(channel); };
        }
    }, [currentMap?.id]);

    const fetchMaps = async () => {
        const locId = locationRef.current?.id;
        if (!locId) return;

        try {
            setLoading(true);
            const { data, error } = await supabaseRef.current
                .from("seating_maps")
                .select("*")
                .eq("location_id", locId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                setMaps(data);
                // Preserve selection if still valid, else default to first
                if (!currentMap || !data.find((m: MapConfig) => m.id === currentMap.id)) {
                    setCurrentMap(data[0]);
                }
            } else {
                setMaps([]);
                setCurrentMap(null);
            }
        } catch (err) {
            console.error("Error fetching maps:", err);
            toast.error("Failed to load maps");
        } finally {
            setLoading(false);
        }
    };

    const fetchServers = async () => {
        const locId = locationRef.current?.id;
        if (!locId) return;

        try {
            const { data, error } = await supabaseRef.current
                .from("employees")
                .select("id, first_name, last_name, server_color")
                .eq("location_id", locId)
                .eq("is_active", true);

            if (error) throw error;
            setServers(data || []);
        } catch (err) {
            console.error("Error fetching servers:", err);
        }
    };

    const fetchTables = async (mapId: string) => {
        const { data } = await supabaseRef.current
            .from("seating_tables")
            .select("*")
            .eq("map_id", mapId)
            .eq("is_active", true);

        setTables(data || []);
    };

    const fetchActiveOrders = async () => {
        const loc = locationRef.current;
        if (!loc?.id) return;

        const requestId = ++lastRequestId.current;
        console.log(`SeatMapViewer: Fetching active orders for loc ${loc.id} (Req #${requestId})`);

        try {
            const { data, error } = await supabaseRef.current
                .from("orders")
                .select("*")
                .eq("location_id", loc.id)
                .in("status", ["pending", "in_progress", "ready", "served"]);

            if (error) {
                console.error("SeatMapViewer: Error fetching active orders:", error);
                return;
            }

            // Only update state if this is still the most recent request
            if (requestId === lastRequestId.current) {
                console.log(`SeatMapViewer: Active orders fetched (Req #${requestId}):`, data?.length || 0);
                setActiveOrders(data || []);
            } else {
                console.log(`SeatMapViewer: Ignoring stale fetch result (Req #${requestId})`);
            }
        } catch (err) {
            console.error("SeatMapViewer: Unexpected error in fetchActiveOrders:", err);
        }
    };

    const fetchSeatedWaitlist = async () => {
        const loc = locationRef.current;
        if (!loc?.id) return;

        try {
            const { data, error } = await supabaseRef.current
                .from("waitlist")
                .select("*")
                .eq("location_id", loc.id)
                .eq("status", "seated")
                .gte("seated_at", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()); // Last 4 hours

            if (error) throw error;
            setSeatedWaitlist(data || []);
        } catch (err) {
            console.error("Error fetching seated waitlist:", err);
        }
    };

    const handleSitTable = async () => {
        if (!selectedTable || !currentLocation || !currentEmployee) return;

        setActionLoading(true);
        try {
            const seatedEntry = seatedWaitlist.find(w => w.table_id === selectedTable.id);

            const { error } = await (supabaseRef.current
                .from("orders") as any)
                .insert({
                    location_id: currentLocation.id,
                    server_id: currentEmployee.id,
                    table_number: selectedTable.label,
                    customer_name: seatedEntry?.customer_name || null,
                    status: 'pending',
                    subtotal: 0,
                    tax: 0,
                    tip: 0,
                    total: 0,
                    order_type: 'dine_in'
                });

            if (error) {
                console.error("Supabase error sitting table:", error);
                throw error;
            }

            // Cleanup waitlist if guest was seated from waitlist
            if (seatedEntry) {
                await (supabaseRef.current
                    .from("waitlist") as any)
                    .update({ status: 'completed' })
                    .eq('id', seatedEntry.id);

                // Refresh waitlist state
                fetchSeatedWaitlist();
            }

            toast.success(`Table ${selectedTable.label} seated`);
            const tableLabel = selectedTable.label;
            setSelectedTable(null);
            fetchActiveOrders();

            // Redirect to orders page
            router.push(`/dashboard/orders?table=${tableLabel}`);
        } catch (err) {
            console.error("Error sitting table:", err);
            toast.error("Failed to sit table");
        } finally {
            setActionLoading(false);
        }
    };

    const handleClearTable = async (orderId: string) => {
        setActionLoading(true);
        try {
            const { error } = await (supabaseRef.current
                .from("orders") as any)
                .update({
                    status: 'completed',
                    payment_status: 'paid',
                    completed_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) {
                console.error("Supabase error clearing table:", error);
                throw error;
            }

            toast.success("Table cleared");
            setSelectedTable(null);
            fetchActiveOrders();
        } catch (err) {
            console.error("Error clearing table:", err);
            toast.error("Failed to clear table");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssignServer = async (employeeId: string | null) => {
        if (!selectedTable) return;

        setActionLoading(true);
        try {
            const { error } = await (supabaseRef.current
                .from("seating_tables") as any)
                .update({ assigned_server_id: employeeId })
                .eq('id', selectedTable.id);

            if (error) throw error;

            toast.success(employeeId ? "Server assigned" : "Server unassigned");
            // Update local tables state
            setTables(tables.map(t => t.id === selectedTable.id ? { ...t, assigned_server_id: employeeId } : t));
            setSelectedTable(null);
        } catch (err: any) {
            console.error("Error assigning server:", err);
            toast.error(err.message || "Failed to assign server");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddSection = async () => {
        if (!newSectionName.trim() || !currentLocation) return;
        setIsCreating(true);
        try {
            const supabase = createClient() as any;

            // Diagnostic check for permissions
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                throw new Error("You must be logged in to add a section");
            }

            console.log("=== DATA HEALTH CHECK ===");
            console.log("App State Location ID:", currentLocation.id);
            console.log("App State Organization ID:", currentLocation.organization_id);

            // Verify if the location actually exists in the DB
            const { data: dbLocation, error: locError } = await supabase
                .from("locations")
                .select("id, organization_id, owner_id")
                .eq("id", currentLocation.id)
                .maybeSingle();

            if (locError) {
                console.error("Health Check Error:", locError);
            }

            if (!dbLocation) {
                console.error("CRITICAL: Location not found in database! This is an ID mismatch.");
                throw new Error("Data mismatch detected. Please log out and log back in to refresh your location data.");
            }

            console.log("Database Verified Location:", dbLocation);

            // Check organization linkage
            if (dbLocation.organization_id !== currentLocation.organization_id) {
                console.warn("Organization ID mismatch between App and DB");
            }

            // Check if current user is owner
            const isOwner = dbLocation.owner_id === userData.user.id;
            console.log("User is location owner in DB:", isOwner);

            console.log("=== END HEALTH CHECK ===");

            const { data, error } = await supabase
                .from("seating_maps")
                .insert({
                    location_id: currentLocation.id,
                    name: newSectionName.trim()
                })
                .select()
                .single();

            if (error) {
                console.error("Supabase error adding section:", error);
                if (error.code === '42501') {
                    throw new Error("Permission denied. Ensure you have run the latest RLS migration.");
                }
                throw error;
            }

            toast.success("Section added!");
            setMaps([...maps, data]);
            setCurrentMap(data);
            setIsAddSectionModalOpen(false);
            setNewSectionName("");

            // Redirect to editor
            router.push(`/dashboard/seating/editor?mapId=${data.id}`);
        } catch (err: any) {
            console.error("Detailed error adding section:", err);
            toast.error(err.message || "Failed to add section");
        } finally {
            setIsCreating(false);
        }
    };

    const fetchReservationSettings = async () => {
        const locId = locationRef.current?.id;
        if (!locId) return;

        try {
            const { data, error } = await supabaseRef.current
                .from("reservation_settings")
                .select("reservation_color, advance_indicator_minutes")
                .eq("location_id", locId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching reservation settings:", error);
            }

            if (data) {
                setReservationSettings(data);
            }
        } catch (err) {
            console.error("Unexpected error fetching reservation settings:", err);
        }
    };

    const fetchUpcomingReservations = async () => {
        const locId = locationRef.current?.id;
        if (!locId) return;

        try {
            const today = format(new Date(), "yyyy-MM-dd");

            // Fetch today's reservations
            const { data: resData, error: resError } = await supabaseRef.current
                .from("reservations")
                .select("id, customer_name, reservation_date, reservation_time, duration_minutes, party_size, status")
                .eq("location_id", locId)
                .eq("reservation_date", today)
                .in("status", ["pending", "confirmed"]);

            if (resError) throw resError;

            if (resData && resData.length > 0) {
                const resIds = resData.map((r: any) => r.id);
                const { data: tablesData } = await supabaseRef.current
                    .from("reservation_tables")
                    .select("reservation_id, table_id")
                    .in("reservation_id", resIds);

                const reservationsWithTables = resData.map((res: any) => ({
                    ...res,
                    table_ids: (tablesData as any[])?.filter((t: any) => t.reservation_id === res.id).map((t: any) => t.table_id) || []
                }));

                setUpcomingReservations(reservationsWithTables);
            } else {
                setUpcomingReservations([]);
            }
        } catch (err) {
            console.error("Error fetching upcoming reservations:", err);
        }
    };

    const getTableReservation = (tableId: string) => {
        const now = new Date();
        const advanceMinutes = reservationSettings?.advance_indicator_minutes || 15;

        for (const res of upcomingReservations) {
            if (!res.table_ids.includes(tableId)) continue;

            const resDateTime = new Date(`${res.reservation_date}T${res.reservation_time}`);
            const resEndTime = addMinutes(resDateTime, res.duration_minutes);
            const showFromTime = addMinutes(resDateTime, -advanceMinutes);

            // Show if we're within the advance window or during the reservation
            if (now >= showFromTime && now <= resEndTime) {
                return res;
            }
        }
        return null;
    };

    const getTableStatus = (table: TableConfig) => {
        const trimmedLabel = table.label.trim();
        const order = activeOrders.find(o => (o.table_number || "").trim() === trimmedLabel);
        const reservation = getTableReservation(table.id);
        const seatedWaitlistEntry = seatedWaitlist.find(w => w.table_id === table.id);

        if (order) return { status: "occupied", order, reservation: null, seatedWaitlistEntry: null };
        if (seatedWaitlistEntry) return { status: "seated", order: null, reservation: null, seatedWaitlistEntry };
        if (reservation) return { status: "reserved", order: null, reservation, seatedWaitlistEntry: null };
        return { status: "available", order: null, reservation: null, seatedWaitlistEntry: null };
    };

    if (loading && maps.length === 0) {
        return <div className="flex justify-center items-center h-screen bg-slate-950"><Loader2 className="animate-spin text-orange-500" /></div>;
    }

    // Helper calculate stats
    const totalTables = tables.filter(t => t.object_type !== 'structure').length;
    const occupiedTables = tables.filter(t => t.object_type !== 'structure' && (getTableStatus(t).status === "occupied" || getTableStatus(t).status === "seated")).length;
    const reservedTables = tables.filter(t => t.object_type !== 'structure' && getTableStatus(t).status === "reserved").length;
    const availableTables = totalTables - occupiedTables - reservedTables;

    const StatusBadge = ({ status, count, color }: { status: string, count: number, color?: string }) => (
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: color || (status === 'Available' ? '#64748b' : status === 'Reserved' ? (reservationSettings?.reservation_color || '#3b82f6') : '#ef4444') }}></div>
            <span className="text-xs text-slate-300 font-medium">{status}: {count}</span>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-950">
            {/* Header / Tabs */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between z-10">
                <div className="flex items-center gap-6">
                    <h1 className="font-bold text-lg text-white">Floor Plan</h1>

                    <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto max-w-[50vw]">
                        {maps.length === 0 ? (
                            <button
                                onClick={() => setIsAddSectionModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Add First Section
                            </button>
                        ) : (
                            <>
                                {maps.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setCurrentMap(m)}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${currentMap?.id === m.id
                                            ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                                            }`}
                                    >
                                        {m.name}
                                    </button>
                                ))}
                                {canEdit && (
                                    <button
                                        onClick={() => setIsAddSectionModalOpen(true)}
                                        className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                                        title="Add Section"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    {canEdit && currentMap && (
                        <Link href={`/dashboard/seating/editor?mapId=${currentMap.id}`} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                            <PenLine className="h-4 w-4" />
                            Edit Map
                        </Link>
                    )}
                    <button
                        onClick={() => setIsWaitlistOpen(!isWaitlistOpen)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                            isWaitlistOpen
                                ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700"
                        )}
                    >
                        <Hourglass className={cn("h-4 w-4", isWaitlistOpen && "animate-pulse")} />
                        Waitlist
                    </button>
                    <div className="h-6 w-px bg-slate-800 mx-2"></div>
                    <StatusBadge status="Available" count={availableTables} />
                    <StatusBadge status="Reserved" count={reservedTables} />
                    <StatusBadge status="Occupied" count={occupiedTables} />
                </div>
            </div>

            {/* Viewer Area */}
            <div className="flex-1 relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] bg-slate-950 overflow-hidden">
                <ResponsiveStage>
                    <Stage
                        width={window.innerWidth}
                        height={window.innerHeight}
                        draggable
                        onWheel={(e) => e.evt.preventDefault()}
                    >
                        <Layer>
                            <Group>
                                {tables.map((table) => {
                                    const { status, order, reservation, seatedWaitlistEntry } = getTableStatus(table);
                                    const isOccupied = status === "occupied" || status === "seated";
                                    const isReserved = status === "reserved";
                                    const assignedServer = servers.find(s => s.id === table.assigned_server_id);
                                    const initials = assignedServer ? `${assignedServer.first_name[0]}${assignedServer.last_name[0]}`.toUpperCase() : "";

                                    // Color priority: Occupied/Seated (red) > Reserved (custom) > Server color > Default gray
                                    const tableColor = isOccupied
                                        ? "#ef4444"
                                        : isReserved
                                            ? (reservationSettings?.reservation_color || "#3b82f6")
                                            : (assignedServer?.server_color || "#334155");
                                    const strokeColor = isOccupied ? "#b91c1c" : isReserved ? "#1e40af" : "#1e293b";

                                    return (
                                        <Group
                                            key={table.id}
                                            x={table.x}
                                            y={table.y}
                                            rotation={table.rotation}
                                            onClick={() => table.object_type !== 'structure' && setSelectedTable(table)}
                                            onTap={() => table.object_type !== 'structure' && setSelectedTable(table)}
                                            onMouseEnter={(e) => {
                                                if (table.object_type === 'structure') return;
                                                const container = e.target.getStage()?.container();
                                                if (container) container.style.cursor = "pointer";
                                            }}
                                            onMouseLeave={(e) => {
                                                const container = e.target.getStage()?.container();
                                                if (container) container.style.cursor = "default";
                                            }}
                                        >
                                            {(() => {
                                                const commonProps = {
                                                    width: table.width,
                                                    height: table.height,
                                                    fill: tableColor,
                                                    stroke: strokeColor,
                                                    strokeWidth: 1,
                                                    shadowColor: "black",
                                                    shadowBlur: 4,
                                                    shadowOpacity: 0.3,
                                                };

                                                switch (table.shape) {
                                                    case "circle":
                                                        return (
                                                            <Circle
                                                                {...commonProps}
                                                                x={table.width / 2}
                                                                y={table.height / 2}
                                                                radius={table.width / 2}
                                                            />
                                                        );
                                                    case "oval":
                                                        return (
                                                            <Circle
                                                                {...commonProps}
                                                                x={table.width / 2}
                                                                y={table.height / 2}
                                                                radiusX={table.width / 2}
                                                                radiusY={table.height / 2}
                                                            />
                                                        );
                                                    case "booth":
                                                        return (
                                                            <Group>
                                                                {/* Table surface (center) */}
                                                                <Rect
                                                                    {...commonProps}
                                                                    y={15}
                                                                    height={table.height - 30}
                                                                    cornerRadius={2}
                                                                    fill={tableColor}
                                                                />
                                                                {/* Top Seat */}
                                                                <Rect
                                                                    x={0}
                                                                    y={0}
                                                                    width={table.width}
                                                                    height={15}
                                                                    fill={isOccupied ? "#ef4444" : "#1e293b"}
                                                                    cornerRadius={[4, 4, 0, 0]}
                                                                />
                                                                {/* Bottom Seat */}
                                                                <Rect
                                                                    x={0}
                                                                    y={table.height - 15}
                                                                    width={table.width}
                                                                    height={15}
                                                                    fill={isOccupied ? "#ef4444" : "#1e293b"}
                                                                    cornerRadius={[0, 0, 4, 4]}
                                                                />
                                                            </Group>
                                                        );
                                                    case "chair":
                                                        return (
                                                            <Group>
                                                                <Circle
                                                                    {...commonProps}
                                                                    x={table.width / 2}
                                                                    y={table.height / 2}
                                                                    radius={table.width / 2}
                                                                    fill={isOccupied ? "#ef4444" : "#475569"}
                                                                />
                                                                <Rect
                                                                    x={0}
                                                                    y={-2}
                                                                    width={table.width}
                                                                    height={6}
                                                                    fill={tableColor}
                                                                    cornerRadius={3}
                                                                />
                                                            </Group>
                                                        );
                                                    case "door":
                                                        return (
                                                            <Group>
                                                                <Rect
                                                                    {...commonProps}
                                                                    fill="#fb923c"
                                                                    opacity={0.6}
                                                                />
                                                                <Rect
                                                                    x={0}
                                                                    y={0}
                                                                    width={4}
                                                                    height={table.height}
                                                                    fill="#ea580c"
                                                                />
                                                            </Group>
                                                        );
                                                    case "wall":
                                                        return (
                                                            <Rect
                                                                {...commonProps}
                                                                fill="#64748b"
                                                                stroke="#475569"
                                                                strokeWidth={2}
                                                            />
                                                        );
                                                    default:
                                                        return <Rect {...commonProps} cornerRadius={8} />;
                                                }
                                            })()}
                                            {/* Consolidated Label Rendering */}
                                            {(table.object_type !== 'structure' || table.shape === 'door') && (
                                                <Group y={table.height / 2} listening={false} opacity={table.shape === 'door' ? 0.9 : 1}>
                                                    <Text
                                                        text={initials ? `${table.label}\n${initials}` : table.label}
                                                        width={table.width}
                                                        fontSize={Math.min(table.width / 3, 16)}
                                                        fontStyle="bold"
                                                        fill="white"
                                                        align="center"
                                                        verticalAlign="middle"
                                                        y={0}
                                                        lineHeight={1}
                                                    />
                                                </Group>
                                            )}
                                        </Group>
                                    );
                                })}
                            </Group>
                        </Layer>
                    </Stage>
                </ResponsiveStage>

                {/* Table Action Modal */}
                {selectedTable && (
                    <TableStatusModal
                        table={selectedTable}
                        onClose={() => setSelectedTable(null)}
                        status={getTableStatus(selectedTable)}
                        servers={servers}
                        canEdit={canEdit}
                        onAssignServer={handleAssignServer}
                        onSitTable={handleSitTable}
                        onPay={(order) => {
                            setPayingOrder(order);
                            setSelectedTable(null);
                        }}
                        onGoToOrder={(tableLabel) => router.push(`/dashboard/orders?table=${tableLabel}`)}
                        actionLoading={actionLoading}
                        reservationSettings={reservationSettings}
                    />
                )}

                {/* Integration with CloseTicketModal */}
                {payingOrder && (
                    <CloseTicketModal
                        orderId={payingOrder.id}
                        tableNumber={payingOrder.table_number || ""}
                        orderType={payingOrder.order_type || "dine_in"}
                        total={payingOrder.total}
                        onClose={() => setPayingOrder(null)}
                        onPaymentComplete={() => {
                            fetchActiveOrders();
                            setPayingOrder(null);
                        }}
                    />
                )}

                {/* Waitlist Sidebar */}
                <WaitlistSidebar
                    isOpen={isWaitlistOpen}
                    onClose={() => setIsWaitlistOpen(false)}
                />

                {/* Add Section Modal */}
                <Modal
                    isOpen={isAddSectionModalOpen}
                    onClose={() => setIsAddSectionModalOpen(false)}
                    title="Add New Section"
                    className="max-w-md"
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Section Name</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. Patio, Main Dining, Bar"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors"
                                value={newSectionName}
                                onChange={(e) => setNewSectionName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsAddSectionModalOpen(false)}
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddSection}
                                disabled={isCreating || !newSectionName.trim()}
                                className="flex-[2] px-4 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-5 w-5" />
                                        Create Section
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            </div >
        </div >
    );
}

interface TableStatusModalProps {
    table: TableConfig;
    onClose: () => void;
    status: { status: string; order: any; reservation: any; seatedWaitlistEntry: any };
    servers: Server[];
    canEdit: boolean;
    onAssignServer: (id: string | null) => void;
    onSitTable: () => void;
    onPay: (order: any) => void;
    onGoToOrder: (label: string) => void;
    actionLoading: boolean;
    reservationSettings: ReservationSettings | null;
}

function TableStatusModal({
    table,
    onClose,
    status,
    servers,
    canEdit,
    onAssignServer,
    onSitTable,
    onPay,
    onGoToOrder,
    actionLoading,
    reservationSettings
}: TableStatusModalProps) {
    const isOccupied = status.status === "occupied";
    const isSeated = status.status === "seated";
    const isReserved = status.status === "reserved";
    const order = status.order;
    const reservation = status.reservation;
    const seatedWaitlistEntry = status.seatedWaitlistEntry;

    // Calculate camping time
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(interval);
    }, []);

    const campingMinutes = order?.created_at ? differenceInMinutes(now, new Date(order.created_at)) : 0;

    // Process order items
    const items = (order?.items || []) as any[];
    const seatedGuests = new Set(items.map(i => i.seat_number).filter(Boolean)).size || (isOccupied ? 1 : 0);

    const itemStatusCounts = items.reduce((acc, item) => {
        const s = item.status || 'pending';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalItems = items.length;
    const servedItems = itemStatusCounts['served'] || 0;
    const progress = totalItems > 0 ? (servedItems / totalItems) * 100 : 0;

    // Group items by seat
    const groupedBySeat = items.reduce((acc, item) => {
        const seat = item.seat_number || 1;
        if (!acc[seat]) acc[seat] = [];
        acc[seat].push(item);
        return acc;
    }, {} as Record<number, any[]>);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header Section */}
                <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-black text-white tracking-tight">Table {table.label}</h3>
                                {(isOccupied || isSeated) && (
                                    <span className="px-2 py-0.5 rounded bg-red-500 text-[10px] font-black uppercase tracking-widest text-white animate-pulse">
                                        {isOccupied ? "Occupied" : "Seated"}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-slate-400">
                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                    <Users className="h-3.5 w-3.5" />
                                    <span>Capacity: {table.capacity}</span>
                                </div>
                                {(isOccupied || isSeated) && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium">
                                        <Hourglass className="h-3.5 w-3.5 text-orange-400" />
                                        <span>
                                            {isOccupied ? `Camping: ${campingMinutes}m` : `Seated: ${differenceInMinutes(now, new Date(seatedWaitlistEntry?.seated_at || seatedWaitlistEntry?.created_at || now))}m`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                    {/* Status Content */}
                    {!isOccupied && !isSeated && !isReserved && (
                        <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-800">
                            <div className="bg-slate-800/50 p-4 rounded-full mb-4">
                                <Utensils className="h-8 w-8 text-slate-600" />
                            </div>
                            <p className="text-slate-400 font-medium">Table is currently available</p>
                            <p className="text-xs text-slate-500 mt-1">Ready to sit a new party</p>
                        </div>
                    )}

                    {isSeated && (
                        <div className="p-5 rounded-2xl border border-red-500/30 bg-red-500/10">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="h-5 w-5 text-red-500" />
                                <span className="text-sm font-bold uppercase tracking-wider text-red-500">Guest Seated (Waitlist)</span>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mb-1">Guest Name</p>
                                    <p className="text-xl font-bold text-white">{seatedWaitlistEntry.customer_name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mb-1">Party Size</p>
                                        <p className="text-white font-semibold">{seatedWaitlistEntry.party_size} People</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mb-1">Phone</p>
                                        <p className="text-white font-semibold">{seatedWaitlistEntry.customer_phone || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isReserved && (
                        <div className="p-5 rounded-2xl border" style={{ backgroundColor: `${reservationSettings?.reservation_color || '#3b82f6'}10`, borderColor: `${reservationSettings?.reservation_color || '#3b82f6'}30` }}>
                            <div className="flex items-center gap-2 mb-4">
                                <CalendarClock className="h-5 w-5" style={{ color: reservationSettings?.reservation_color || '#3b82f6' }} />
                                <span className="text-sm font-bold uppercase tracking-wider" style={{ color: reservationSettings?.reservation_color || '#3b82f6' }}>Upcoming Reservation</span>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mb-1">Guest Name</p>
                                    <p className="text-xl font-bold text-white">{reservation.customer_name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mb-1">Time</p>
                                        <p className="text-white font-semibold">{reservation.reservation_time.slice(0, 5)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mb-1">Party Size</p>
                                        <p className="text-white font-semibold">{reservation.party_size} People</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isOccupied && (
                        <div className="space-y-6">
                            {/* Order Summary Card */}
                            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-inner">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order Progress</span>
                                        <span className="text-slate-300 font-bold">{servedItems} of {totalItems} items served</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Total</span>
                                        <p className="text-xl font-black text-orange-500 tracking-tighter">{formatCurrency(order.total)}</p>
                                    </div>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                                    <div
                                        className="h-full bg-orange-500 transition-all duration-500 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {['pending', 'preparing', 'ready', 'served'].map((s) => (
                                        <div key={s} className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/50 text-center">
                                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{s}</p>
                                            <p className={cn(
                                                "text-sm font-bold",
                                                itemStatusCounts[s] > 0 ? "text-orange-400" : "text-slate-700"
                                            )}>{itemStatusCounts[s] || 0}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Detailed Items List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Item Details</h4>
                                    <span className="text-xs text-slate-500">{seatedGuests} Seated Guests</span>
                                </div>

                                {Object.keys(groupedBySeat).length > 0 ? (
                                    Object.entries(groupedBySeat).map(([seat, seatItems]: [any, any]) => (
                                        <div key={seat} className="border-l-2 border-slate-800 ml-1 pl-4 space-y-2">
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Seat {seat}</span>
                                            {seatItems.map((item: any) => (
                                                <div key={item.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-400">
                                                            {item.quantity}x
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white leading-tight">{item.name}</p>
                                                            {item.notes && <p className="text-[10px] text-orange-400/80 italic mt-0.5">{item.notes}</p>}
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                                                        item.status === 'served' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                                            item.status === 'ready' ? "bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse" :
                                                                item.status === 'preparing' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                                    "bg-slate-800 text-slate-500 border-slate-700"
                                                    )}>
                                                        {item.status || 'pending'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-slate-600 italic text-sm">
                                        Waiting for first order...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Management Section */}
                    <div className="pt-6 border-t border-slate-800 space-y-4">
                        {canEdit && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Assign Server</label>
                                <div className="relative">
                                    <select
                                        value={table.assigned_server_id || ""}
                                        onChange={(e) => onAssignServer(e.target.value || null)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                                        disabled={actionLoading}
                                    >
                                        <option value="">Unassigned</option>
                                        {servers.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.first_name} {s.last_name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <PenLine className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {!isOccupied ? (
                                <button
                                    onClick={onSitTable}
                                    disabled={actionLoading}
                                    className="sm:col-span-2 w-full flex items-center justify-center gap-2 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase tracking-widest transition-all transform active:scale-95 disabled:opacity-50 shadow-lg shadow-orange-600/20"
                                >
                                    {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isSeated ? <Utensils className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />)}
                                    {isSeated ? "Start Order" : "Sit Guest"}
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => onGoToOrder(table.label)}
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-blue-600/20"
                                    >
                                        <Utensils className="h-5 w-5" />
                                        Update Order
                                    </button>
                                    <button
                                        onClick={() => onPay(order)}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-white text-slate-900 rounded-xl font-bold transition-all transform active:scale-95 disabled:opacity-50"
                                    >
                                        {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Receipt className="h-5 w-5" />}
                                        Clear & Pay
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper to handle Stage resize
const ResponsiveStage = ({ children }: { children: React.ReactElement }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setSize({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        window.addEventListener('resize', updateSize);
        updateSize();

        return () => window.removeEventListener('resize', updateSize);
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full">
            {React.cloneElement(children as any, { width: size.width, height: size.height })}
        </div>
    );
};
