"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface AddWaitlistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AddWaitlistModal({ isOpen, onClose, onSuccess }: AddWaitlistModalProps) {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        customer_name: "",
        customer_phone: "",
        party_size: "2",
        estimated_wait_minutes: "15",
        notes: "",
        customer_email: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLocation?.id) return;

        setLoading(true);
        try {
            const supabase = createClient();
            const { error } = await (supabase.from("waitlist") as any).insert({
                location_id: currentLocation.id,
                customer_name: formData.customer_name,
                customer_phone: formData.customer_phone,
                party_size: parseInt(formData.party_size),
                estimated_wait_minutes: parseInt(formData.estimated_wait_minutes),
                notes: formData.notes,
                customer_email: formData.customer_email,
                status: 'waiting'
            });

            if (error) throw error;

            toast.success(t("waitlist.addedSuccess") || "Added to waitlist");
            onSuccess?.();
            onClose();
            setFormData({
                customer_name: "",
                customer_phone: "",
                party_size: "2",
                estimated_wait_minutes: "15",
                notes: "",
                customer_email: ""
            });
        } catch (err: any) {
            console.error("Error adding to waitlist:", err);
            toast.error(err.message || "Failed to add to waitlist");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("waitlist.addCustomer")}>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">{t("waitlist.name")}</label>
                    <input
                        required
                        type="text"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        placeholder="John Doe"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">{t("waitlist.phone")}</label>
                        <input
                            type="tel"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={formData.customer_phone}
                            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                            placeholder="(555) 000-0000"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">{t("waitlist.partySize")}</label>
                        <input
                            required
                            type="number"
                            min="1"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={formData.party_size}
                            onChange={(e) => setFormData({ ...formData, party_size: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">{t("waitlist.estimatedWait")}</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={formData.estimated_wait_minutes}
                        onChange={(e) => setFormData({ ...formData, estimated_wait_minutes: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">{t("waitlist.notes")}</label>
                    <textarea
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[80px]"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Email (Optional)</label>
                    <input
                        type="email"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={formData.customer_email}
                        onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                        placeholder="john@example.com"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t("waitlist.addCustomer")}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
