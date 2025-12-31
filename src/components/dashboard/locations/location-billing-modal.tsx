"use client";

import { CreditCard, Check, Loader2, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Modal } from "@/components/ui/modal";

interface LocationBillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationName: string;
    locationId: string;
    orgId: string;
}

export function LocationBillingModal({ isOpen, onClose, locationName, locationId, orgId }: LocationBillingModalProps) {
    const [loading, setLoading] = useState(false);

    const handleActivate = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/stripe/add-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId,
                    orgId
                }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "Failed to initiate payment");
            }
        } catch (error: any) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Activate New Location"
        >
            <div className="space-y-6 py-2">
                <div className="text-center">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="h-8 w-8 text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-bold">{locationName}</h3>
                    <p className="text-slate-400 mt-2">
                        Ready to expand? Activate this location to start taking orders.
                    </p>
                </div>

                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-400">Subscription Upgrade</span>
                        <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            Professional
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-bold">$99</span>
                        <span className="text-slate-400">/mo</span>
                    </div>

                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-sm text-slate-300">
                            <Check className="h-4 w-4 text-green-500" />
                            Full access to all POS features
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-300">
                            <Check className="h-4 w-4 text-green-500" />
                            Unlimited staff & menu items
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-300">
                            <Check className="h-4 w-4 text-green-500" />
                            Sync with your existing menu
                        </li>
                    </ul>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleActivate}
                        disabled={loading}
                        className="btn btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-orange-500/20"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Activate Location
                            </span>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary w-full"
                    >
                        Maybe Later
                    </button>
                </div>

                <p className="text-center text-[10px] text-slate-500 px-4">
                    Expansion charges are billed monthly. You can cancel or deactivate locations anytime from your organization settings.
                </p>
            </div>
        </Modal>
    );
}
