"use client";

import { useState, useEffect } from "react";
import {
    X,
    ChevronRight,
    Save,
    Loader2,
    Search,
    AlertCircle,
    ArrowLeft
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";

interface TakeInventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    storageAreas: any[];
}

export default function TakeInventoryModal({ isOpen, onClose, locationId, storageAreas }: TakeInventoryModalProps) {
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const [step, setStep] = useState<'area' | 'counts' | 'confirm'>('area');
    const [selectedArea, setSelectedArea] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [counts, setCounts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (isOpen) {
            setStep('area');
            setSelectedArea(null);
            setCounts({});
            setSearchQuery("");
        }
    }, [isOpen]);

    const fetchItemsInArea = async (areaId: string) => {
        setLoading(true);
        try {
            const supabase = createClient();
            let query = supabase.from("inventory_items").select("*").eq("location_id", locationId);

            if (areaId === 'none') {
                query = query.is("storage_area_id", null);
            } else {
                query = query.eq("storage_area_id", areaId);
            }

            const { data: finalData, error: finalError } = await query.order("name");

            if (finalError) throw finalError;
            setItems(finalData || []);
            setStep('counts');
        } catch (err: any) {
            toast.error("Failed to fetch items: " + err.message);
        } finally {
            setLoading(false);
        }
    };


    const handleSave = async () => {
        setSaving(true);
        try {
            const supabase = createClient();

            // Get current user for recorded_by attribution
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Create Session
            let recorderName = 'Staff Member';

            if (currentEmployee) {
                recorderName = `${currentEmployee.first_name} ${currentEmployee.last_name}`.trim();
            } else if (user) {
                // Try to find employee profile for this user ID if not in store
                const { data: emp } = await (supabase
                    .from("employees") as any)
                    .select("first_name, last_name")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (emp) {
                    recorderName = `${emp.first_name} ${emp.last_name}`.trim();
                } else if (user.user_metadata?.full_name) {
                    recorderName = user.user_metadata.full_name;
                }
            }

            const { data: session, error: sessionError } = await (supabase
                .from("physical_inventory_sessions") as any)
                .insert({
                    location_id: locationId,
                    storage_area_id: selectedArea?.id === 'none' ? null : selectedArea?.id,
                    recorded_by: user?.id || null, // Must be an auth.users ID
                    recorded_by_name: recorderName,
                    status: 'completed'
                })
                .select()
                .single();

            if (sessionError) throw sessionError;


            // 2. Prepare Counts
            const countsToInsert = items.map(item => {
                const recordedQty = parseFloat(counts[item.id] || "0");
                const theoreticalQty = parseFloat(item.running_stock || "0");

                // Calculate conversion
                let multiplier = Number(item.units_per_stock || 1);
                let conversion = 1;
                const combinedUnit = (item.unit || '').toLowerCase();
                const recipeUnit = (item.recipe_unit || '').toLowerCase();

                if (combinedUnit.includes('lb') && recipeUnit.includes('oz')) conversion = 16;
                else if (combinedUnit.includes('gal') && recipeUnit.includes('oz')) conversion = 128;

                const fullConversion = multiplier * conversion;
                const recordedAtomic = recordedQty * fullConversion;

                return {
                    session_id: session.id,
                    inventory_item_id: item.id,
                    recorded_quantity: recordedQty,
                    theoretical_quantity: theoreticalQty,
                    conversion_at_recording: fullConversion,
                    variance_atomic: recordedAtomic - theoreticalQty
                };
            });

            // 3. Batch Insert Counts
            const { error: countsError } = await (supabase
                .from("physical_inventory_counts") as any)
                .insert(countsToInsert);

            if (countsError) throw countsError;

            toast.success("Inventory recorded successfully!");
            onClose();
        } catch (err: any) {
            toast.error("Failed to save: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        {step !== 'area' && (
                            <button
                                onClick={() => setStep('area')}
                                className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold">Take Inventory</h2>
                            <p className="text-sm text-slate-400">
                                {step === 'area' ? "Select a storage area to begin" : `Recording for ${selectedArea?.name || "Unassigned Items"}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
                    {step === 'area' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <button
                                onClick={() => {
                                    setSelectedArea({ id: 'none', name: 'Unassigned Items' });
                                    fetchItemsInArea('none');
                                }}
                                className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left flex flex-col justify-between group"
                            >
                                <div className="space-y-1">
                                    <h4 className="font-bold text-lg group-hover:text-orange-500 transition-colors">No Area assigned</h4>
                                    <p className="text-xs text-slate-400">Items without a storage area</p>
                                </div>
                                <div className="mt-4 flex items-center text-xs font-bold text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    SELECT <ChevronRight size={14} />
                                </div>
                            </button>
                            {storageAreas.map(area => (
                                <button
                                    key={area.id}
                                    onClick={() => {
                                        setSelectedArea(area);
                                        fetchItemsInArea(area.id);
                                    }}
                                    className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left flex flex-col justify-between group"
                                >
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-lg group-hover:text-orange-500 transition-colors">{area.name}</h4>
                                        <p className="text-xs text-slate-400">Review items in this area</p>
                                    </div>
                                    <div className="mt-4 flex items-center text-xs font-bold text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        SELECT <ChevronRight size={14} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 'counts' && (
                        <div className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search items in this area..."
                                    className="input !pl-10 !bg-slate-800/50 box-border w-full"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                {filteredItems.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">
                                        <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-20" />
                                        <p>No items found in this area.</p>
                                    </div>
                                ) : (
                                    filteredItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:bg-slate-800 transition-colors gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold truncate">{item.name}</h4>
                                                <div className="flex gap-3 mt-1">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.category}</span>
                                                    <span className="text-[10px] font-bold text-orange-500/70 border border-orange-500/20 px-1.5 rounded uppercase">{item.unit || 'Units'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right mr-2 hidden sm:block">
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Theoretical</p>
                                                    <p className="text-sm font-mono text-slate-300">
                                                        {(item.running_stock / (Number(item.units_per_stock || 1) * (item.unit?.toLowerCase().includes('lb') ? 16 : item.unit?.toLowerCase().includes('gal') ? 128 : 1))).toFixed(2)} {item.unit}
                                                    </p>
                                                </div>
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="input !py-2 !px-3 text-center w-24 sm:w-32 !bg-slate-900 focus:!ring-orange-500"
                                                    value={counts[item.id] || ""}
                                                    onChange={(e) => setCounts({ ...counts, [item.id]: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'counts' && filteredItems.length > 0 && (
                    <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between gap-4">
                        <div className="text-sm text-slate-400">
                            <strong>{Object.keys(counts).length}</strong> of <strong>{items.length}</strong> items counted
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn btn-primary px-8"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Inventory
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
