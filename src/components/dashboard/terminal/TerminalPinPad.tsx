"use client";

import { useState, useEffect } from "react";
import { X, Delete, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";

interface TerminalPinPadProps {
    onClose: () => void;
    onSuccess: (employee: any) => void;
}

export function TerminalPinPad({ onClose, onSuccess }: TerminalPinPadProps) {
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const currentLocation = useAppStore((state) => state.currentLocation);
    const supabase = createClient();

    const handleInput = (val: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + val);
            setError(null);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError(null);
    };

    useEffect(() => {
        // Remove auto-verify on length change
    }, [pin]);

    const verifyPin = async () => {
        if (!currentLocation) return;
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from("employees")
                .select("*")
                .eq("location_id", currentLocation.id)
                .eq("pin_code", pin)
                .eq("is_active", true)
                .single();

            if (fetchError || !data) {
                // If 4 digits failed, dont immediately error if we might be typing 6
                if (pin.length === 4) {
                    // Start a tiny timeout to see if they keep typing
                    const timer = setTimeout(() => {
                        if (pin.length === 4) {
                            setError("Invalid PIN. Please try again.");
                            setPin("");
                        }
                    }, 500);
                    setLoading(false);
                    return;
                }
                setError("Invalid PIN. Please try again.");
                setPin("");
                setLoading(false);
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess(data);
            }, 500);
        } catch (err) {
            console.error("PIN verification error:", err);
            setError("Authentication failed.");
            setPin("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-white mb-2">Terminal Login</h2>
                    <p className="text-slate-400 text-sm">Enter your 4 or 6-digit PIN</p>
                </div>

                {/* PIN Visualization */}
                <div className="flex justify-center gap-4 mb-10">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-4 h-4 rounded-full border-2 border-slate-700 transition-all duration-200",
                                pin.length > i ? "bg-orange-500 border-orange-500 scale-125 shadow-[0_0_15px_rgba(249,115,22,0.5)]" : "bg-transparent"
                            )}
                        />
                    ))}
                </div>

                {/* Feedback */}
                <div className="h-12 flex items-center justify-center mb-6">
                    {loading && <Loader2 className="w-6 h-6 animate-spin text-orange-500" />}
                    {error && (
                        <div className="flex items-center gap-2 text-red-500 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 text-green-500 animate-in fade-in zoom-in">
                            <CheckCircle2 className="w-6 h-6" />
                            <span className="text-sm font-bold">Access Granted</span>
                        </div>
                    )}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleInput(num.toString())}
                            disabled={loading || success}
                            className="w-full aspect-square rounded-full bg-slate-800 hover:bg-slate-700 active:bg-orange-500/20 text-2xl font-bold transition-all disabled:opacity-50"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={handleDelete}
                        disabled={loading || success}
                        className="w-full aspect-square rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                    >
                        <Delete className="w-8 h-8" />
                    </button>
                    <button
                        onClick={() => handleInput("0")}
                        disabled={loading || success}
                        className="w-full aspect-square rounded-full bg-slate-800 hover:bg-slate-700 active:bg-orange-500/20 text-2xl font-bold transition-all disabled:opacity-50"
                    >
                        0
                    </button>
                    <button
                        onClick={verifyPin}
                        disabled={loading || success || (pin.length !== 4 && pin.length !== 6)}
                        className="w-full aspect-square rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-xl font-bold transition-all disabled:bg-slate-800 disabled:text-slate-600"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
