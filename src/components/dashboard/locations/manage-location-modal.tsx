"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Building2, MapPin, Phone, Mail, Percent, Clock } from "lucide-react";
import { useAppStore } from "@/stores";

interface ManageLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    location: any;
}

export function ManageLocationModal({ isOpen, onClose, onSuccess, location }: ManageLocationModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const currentLocation = useAppStore(state => state.currentLocation);
    const setCurrentLocation = useAppStore(state => state.setCurrentLocation);
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phone: "",
        email: "",
        tax_rate: 0,
        timezone: "America/New_York",
    });

    useEffect(() => {
        if (location) {
            setFormData({
                name: location.name || "",
                address: location.address || "",
                phone: location.phone || "",
                email: location.email || "",
                tax_rate: location.tax_rate || 0,
                timezone: location.timezone || "America/New_York",
            });
        }
    }, [location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();

            const { error: updateError } = await (supabase
                .from("locations") as any)
                .update({
                    name: formData.name,
                    address: formData.address,
                    phone: formData.phone,
                    email: formData.email,
                    tax_rate: formData.tax_rate,
                    timezone: formData.timezone,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", location.id);

            if (updateError) throw updateError;

            // Update global store if this is the current location
            if (currentLocation?.id === location.id) {
                setCurrentLocation({
                    ...currentLocation,
                    ...formData,
                    updated_at: new Date().toISOString()
                } as any);
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error updating location:", err);
            setError(err instanceof Error ? err.message : "Failed to update location");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Manage Location"
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

                <div className="space-y-2">
                    <label className="label" htmlFor="tax_rate">
                        Sales Tax Rate (%)
                    </label>
                    <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input
                            id="tax_rate"
                            type="number"
                            step="0.01"
                            className="input pl-11"
                            placeholder="e.g. 8.75"
                            value={formData.tax_rate}
                            onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                    <p className="text-[10px] text-slate-500">
                        This rate will be used for all orders at this location.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="label" htmlFor="timezone">
                        Location Timezone
                    </label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <select
                            id="timezone"
                            className="input pl-11"
                            value={formData.timezone}
                            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        >
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Phoenix">Mountain Time - no DST (AZ)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="America/Anchorage">Alaska Time (AKT)</option>
                            <option value="America/Honolulu">Hawaii Time (HT)</option>
                            <option value="UTC">Coordinated Universal Time (UTC)</option>
                            <option value="Europe/London">London (GMT/BST)</option>
                            <option value="Africa/Nairobi">Nairobi (EAT)</option>
                            <option value="Asia/Dubai">Dubai (GST)</option>
                            <option value="Asia/Kolkata">India (IST)</option>
                            <option value="Asia/Singapore">Singapore (SGT)</option>
                            <option value="Australia/Sydney">Sydney (AET)</option>
                        </select>
                    </div>
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
                            "Update Location"
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
