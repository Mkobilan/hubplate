"use client";

import { useState, useEffect } from "react";
import { Monitor, Smartphone, Check, X } from "lucide-react";
import { useAppStore } from "@/stores";
import { cn } from "@/lib/utils";

export function TerminalSetupPrompt() {
    const isTerminalMode = useAppStore((state) => state.isTerminalMode);
    const setTerminalMode = useAppStore((state) => state.setTerminalMode);
    const setTerminalLocked = useAppStore((state) => state.setTerminalLocked);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const isOrgOwner = useAppStore((state) => state.isOrgOwner);

    const [isVisible, setIsVisible] = useState(false);

    // Only show if terminal mode is NOT yet set and user is manager/owner
    useEffect(() => {
        const hasPrompted = localStorage.getItem("hubplate-terminal-prompted");
        const isManager = currentEmployee?.role === 'manager' || currentEmployee?.role === 'owner' || isOrgOwner;

        if (!isTerminalMode && isManager && !hasPrompted) {
            setIsVisible(true);
        }
    }, [isTerminalMode, currentEmployee, isOrgOwner]);

    const handleSelect = (terminal: boolean) => {
        setTerminalMode(terminal);
        if (terminal) {
            setTerminalLocked(true);
        }
        localStorage.setItem("hubplate-terminal-prompted", "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />

            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/20 mb-6">
                        <Monitor className="w-10 h-10 text-orange-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Setup Device</h2>
                    <p className="text-slate-400 text-lg">Is this a permanent terminal or POS station?</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <button
                        onClick={() => handleSelect(true)}
                        className="group relative flex flex-col items-center gap-4 p-8 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/50 rounded-3xl transition-all duration-300 transform hover:scale-105"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Monitor className="w-8 h-8 text-orange-400" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-white text-xl">Yes, Terminal</p>
                            <p className="text-sm text-orange-400/70 mt-1">Stays logged in with screensaver</p>
                        </div>
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Check className="w-6 h-6 text-orange-500" />
                        </div>
                    </button>

                    <button
                        onClick={() => handleSelect(false)}
                        className="group relative flex flex-col items-center gap-4 p-8 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-3xl transition-all duration-300 transform hover:scale-105"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Smartphone className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-white text-xl">No, Personal</p>
                            <p className="text-sm text-slate-500 mt-1">Normal dashboard access</p>
                        </div>
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-6 h-6 text-slate-500" />
                        </div>
                    </button>
                </div>

                <p className="text-center text-slate-500 text-sm mt-10">
                    This can be changed later in the device settings.
                </p>
            </div>
        </div>
    );
}
