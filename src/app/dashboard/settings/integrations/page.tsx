"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Puzzle,
    Check,
    X,
    ExternalLink,
    Settings,
    RefreshCw,
    AlertCircle,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types for Supabase integration
interface IntegrationType {
    id: string;
    name: string;
    description: string;
    category: string;
    logo: string;
    connected: boolean;
    popular: boolean;
    lastSync?: string;
}

// TODO: Replace with Supabase queries
const integrations: IntegrationType[] = [];
const categories = ["All", "POS", "Delivery", "Reservations", "Accounting", "HR & Payroll", "Marketing", "Reviews"];

export default function IntegrationsPage() {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [showConnectModal, setShowConnectModal] = useState<string | null>(null);

    const filteredIntegrations = integrations.filter(
        i => selectedCategory === "All" || i.category === selectedCategory
    );

    const connectedCount = integrations.filter(i => i.connected).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Puzzle className="h-8 w-8 text-orange-500" />
                        Integrations
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Connect HubPlate with your favorite tools and services
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">
                        <span className="text-green-400 font-bold">{connectedCount}</span> of {integrations.length} connected
                    </span>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                            selectedCategory === cat
                                ? "bg-orange-500 text-white"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                        )}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Integrations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIntegrations.map((integration) => (
                    <div
                        key={integration.id}
                        className={cn(
                            "card transition-all",
                            integration.connected && "border-green-500/30"
                        )}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{integration.logo}</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold">{integration.name}</h3>
                                        {integration.popular && (
                                            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                                                Popular
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">{integration.category}</p>
                                </div>
                            </div>
                            {integration.connected && (
                                <div className="flex items-center gap-1 text-green-400">
                                    <Check className="h-4 w-4" />
                                    <span className="text-xs font-medium">Connected</span>
                                </div>
                            )}
                        </div>

                        <p className="text-sm text-slate-400 mb-4">{integration.description}</p>

                        {integration.connected ? (
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    Last sync: {integration.lastSync}
                                </span>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                                        <RefreshCw className="h-4 w-4" />
                                    </button>
                                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                                        <Settings className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowConnectModal(integration.id)}
                                className="btn btn-secondary w-full text-sm"
                            >
                                Connect
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Request Integration */}
            <div className="card border-dashed border-slate-700 text-center py-8">
                <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <h3 className="font-bold mb-2">Need a different integration?</h3>
                <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
                    We&apos;re constantly adding new integrations. Let us know what you need!
                </p>
                <button className="btn btn-secondary">
                    Request Integration
                </button>
            </div>

            {/* Connect Modal */}
            {showConnectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowConnectModal(null)} />
                    <div className="relative card w-full max-w-md text-center">
                        <button
                            onClick={() => setShowConnectModal(null)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        {(() => {
                            const integration = integrations.find(i => i.id === showConnectModal);
                            return integration ? (
                                <>
                                    <span className="text-5xl mb-4 block">{integration.logo}</span>
                                    <h2 className="text-2xl font-bold mb-2">Connect {integration.name}</h2>
                                    <p className="text-slate-400 mb-6">{integration.description}</p>
                                    <button className="btn btn-primary w-full py-3">
                                        <ExternalLink className="h-4 w-4" />
                                        Authorize {integration.name}
                                    </button>
                                    <p className="text-xs text-slate-500 mt-4">
                                        You&apos;ll be redirected to {integration.name} to authorize the connection.
                                    </p>
                                </>
                            ) : null;
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
