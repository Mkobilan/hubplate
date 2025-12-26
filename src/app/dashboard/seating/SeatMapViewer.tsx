"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";
import { Order } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PenLine, X, UserCheck, Trash2, ChefHat, CalendarClock } from "lucide-react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import { format, addMinutes, isWithinInterval } from "date-fns";
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

    // Check permissions
    const MANAGEMENT_ROLES = ["owner", "manager"];
    const canEdit = isOrgOwner || (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role));
    const [maps, setMaps] = useState<MapConfig[]>([]);
    const [servers, setServers] = useState<Server[]>([]);
    const [currentMap, setCurrentMap] = useState<MapConfig | null>(null);
    const [tables, setTables] = useState<TableConfig[]>([]);
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);
    const [reservationSettings, setReservationSettings] = useState<ReservationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState<TableConfig | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

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
                    (payload) => {
                        console.log("SeatMapViewer: Real-time update received", payload.eventType);
                        fetchActiveOrders();
                    }
                )
                .subscribe((status) => {
                    console.log("SeatMapViewer: Subscription status", status);
                });

            return () => {
                console.log("SeatMapViewer: Cleaning up subscription");
                supabaseRef.current.removeChannel(channel);
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

    const handleSitTable = async () => {
        if (!selectedTable || !currentLocation || !currentEmployee) return;

        setActionLoading(true);
        try {
            const { error } = await (supabaseRef.current
                .from("orders") as any)
                .insert({
                    location_id: currentLocation.id,
                    server_id: currentEmployee.id,
                    table_number: selectedTable.label,
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

            toast.success(`Table ${selectedTable.label} seated`);
            setSelectedTable(null);
            fetchActiveOrders();
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
        } catch (err) {
            console.error("Error assigning server:", err);
            toast.error("Failed to assign server");
        } finally {
            setActionLoading(false);
        }
    };

    const fetchReservationSettings = async () => {
        const locId = locationRef.current?.id;
        if (!locId) return;

        try {
            const { data } = await supabaseRef.current
                .from("reservation_settings")
                .select("reservation_color, advance_indicator_minutes")
                .eq("location_id", locId)
                .single();

            if (data) {
                setReservationSettings(data);
            }
        } catch (err) {
            console.error("Error fetching reservation settings:", err);
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

        if (order) return { status: "occupied", order, reservation: null };
        if (reservation) return { status: "reserved", order: null, reservation };
        return { status: "available", order: null, reservation: null };
    };

    if (loading && maps.length === 0) {
        return <div className="flex justify-center items-center h-screen bg-slate-950"><Loader2 className="animate-spin text-orange-500" /></div>;
    }

    // Helper calculate stats
    const totalTables = tables.filter(t => t.object_type !== 'structure').length;
    const occupiedTables = tables.filter(t => t.object_type !== 'structure' && getTableStatus(t).status === "occupied").length;
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
            <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 flex items-center justify-between z-10">
                <div className="flex items-center gap-6">
                    <h1 className="font-bold text-lg text-white">Floor Plan</h1>

                    <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto max-w-[50vw]">
                        {maps.length === 0 ? (
                            <div className="px-4 py-1.5 text-sm text-slate-400 italic">No sections found</div>
                        ) : (
                            maps.map(m => (
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
                            ))
                        )}
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    {canEdit && currentMap && (
                        <Link href={`/dashboard/seating/editor?mapId=${currentMap.id}`} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                            <PenLine className="h-4 w-4" />
                            Edit Map
                        </Link>
                    )}
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
                                    const { status, order, reservation } = getTableStatus(table);
                                    const isOccupied = status === "occupied";
                                    const isReserved = status === "reserved";
                                    const assignedServer = servers.find(s => s.id === table.assigned_server_id);
                                    const initials = assignedServer ? `${assignedServer.first_name[0]}${assignedServer.last_name[0]}`.toUpperCase() : "";

                                    // Color priority: Occupied (red) > Reserved (custom) > Server color > Default gray
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
                                                <Text
                                                    text={initials || table.label}
                                                    fontSize={initials ? 18 : (table.object_type === 'seat' ? 12 : 16)}
                                                    fontStyle="bold"
                                                    fill="white"
                                                    width={table.width}
                                                    height={table.height}
                                                    verticalAlign="middle"
                                                    align="center"
                                                    listening={false}
                                                    opacity={table.shape === 'door' ? 0.9 : 1}
                                                />
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
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        Table {selectedTable.label}
                                    </h3>
                                    <button
                                        onClick={() => setSelectedTable(null)}
                                        className="text-slate-400 hover:text-white transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {(() => {
                                    const { status, order, reservation } = getTableStatus(selectedTable);
                                    const isOccupied = status === "occupied";
                                    const isReserved = status === "reserved";

                                    return (
                                        <div className="space-y-4">
                                            {isOccupied ? (
                                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-red-400 text-sm font-medium uppercase tracking-wider">Currently Seated</span>
                                                        <span className="text-xs text-slate-500 font-mono">#{order?.id.slice(0, 8)}</span>
                                                    </div>
                                                    <div className="text-white font-semibold flex items-center justify-between">
                                                        <span>Current Total</span>
                                                        <span>${order?.total?.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ) : isReserved ? (
                                                <div className="border rounded-xl p-4" style={{ backgroundColor: `${reservationSettings?.reservation_color || '#3b82f6'}10`, borderColor: `${reservationSettings?.reservation_color || '#3b82f6'}30` }}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CalendarClock className="h-4 w-4" style={{ color: reservationSettings?.reservation_color || '#3b82f6' }} />
                                                        <span className="text-sm font-medium uppercase tracking-wider" style={{ color: reservationSettings?.reservation_color || '#3b82f6' }}>Reserved</span>
                                                    </div>
                                                    <div className="text-white font-semibold">{reservation?.customer_name}</div>
                                                    <div className="text-sm text-slate-400 mt-1">
                                                        {reservation?.reservation_time?.slice(0, 5)} • Party of {reservation?.party_size}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                                    <p className="text-slate-400 text-sm text-center">
                                                        Table is currently available. Capacity: {selectedTable.capacity} guests.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Server Assignment Section (Manager Only) */}
                                            {canEdit && (
                                                <div className="space-y-2 pb-4">
                                                    <label className="text-xs text-slate-500 uppercase font-bold px-1">Assign Server</label>
                                                    <select
                                                        value={selectedTable.assigned_server_id || ""}
                                                        onChange={(e) => handleAssignServer(e.target.value || null)}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer"
                                                        disabled={actionLoading}
                                                    >
                                                        <option value="">Unassigned</option>
                                                        {servers.map(s => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.first_name} {s.last_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-3">
                                                {!isOccupied ? (
                                                    <button
                                                        onClick={handleSitTable}
                                                        disabled={actionLoading}
                                                        className="w-full flex items-center justify-center gap-2 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all transform active:scale-[0.98] disabled:opacity-50"
                                                    >
                                                        {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserCheck className="h-5 w-5" />}
                                                        Sit Guest
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => router.push(`/dashboard/orders?table=${selectedTable.label}`)}
                                                            className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all transform active:scale-[0.98]"
                                                        >
                                                            <ChefHat className="h-5 w-5" />
                                                            Go to Order
                                                        </button>
                                                        <button
                                                            onClick={() => handleClearTable(order!.id)}
                                                            disabled={actionLoading}
                                                            className="w-full flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-white text-slate-900 rounded-xl font-bold transition-all transform active:scale-[0.98] disabled:opacity-50"
                                                        >
                                                            {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                                            Clear Table
                                                        </button>
                                                    </>
                                                )}

                                                <button
                                                    onClick={() => setSelectedTable(null)}
                                                    className="w-full py-4 text-slate-400 hover:text-white font-medium transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
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
