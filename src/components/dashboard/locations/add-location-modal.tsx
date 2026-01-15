"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Building2, MapPin, Phone, Mail, Copy } from "lucide-react";

interface AddLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddLocationModal({ isOpen, onClose, onSuccess }: AddLocationModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phone: "",
        email: "",
        copyFromLocationId: "",
        copyMenu: true,
        copyRecipes: false,
        copyInventory: false,
    });

    useEffect(() => {
        if (isOpen) {
            const fetchLocations = async () => {
                const supabase = createClient();
                const { data } = await supabase.from("locations").select("id, name");
                setLocations(data || []);
            };
            fetchLocations();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();

            // Get current user for owner_id
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            if (!user) throw new Error("No authenticated user found");

            // Get organization for owner
            const { data: orgData, error: orgError } = await (supabase
                .from("organizations") as any)
                .select("id")
                .eq("owner_id", user.id)
                .single();

            if (orgError) throw new Error("Could not find your organization. Please try logging out and in again.");

            // Insert location
            const { data: newLocation, error: insertError } = await supabase
                .from("locations")
                .insert([
                    {
                        name: formData.name,
                        address: formData.address,
                        phone: formData.phone,
                        email: formData.email,
                        owner_id: user.id,
                        organization_id: orgData.id,
                        is_active: true,
                    },
                ] as any)
                .select()
                .single();

            if (insertError) throw insertError;

            // Trigger data clone if selected
            if (formData.copyFromLocationId && newLocation) {
                const { error: rpcError } = await (supabase.rpc as any)("clone_location_data", {
                    src_location_id: formData.copyFromLocationId,
                    dest_location_id: (newLocation as any).id,
                    p_copy_menu: formData.copyMenu,
                    p_copy_recipes: formData.copyRecipes,
                    p_copy_inventory: formData.copyInventory,
                });

                if (rpcError) {
                    console.error("Error cloning location data:", rpcError);
                    // We don't throw here to avoid failing location creation, but maybe we should notify
                }
            }

            onSuccess();
            onClose();
            setFormData({
                name: "", address: "", phone: "", email: "", copyFromLocationId: "",
                copyMenu: true, copyRecipes: false, copyInventory: false
            });
        } catch (err) {
            console.error("Error adding location:", err);
            setError(err instanceof Error ? err.message : "Failed to add location");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Location"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="label" htmlFor="name">
                        Location Name *
                    </label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input
                            id="name"
                            type="text"
                            required
                            className="input pl-11"
                            placeholder="e.g. Downtown Grill"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="label" htmlFor="address">
                        Address
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input
                            id="address"
                            type="text"
                            className="input pl-11"
                            placeholder="123 Main St, City, State"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="label" htmlFor="phone">
                            Phone Number
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            <input
                                id="phone"
                                type="tel"
                                className="input pl-11"
                                placeholder="(555) 000-0000"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="label" htmlFor="email">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            <input
                                id="email"
                                type="email"
                                className="input pl-11"
                                placeholder="contact@location.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-800">
                    <div className="space-y-2">
                        <label className="label" htmlFor="copyFrom">
                            Copy Data from Existing Location (Optional)
                        </label>
                        <div className="relative">
                            <Copy className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            <select
                                id="copyFrom"
                                className="input pl-11 appearance-none"
                                value={formData.copyFromLocationId}
                                onChange={(e) => setFormData({ ...formData, copyFromLocationId: e.target.value })}
                            >
                                <option value="">Do not copy (start from scratch)</option>
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {formData.copyFromLocationId && (
                        <div className="p-4 bg-slate-900/50 rounded-xl space-y-3 border border-slate-800">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">What to copy?</p>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary"
                                    checked={formData.copyMenu}
                                    onChange={(e) => setFormData({ ...formData, copyMenu: e.target.checked })}
                                />
                                <div className="space-y-0.5">
                                    <span className="text-sm font-medium group-hover:text-white transition-colors">Menu Structure</span>
                                    <p className="text-[10px] text-slate-500">Categories, items, and add-ons</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary"
                                    checked={formData.copyRecipes}
                                    onChange={(e) => setFormData({ ...formData, copyRecipes: e.target.checked })}
                                />
                                <div className="space-y-0.5">
                                    <span className="text-sm font-medium group-hover:text-white transition-colors">Recipes</span>
                                    <p className="text-[10px] text-slate-500">Preparation steps and ingredient links</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary"
                                    checked={formData.copyInventory}
                                    onChange={(e) => setFormData({ ...formData, copyInventory: e.target.checked })}
                                />
                                <div className="space-y-0.5">
                                    <span className="text-sm font-medium group-hover:text-white transition-colors">Inventory Items</span>
                                    <p className="text-[10px] text-slate-500">Stock items and storage areas</p>
                                </div>
                            </label>

                            {(formData.copyRecipes && (!formData.copyMenu || !formData.copyInventory)) && (
                                <p className="text-[10px] text-orange-400 bg-orange-400/5 p-2 rounded border border-orange-400/20">
                                    Note: Recipes rely on Menu and Inventory. It is recommended to copy all three for best results.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-4 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary flex-1"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary flex-1"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            "Add Location"
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
