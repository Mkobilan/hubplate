"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface TerminalScreensaverProps {
    onUnlock: () => void;
}

export function TerminalScreensaver({ onUnlock }: TerminalScreensaverProps) {
    const { t } = useTranslation();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div
            className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
            onClick={onUnlock}
        >
            {/* Pulsing Background Glow */}
            <div className="absolute inset-0 overflow-hidden opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/30 rounded-full blur-[120px] animate-pulse" />
            </div>

            <div className="relative flex flex-col items-center gap-12 text-center">
                <div className="relative w-64 h-64 md:w-80 md:h-80 animate-in zoom-in-95 duration-1000">
                    <div className="absolute inset-0 bg-orange-500/20 rounded-[60px] blur-3xl animate-pulse" />
                    <Image
                        src="/terminal-logo.png"
                        alt="Hubplate"
                        fill
                        className="object-contain relative z-10 drop-shadow-2xl"
                        priority
                    />
                </div>

                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-400 font-medium">
                        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="mt-12 animate-bounce">
                    <p className="text-orange-500 font-bold tracking-[0.2em] uppercase text-sm">
                        Tap To Access Terminal
                    </p>
                </div>
            </div>

            {/* Floating particles effect */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/10 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDuration: `${10 + Math.random() * 20}s`,
                            animationDelay: `${Math.random() * 10}s`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
