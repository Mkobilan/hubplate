"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { cn } from "@/lib/utils";

export default function AssignToKdsModal({
    itemIds,
    onClose,
    onSuccess
}: {
    itemIds: string[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [kdsScreens, setKdsScreens] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
    const [selectedKdsScreens, setSelectedKdsScreens] = useState<string[]>([]);
    const [loadingScreens, setLoadingScreens] = useState(true);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    useEffect(() => {
        const fetchKdsScreens = async () => {
            if (!currentLocation?.id) return;
            try {
                const { data } = await supabase
                    .from("kds_screens")
                    .select("id, name, is_default")
                    .eq("location_id", currentLocation.id)
                    .eq("is_active", true)
                    .order("display_order");
                setKdsScreens(data || []);
            } catch (error) {
                console.error("Error fetching KDS screens:", error);
                toast.error("Failed to load KDS screens");
            } finally {
                setLoadingScreens(false);
            }
        };
        fetchKdsScreens();
    }, [currentLocation?.id]);

    const handleKdsToggle = (screenId: string) => {
        setSelectedKdsScreens(prev =>
            prev.includes(screenId)
                ? prev.filter(id => id !== screenId)
                : [...prev, screenId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // First delete existing assignments for these items
            const { error: deleteError } = await supabase
                .from("menu_item_kds_assignments")
                .delete()
                .in("menu_item_id", itemIds);

            if (deleteError) throw deleteError;

            // Then insert new assignments
            if (selectedKdsScreens.length > 0) {
                const assignments = itemIds.flatMap(itemId =>
                    selectedKdsScreens.map(screenId => ({
                        menu_item_id: itemId,
                        kds_screen_id: screenId
                    }))
                );

                const { error: insertError } = await supabase
                    .from("menu_item_kds_assignments")
                    .insert(assignments);

                if (insertError) throw insertError;
            }

            toast.success(`Updated KDS assignments for ${itemIds.length} items`);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error updating KDS assignments:", error);
            toast.error("Failed to update assignments");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative card w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Map to KDS</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <p className="text-sm text-slate-400 mb-4">
                            Select which KDS screens should display the selected <strong>{itemIds.length} items</strong>.
                            <br />
                            <span className="text-orange-400 text-xs">
                                Note: This will overwrite any existing KDS assignments for these items.
                            </span>
                        </p>

                        {loadingScreens ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                            </div>
                        ) : kdsScreens.length === 0 ? (
                            <div className="p-4 bg-slate-800 rounded-lg text-center text-slate-400">
                                No KDS screens found.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {kdsScreens.map((screen) => (
                                    <label
                                        key={screen.id}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                            selectedKdsScreens.includes(screen.id)
                                                ? "border-orange-500 bg-orange-500/10"
                                                : "border-slate-700 hover:border-slate-600"
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedKdsScreens.includes(screen.id)}
                                            onChange={() => handleKdsToggle(screen.id)}
                                            className="w-4 h-4 accent-orange-500"
                                        />
                                        <span className="flex-1 font-medium">{screen.name}</span>
                                        {screen.is_default && (
                                            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                                                Default
                                            </span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || loadingScreens}
                            className="btn btn-primary flex-1"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Assignments"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
