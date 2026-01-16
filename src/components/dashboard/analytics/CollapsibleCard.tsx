"use client";

import { useState } from "react";
import { ChevronUp, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
    title: string;
    icon: React.ReactNode;
    accentColor: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    onExportCSV?: () => void;
    exportLabel?: string;
}

export function CollapsibleCard({
    title,
    icon,
    accentColor,
    children,
    defaultOpen = true,
    onExportCSV,
    exportLabel = "Export CSV"
}: CollapsibleCardProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            {/* Header - using div instead of button to avoid nesting issues */}
            <div
                className={cn(
                    "w-full flex items-center justify-between px-5 py-4 transition-colors",
                    "hover:bg-slate-800/50"
                )}
            >
                {/* Clickable area for toggle */}
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                >
                    <div className={cn(
                        "p-2 rounded-lg",
                        accentColor
                    )}>
                        {icon}
                    </div>
                    <h3 className={cn(
                        "text-lg font-bold",
                        accentColor.replace("bg-", "text-").replace("/20", "-400")
                    )}>
                        {title}
                    </h3>
                </div>

                <div className="flex items-center gap-3">
                    {onExportCSV && isOpen && (
                        <button
                            onClick={onExportCSV}
                            className="btn btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            {exportLabel}
                        </button>
                    )}
                    <div
                        onClick={() => setIsOpen(!isOpen)}
                        className="cursor-pointer p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                        <ChevronUp className={cn(
                            "h-5 w-5 text-slate-400 transition-transform duration-200",
                            !isOpen && "rotate-180"
                        )} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="px-5 pb-5 pt-2">
                    {children}
                </div>
            </div>
        </div>
    );
}

interface MetricBoxProps {
    label: string;
    value: string | number;
    color?: string;
    subtext?: string;
    status?: 'good' | 'ok' | 'bad';
}

export function MetricBox({ label, value, color = "text-white", subtext, status }: MetricBoxProps) {
    const statusConfig = {
        good: { color: 'bg-green-500', label: 'Good' },
        ok: { color: 'bg-yellow-500', label: 'OK' },
        bad: { color: 'bg-red-500', label: 'Needs attention' }
    };

    return (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">{label}</p>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
            {status && (
                <div className="flex items-center gap-1.5 mt-2">
                    <span className={cn("w-2 h-2 rounded-full", statusConfig[status].color)} />
                    <span className="text-[10px] text-slate-400">{statusConfig[status].label}</span>
                </div>
            )}
        </div>
    );
}
