"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    Clock,
    LogIn,
    LogOut,
    Grid3X3,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ClockInOut() {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [isClockedIn, setIsClockedIn] = useState(false); // Mock state

    const handlePinInput = (num: string) => {
        if (pin.length < 4) setPin(prev => prev + num);
    };

    const clearPin = () => setPin("");

    const handleSubmit = async () => {
        if (pin.length !== 4) return;

        setLoading(true);
        setStatus("idle");

        // Mock API call
        setTimeout(() => {
            setLoading(false);
            if (pin === "1234") { // Mock PIN
                setStatus("success");
                setIsClockedIn(!isClockedIn);
                setMessage(!isClockedIn ? "Clocked in successfully!" : "Clocked out successfully!");
                setPin("");
                setTimeout(() => {
                    setShowModal(false);
                    setStatus("idle");
                }, 2000);
            } else {
                setStatus("error");
                setMessage("Invalid PIN. Please try again.");
                setPin("");
            }
        }, 1000);
    };

    useEffect(() => {
        if (pin.length === 4) {
            handleSubmit();
        }
    }, [pin]);

    return (
        <>
            {/* Floating Button / Sidebar Item */}
            <button
                onClick={() => setShowModal(true)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300",
                    isClockedIn
                        ? "bg-green-500/10 border-green-500/50 text-green-400"
                        : "bg-orange-500/10 border-orange-500/50 text-orange-400"
                )}
            >
                <Clock className={cn("h-4 w-4", isClockedIn && "animate-pulse")} />
                <span className="text-sm font-bold">
                    {isClockedIn ? t("staff.clockOut") : t("staff.clockIn")}
                </span>
            </button>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-xs animate-slide-up shadow-2xl">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold mb-2">Staff Login</h2>
                            <p className="text-slate-400 text-sm">Enter your 4-digit PIN to clock {isClockedIn ? "out" : "in"}</p>
                        </div>

                        {/* PIN Display */}
                        <div className="flex justify-center gap-4 mb-8">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-4 h-4 rounded-full border-2 border-slate-700 transition-all",
                                        pin.length > i ? "bg-orange-500 border-orange-500 scale-110" : "bg-transparent"
                                    )}
                                />
                            ))}
                        </div>

                        {/* Status Message */}
                        {status !== "idle" && (
                            <div className={cn(
                                "mb-6 p-3 rounded-xl flex items-center gap-2 text-sm justify-center animate-pulse",
                                status === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                            )}>
                                {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                {message}
                            </div>
                        )}

                        {/* Keypad */}
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handlePinInput(num.toString())}
                                    disabled={loading}
                                    className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold hover:bg-slate-700 active:bg-orange-500/20 transition-colors disabled:opacity-50"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={clearPin}
                                disabled={loading}
                                className="w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold text-slate-500 hover:text-slate-100"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => handlePinInput("0")}
                                disabled={loading}
                                className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold hover:bg-slate-700 active:bg-orange-500/20 transition-colors disabled:opacity-50"
                            >
                                0
                            </button>
                            <div />
                        </div>

                        {loading && (
                            <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center rounded-3xl">
                                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
