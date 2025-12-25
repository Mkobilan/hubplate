"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";
import { Order } from "@/types/database";
import { Loader2, PenLine, X, UserCheck, Trash2 } from "lucide-react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import Link from "next/link";

interface TableConfig {
    id: string;
    label: string;
    shape: "rect" | "circle";
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    capacity: number;
}

interface MapConfig {
    id: string;
    name: string;
    location_id: string;
}

export default function SeatMapViewer() {
    const currentLocation = useAppStore((state) => state.currentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);
    const [maps, setMaps] = useState<MapConfig[]>([]);

    // Check permissions
    const MANAGEMENT_ROLES = ["owner", "manager"];
    const canEdit = isOrgOwner || (currentEmployee?.role && MANAGEMENT_ROLES.includes(currentEmployee.role));
    const [currentMap, setCurrentMap] = useState<MapConfig | null>(null);
    const [tables, setTables] = useState<TableConfig[]>([]);
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
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
                await fetchActiveOrders();
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

    const getTableStatus = (label: string) => {
        const trimmedLabel = label.trim();
        const order = activeOrders.find(o => (o.table_number || "").trim() === trimmedLabel);
        return order ? { status: "occupied", order } : { status: "available", order: null };
    };

    if (loading && maps.length === 0) {
        return <div className="flex justify-center items-center h-screen bg-slate-950"><Loader2 className="animate-spin text-orange-500" /></div>;
    }

    // Helper calculate stats
    const totalTables = tables.length;
    const occupiedTables = tables.filter(t => getTableStatus(t.label).status === "occupied").length;
    const availableTables = totalTables - occupiedTables;

    const StatusBadge = ({ status, count }: { status: string, count: number }) => (
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <div className={`w-2 h-2 rounded-full ${status === 'Available' ? 'bg-slate-400' : 'bg-red-500'}`}></div>
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
                                    const { status, order } = getTableStatus(table.label);
                                    const isOccupied = status === "occupied";

                                    return (
                                        <Group
                                            key={table.id}
                                            x={table.x}
                                            y={table.y}
                                            rotation={table.rotation}
                                            onClick={() => setSelectedTable(table)}
                                            onMouseEnter={(e) => {
                                                const container = e.target.getStage()?.container();
                                                if (container) container.style.cursor = "pointer";
                                            }}
                                            onMouseLeave={(e) => {
                                                const container = e.target.getStage()?.container();
                                                if (container) container.style.cursor = "default";
                                            }}
                                        >
                                            {table.shape === "rect" ? (
                                                <Rect
                                                    width={table.width}
                                                    height={table.height}
                                                    fill={isOccupied ? "#ef4444" : "#334155"}
                                                    stroke={isOccupied ? "#b91c1c" : "#1e293b"}
                                                    strokeWidth={1}
                                                    cornerRadius={8}
                                                    shadowColor="black"
                                                    shadowBlur={4}
                                                    shadowOpacity={0.3}
                                                />
                                            ) : (
                                                <Circle
                                                    x={table.width / 2}
                                                    y={table.height / 2}
                                                    radius={table.width / 2}
                                                    fill={isOccupied ? "#ef4444" : "#334155"}
                                                    stroke={isOccupied ? "#b91c1c" : "#1e293b"}
                                                    strokeWidth={1}
                                                    shadowColor="black"
                                                    shadowBlur={4}
                                                    shadowOpacity={0.3}
                                                />
                                            )}
                                            <Text
                                                text={table.label}
                                                fontSize={16}
                                                fontStyle="bold"
                                                fill="white"
                                                width={table.width}
                                                height={table.height}
                                                verticalAlign="middle"
                                                align="center"
                                                listening={false}
                                            />
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
                                    const { status, order } = getTableStatus(selectedTable.label);
                                    const isOccupied = status === "occupied";

                                    return (
                                        <div className="space-y-4">
                                            {isOccupied ? (
                                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-red-400 text-sm font-medium uppercase tracking-wider">Currently Seated</span>
                                                        <span className="text-xs text-slate-500 font-mono">#{order?.id.slice(0, 8)}</span>
                                                    </div>
                                                    <div className="text-white font-semibold flex items-center justify-between">
                                                        <span>Current Total</span>
                                                        <span>${order?.total?.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
                                                    <p className="text-slate-400 text-sm text-center">
                                                        Table is currently available. Capacity: {selectedTable.capacity} guests.
                                                    </p>
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
                                                    <button
                                                        onClick={() => handleClearTable(order!.id)}
                                                        disabled={actionLoading}
                                                        className="w-full flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-white text-slate-900 rounded-xl font-bold transition-all transform active:scale-[0.98] disabled:opacity-50"
                                                    >
                                                        {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                                        Clear Table
                                                    </button>
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
