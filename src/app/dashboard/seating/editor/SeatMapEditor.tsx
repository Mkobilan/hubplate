"use client";

import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Rect, Circle, Text, Group, Transformer } from "react-konva";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Save, Trash2, ArrowLeft, ZoomIn, ZoomOut, Maximize, Edit2, MousePointer2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { Database } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";

// Types
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
    is_active: boolean;
}

interface MapConfig {
    id: string;
    name: string;
    location_id: string;
}



export default function SeatMapEditor() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const stageRef = useRef<any>(null);
    const [maps, setMaps] = useState<MapConfig[]>([]);
    const [currentMap, setCurrentMap] = useState<MapConfig | null>(null);
    const [tables, setTables] = useState<TableConfig[]>([]);
    const [selectedId, selectTable] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isCreatingMap, setIsCreatingMap] = useState(false);
    const [newMapName, setNewMapName] = useState("");
    const [isEditingMapName, setIsEditingMapName] = useState(false);

    // Editor State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // Fetch initial data
    useEffect(() => {
        if (currentLocation) {
            const loadData = async () => {
                const supabase = createClient() as any;
                const { data: mapsData, error } = await supabase
                    .from("seating_maps")
                    .select("*")
                    .eq("location_id", currentLocation.id)
                    .order('created_at', { ascending: true });

                if (mapsData && mapsData.length > 0) {
                    setMaps(mapsData);

                    const paramMapId = searchParams.get("mapId");
                    let initialMap = mapsData[0];

                    if (paramMapId) {
                        const found = mapsData.find((m: MapConfig) => m.id === paramMapId);
                        if (found) initialMap = found;
                    }

                    if (!currentMap) setCurrentMap(initialMap);
                } else {
                    setMaps([]);
                    setIsCreatingMap(true); // Prompt to create first map
                }
                setLoading(false);
            };
            loadData();
        }
    }, [currentLocation?.id]);

    // When map changes, fetch its tables
    useEffect(() => {
        if (currentMap) {
            // Update URL without reload to reflect current selection (optional but nice)
            // router.replace(`/dashboard/seating/editor?mapId=${currentMap.id}`, { scroll: false });
            fetchTables(currentMap.id);
        }
    }, [currentMap?.id]);

    const fetchMaps = async () => {
        try {
            setLoading(true);
            const supabase = createClient() as any;

            // Fetch all maps for location
            let { data: mapsData, error } = await supabase
                .from("seating_maps")
                .select("*")
                .eq("location_id", currentLocation!.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (!mapsData || mapsData.length === 0) {
                // Create default map if none exist
                const { data: newMap, error: createError } = await supabase
                    .from("seating_maps")
                    .insert({
                        location_id: currentLocation!.id,
                        name: "Main Floor",
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                mapsData = [newMap];
            }

            setMaps(mapsData);
            // Select first map if none selected or current not in list
            if (!currentMap || !mapsData.find((m: any) => m.id === currentMap.id)) {
                setCurrentMap(mapsData[0]);
            }
        } catch (error) {
            console.error("Error fetching maps:", error);
            toast.error("Failed to load maps");
        } finally {
            setLoading(false);
        }
    };

    const fetchTables = async (mapId: string) => {
        const supabase = createClient() as any;
        const { data } = await supabase
            .from("seating_tables")
            .select("*")
            .eq("map_id", mapId)
            .eq("is_active", true);

        if (data) setTables(data);
        else setTables([]);
    }

    const handleCreateMap = async () => {
        if (!newMapName.trim()) return;
        try {
            setSaving(true);
            const supabase = createClient() as any;
            const { data, error } = await supabase
                .from("seating_maps")
                .insert({
                    location_id: currentLocation!.id,
                    name: newMapName.trim()
                })
                .select()
                .single();

            if (error) throw error;

            setMaps([...maps, data]);
            setCurrentMap(data);
            setNewMapName("");
            setIsCreatingMap(false);
            toast.success("Section added!");
        } catch (error) {
            toast.error("Failed to create section");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateMapName = async () => {
        if (!currentMap || !newMapName.trim()) return;
        try {
            setSaving(true);
            const supabase = createClient() as any;
            const { error } = await supabase
                .from("seating_maps")
                .update({ name: newMapName.trim() })
                .eq("id", currentMap.id);

            if (error) throw error;

            setMaps(maps.map(m => m.id === currentMap.id ? { ...m, name: newMapName.trim() } : m));
            setCurrentMap({ ...currentMap, name: newMapName.trim() });
            setNewMapName("");
            setIsEditingMapName(false);
            toast.success("Section renamed!");
        } catch (error) {
            toast.error("Failed to update name");
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!currentMap) return;
        try {
            setSaving(true);
            const supabase = createClient() as any;

            // 1. Upsert tables
            const tablesToUpsert = tables.map(t => ({
                id: t.id,
                map_id: currentMap.id,
                label: t.label,
                shape: t.shape,
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height,
                rotation: t.rotation,
                capacity: t.capacity,
                is_active: true
            }));

            // Use upsert
            const { error: upsertError } = await supabase
                .from("seating_tables")
                .upsert(tablesToUpsert);

            if (upsertError) throw upsertError;

            // 2. Handle deletions
            const { data: existingIds } = await supabase
                .from("seating_tables")
                .select("id")
                .eq("map_id", currentMap.id);

            if (existingIds) {
                const currentIds = new Set(tables.map(t => t.id));
                const idsToDelete = existingIds
                    .map((row: any) => row.id)
                    .filter((id: any) => !currentIds.has(id));

                if (idsToDelete.length > 0) {
                    await supabase
                        .from("seating_tables")
                        .delete()
                        .in("id", idsToDelete);
                }
            }

            toast.success("Map saved successfully!");
        } catch (error) {
            console.error("Error saving map:", error);
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const addTable = (shape: "rect" | "circle") => {
        // Calculate center of current view
        // View center = (-position / scale) + (screen_center / scale)
        const stage = stageRef.current;
        let x = 100;
        let y = 100;

        if (stage) {
            // Put it roughly in center of view
            x = (-stage.x() + stage.width() / 2) / stage.scaleX();
            y = (-stage.y() + stage.height() / 2) / stage.scaleY();
        }

        const newTable: TableConfig = {
            id: uuidv4(),
            label: `T${tables.length + 1}`,
            shape,
            x: x - 50,
            y: y - 50,
            width: shape === "circle" ? 80 : 100,
            height: 80,
            rotation: 0,
            capacity: 4,
            is_active: true
        };
        setTables([...tables, newTable]);
        selectTable(newTable.id);
    };

    const updateTable = (id: string, attrs: Partial<TableConfig>) => {
        setTables(tables.map(t => t.id === id ? { ...t, ...attrs } : t));
    };

    const deleteSelected = () => {
        if (selectedId) {
            setTables(tables.filter(t => t.id !== selectedId));
            selectTable(null);
        }
    };

    const handleWheel = (e: any) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const scaleBy = 1.1;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();

        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

        stage.scale({ x: newScale, y: newScale });

        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };
        stage.position(newPos);
        setScale(newScale);
        setPosition(newPos);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen bg-slate-950"><Loader2 className="animate-spin text-orange-500" /></div>;
    }

    const selectedTable = tables.find(t => t.id === selectedId);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-950">
            {/* Top Bar: Section Management */}
            <div className="bg-slate-900 border-b border-slate-800 p-3 flex items-center gap-4 z-20">
                <button onClick={() => router.push('/dashboard/seating')} className="p-2 hover:bg-slate-800 rounded-lg">
                    <ArrowLeft className="h-5 w-5 text-slate-400" />
                </button>

                <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Section:</span>
                    {!isEditingMapName ? (
                        <div className="flex items-center gap-2">
                            <select
                                value={currentMap?.id || ""}
                                onChange={(e) => {
                                    const m = maps.find(m => m.id === e.target.value);
                                    if (m) setCurrentMap(m);
                                }}
                                className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 focus:border-orange-500 outline-none"
                            >
                                {maps.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                            <button onClick={() => {
                                setNewMapName(currentMap?.name || "");
                                setIsEditingMapName(true);
                            }} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => setIsCreatingMap(true)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={newMapName}
                                onChange={e => setNewMapName(e.target.value)}
                                className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 w-40"
                                placeholder="Section Name"
                            />
                            <button onClick={handleUpdateMapName} className="text-xs bg-orange-500 text-white px-2 py-1.5 rounded">Save</button>
                            <button onClick={() => setIsEditingMapName(false)} className="text-xs text-slate-400 px-2">Cancel</button>
                        </div>
                    )}
                </div>

                {isCreatingMap && (
                    <div className="flex items-center gap-2 ml-4 border-l border-slate-800 pl-4 animate-in fade-in slide-in-from-left-4">
                        <span className="text-sm text-slate-400">New Section:</span>
                        <input
                            autoFocus
                            value={newMapName}
                            onChange={e => setNewMapName(e.target.value)}
                            className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 w-40 text-sm"
                            placeholder="e.g. Patio"
                        />
                        <button onClick={handleCreateMap} className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded">Create</button>
                        <button onClick={() => { setIsCreatingMap(false); setNewMapName(""); }} className="text-xs text-slate-400 px-2">Cancel</button>
                    </div>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Toolbar */}
                <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-4 z-10 overflow-y-auto">
                    <h1 className="font-bold text-lg">Editor Tools</h1>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Add Table</label>
                        <button
                            onClick={() => addTable("rect")}
                            className="w-full flex items-center gap-3 p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
                        >
                            <div className="w-6 h-6 border-2 border-slate-400 rounded bg-slate-600"></div>
                            <span>Square / Rect</span>
                        </button>
                        <button
                            onClick={() => addTable("circle")}
                            className="w-full flex items-center gap-3 p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
                        >
                            <div className="w-6 h-6 border-2 border-slate-400 rounded-full bg-slate-600"></div>
                            <span>Round / Circle</span>
                        </button>
                    </div>

                    {selectedTable && (
                        <div className="mt-8 space-y-4 border-t border-slate-800 pt-4">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Properties</label>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Label</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none"
                                    value={selectedTable.label}
                                    onChange={(e) => updateTable(selectedTable.id, { label: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Capacity</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none"
                                    value={selectedTable.capacity}
                                    onChange={(e) => updateTable(selectedTable.id, { capacity: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <button
                                onClick={deleteSelected}
                                className="w-full flex items-center justify-center gap-2 p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors mt-4"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete Table
                            </button>
                        </div>
                    )}

                    <div className="mt-auto pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Map
                        </button>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] bg-slate-950 overflow-hidden">
                    <div className="absolute top-4 right-4 z-10 flex gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <div className="text-xs text-slate-400 px-2 flex items-center gap-2">
                            <MousePointer2 className="h-4 w-4" /> Pan: Drag Empty Space
                            <span className="mx-2">•</span>
                            <ZoomIn className="h-4 w-4" /> Zoom: Scroll Wheel
                        </div>
                    </div>

                    <ResponsiveStage>
                        <Stage
                            ref={stageRef}
                            width={window.innerWidth - 256} // Approximate, ResponsiveStage handles it mostly but initial prop needed
                            height={window.innerHeight - 64}
                            draggable
                            onWheel={handleWheel}
                            onDragEnd={(e) => {
                                // Update position state only if it was the stage that was dragged
                                if (e.target === e.currentTarget) {
                                    setPosition({ x: e.target.x(), y: e.target.y() });
                                }
                            }}
                            // Only allow stage drag if not clicking on shape
                            onMouseDown={(e) => {
                                // If clicking empty stage
                                if (e.target === e.target.getStage()) {
                                    const stage = e.target.getStage();
                                    stage?.draggable(true);
                                    selectTable(null); // Deselect when clicking background
                                }
                            }}
                        >
                            <Layer>
                                <Group>
                                    {tables.map((table) => (
                                        <TableGroup
                                            key={table.id}
                                            table={table}
                                            isSelected={selectedId === table.id}
                                            onSelect={() => {
                                                selectTable(table.id);
                                                // Disable stage drag when selecting table
                                                if (stageRef.current) {
                                                    stageRef.current.draggable(false);
                                                }
                                            }}
                                            onChange={(newAttrs) => updateTable(table.id, newAttrs)}
                                        />
                                    ))}
                                </Group>
                            </Layer>
                        </Stage>
                    </ResponsiveStage>
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

// Add explicit types to fix TS errors
const TableGroup = ({ table, isSelected, onSelect, onChange }: {
    table: TableConfig,
    isSelected: boolean,
    onSelect: () => void,
    onChange: (attrs: Partial<TableConfig>) => void
}) => {
    const groupRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    useEffect(() => {
        if (isSelected && trRef.current && groupRef.current) {
            trRef.current.nodes([groupRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <Group
                ref={groupRef}
                x={table.x}
                y={table.y}
                width={table.width}
                height={table.height}
                rotation={table.rotation}
                draggable
                onClick={(e) => {
                    e.cancelBubble = true;
                    onSelect();
                }}
                onTap={(e) => {
                    e.cancelBubble = true;
                    onSelect();
                }}
                onDragEnd={(e) => {
                    onChange({
                        x: e.target.x(),
                        y: e.target.y(),
                        rotation: e.target.rotation(),
                    });
                }}
                onMouseEnter={() => {
                    const stage = groupRef.current?.getStage();
                    if (stage) stage.container().style.cursor = 'move';
                }}
                onMouseLeave={() => {
                    const stage = groupRef.current?.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                }}
            >
                {table.shape === "rect" ? (
                    <Rect
                        width={table.width}
                        height={table.height}
                        fill={isSelected ? "#f97316" : "#334155"}
                        stroke="#1e293b"
                        strokeWidth={1}
                        cornerRadius={8}
                        shadowColor="black"
                        shadowBlur={5}
                        shadowOpacity={0.3}
                    />
                ) : (
                    <Circle
                        // Center is at w/2, h/2 relative to Group 0,0
                        x={table.width / 2}
                        y={table.height / 2}
                        radius={table.width / 2}
                        fill={isSelected ? "#f97316" : "#334155"}
                        stroke="#1e293b"
                        strokeWidth={1}
                        shadowColor="black"
                        shadowBlur={5}
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
                    listening={false} // Let clicks pass to Group
                />
            </Group>
            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 30 || newBox.height < 30) return oldBox;
                        return newBox;
                    }}
                    onTransformEnd={() => {
                        const node = groupRef.current;
                        const scaleX = node.scaleX();
                        const scaleY = node.scaleY();

                        // Reset scale and apply to width/height
                        node.scaleX(1);
                        node.scaleY(1);

                        onChange({
                            x: node.x(),
                            y: node.y(),
                            // We must apply the scale to the table dimensions
                            width: Math.max(5, node.width() * scaleX),
                            height: Math.max(5, node.height() * scaleY),
                            rotation: node.rotation()
                        });
                    }}
                />
            )}
        </>
    );
};
