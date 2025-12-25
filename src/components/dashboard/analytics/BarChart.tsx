"use client";

import { cn } from "@/lib/utils";

interface BarChartData {
    label: string;
    value: number;
    color: string;
}

interface BarChartProps {
    data: BarChartData[];
    orientation?: "horizontal" | "vertical";
    showValues?: boolean;
    maxValue?: number;
    className?: string;
    barHeight?: number;
}

export function BarChart({
    data,
    orientation = "horizontal",
    showValues = true,
    maxValue,
    className,
    barHeight = 24
}: BarChartProps) {
    const max = maxValue || Math.max(...data.map(d => d.value), 1);

    if (data.length === 0) {
        return (
            <div className={cn("flex items-center justify-center py-8", className)}>
                <p className="text-slate-500 text-sm">No data available</p>
            </div>
        );
    }

    if (orientation === "horizontal") {
        return (
            <div className={cn("space-y-3", className)}>
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <span className="text-sm text-slate-400 w-24 text-right truncate flex-shrink-0">
                            {item.label}
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-6 bg-slate-800 rounded-md overflow-hidden">
                                <div
                                    className="h-full rounded-md transition-all duration-500"
                                    style={{
                                        width: `${(item.value / max) * 100}%`,
                                        backgroundColor: item.color,
                                    }}
                                />
                            </div>
                            {showValues && (
                                <span className="text-sm font-bold text-slate-300 w-12">
                                    {item.value}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Vertical bar chart
    return (
        <div className={cn("flex items-end gap-2 h-40", className)}>
            {data.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end h-32">
                        {showValues && item.value > 0 && (
                            <span className="text-xs text-slate-400 mb-1">{item.value}</span>
                        )}
                        <div
                            className="w-full max-w-8 rounded-t-md transition-all duration-500"
                            style={{
                                height: `${(item.value / max) * 100}%`,
                                minHeight: item.value > 0 ? 4 : 0,
                                backgroundColor: item.color,
                            }}
                        />
                    </div>
                    <span className="text-xs text-slate-500 truncate max-w-full text-center">
                        {item.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

interface SimpleBarProps {
    label: string;
    value: number;
    maxValue: number;
    color: string;
    formatValue?: (v: number) => string;
}

export function SimpleBar({ label, value, maxValue, color, formatValue }: SimpleBarProps) {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const displayValue = formatValue ? formatValue(value) : value.toString();

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span className="font-bold" style={{ color }}>{displayValue}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}
