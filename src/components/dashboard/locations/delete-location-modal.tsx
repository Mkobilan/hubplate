"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface DeleteLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    location: {
        id: string;
        name: string;
    };
}

export function DeleteLocationModal({ isOpen, onClose, onSuccess, location }: DeleteLocationModalProps) {
    const [loading, setLoading] = useState(false);
    const [confirmationName, setConfirmationName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const isMatch = confirmationName === location.name;

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isMatch) return;

        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();

            const { error: deleteError } = await supabase
                .from("locations")
                .delete()
                .eq("id", location.id);

            if (deleteError) throw deleteError;

            toast.success("Location deleted successfully");
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error deleting location:", err);
            setError(err instanceof Error ? err.message : "Failed to delete location");
            toast.error("Failed to delete location");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Location"
            className="border-red-500/20"
        >
            <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex gap-4">
                    <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
                    <div className="space-y-2">
                        <h3 className="font-semibold text-red-400">Warning: Permanent Data Loss</h3>
                        <p className="text-sm text-red-400/80 leading-relaxed">
                            This action cannot be undone. This will permanently delete
                            <span className="font-bold text-white mx-1">{location.name}</span>
                            and all associated data including:
                        </p>
                        <ul className="list-disc list-inside text-sm text-red-400/80 ml-2 space-y-1">
                            <li>Employee records and accounts</li>
                            <li>Menu items and modifiers</li>
                            <li>Order history and sales data</li>
                            <li>Settings and configurations</li>
                        </ul>
                        <p className="text-sm font-semibold text-red-400 mt-2">
                            Please ensure you have exported all necessary data before proceeding.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleDelete} className="space-y-4">
                    <div className="space-y-2">
                        <label className="label" htmlFor="confirmName">
                            Type <span className="font-bold text-white select-none">{location.name}</span> to confirm
                        </label>
                        <input
                            id="confirmName"
                            type="text"
                            value={confirmationName}
                            onChange={(e) => setConfirmationName(e.target.value)}
                            className="input border-red-500/30 focus:border-red-500 focus:ring-red-500/20"
                            placeholder={location.name}
                            autoComplete="off"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
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
                            disabled={!isMatch || loading}
                            className="btn bg-red-500 hover:bg-red-600 text-white flex-1 border-none disabled:bg-slate-800 disabled:text-slate-500"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Delete Location
                                </div>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
