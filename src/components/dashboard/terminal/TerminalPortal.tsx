"use client";

import { useAppStore } from "@/stores";
import { TerminalScreensaver } from "./TerminalScreensaver";
import { TerminalPinPad } from "./TerminalPinPad";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function TerminalPortal() {
    const isTerminalMode = useAppStore((state) => state.isTerminalMode);
    const isTerminalLocked = useAppStore((state) => state.isTerminalLocked);
    const setTerminalLocked = useAppStore((state) => state.setTerminalLocked);
    const setCurrentEmployee = useAppStore((state) => state.setCurrentEmployee);
    const refreshClockStatus = useAppStore((state) => state.refreshClockStatus);

    const [showPinPad, setShowPinPad] = useState(false);
    const supabase = createClient();

    // Prevent scrolling when terminal is active
    useEffect(() => {
        if (isTerminalMode && isTerminalLocked) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isTerminalMode, isTerminalLocked]);

    if (!isTerminalMode) return null;

    if (isTerminalLocked) {
        return (
            <>
                <TerminalScreensaver onUnlock={() => setShowPinPad(true)} />
                {showPinPad && (
                    <TerminalPinPad
                        onClose={() => setShowPinPad(false)}
                        onSuccess={async (employee) => {
                            setCurrentEmployee(employee);
                            await refreshClockStatus(supabase, employee.id);
                            setTerminalLocked(false);
                            setShowPinPad(false);
                        }}
                    />
                )}
            </>
        );
    }

    return null;
}
