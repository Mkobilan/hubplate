"use client";

import { cn } from "@/lib/utils";

interface KitchenTimelineProps {
    waitTime: number;
    prepTime: number;
    windowTime: number;
    totalTime: number;
}

export function KitchenTimeline({ waitTime, prepTime, windowTime, totalTime }: KitchenTimelineProps) {
    // Calculate percentages for each segment
    const total = waitTime + prepTime + windowTime;
    const waitPercent = total > 0 ? (waitTime / total) * 100 : 0;
    const prepPercent = total > 0 ? (prepTime / total) * 100 : 0;
    const windowPercent = total > 0 ? (windowTime / total) * 100 : 0;

    return (
        <div className="bg-slate-800/30 rounded-xl p-5">
            <h4 className="font-semibold text-sm text-slate-400 mb-4">
                Ticket Lifecycle Flow
            </h4>

            {/* Timeline visualization */}
            <div className="relative">
                {/* Milestone markers */}
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium">Sent</span>
                    <span className="font-medium">Started</span>
                    <span className="font-medium">Ready</span>
                    <span className="font-medium">Served</span>
                </div>

                {/* Timeline bar */}
                <div className="relative h-10 bg-slate-800 rounded-lg overflow-hidden flex">
                    {/* Wait segment */}
                    <div
                        className="h-full bg-gradient-to-r from-yellow-600 to-yellow-500 flex items-center justify-center transition-all duration-500 relative group"
                        style={{ width: `${waitPercent}%`, minWidth: waitTime > 0 ? '60px' : '0' }}
                    >
                        {waitPercent >= 15 && (
                            <span className="text-xs font-bold text-white drop-shadow-md">
                                {waitTime.toFixed(1)}m
                            </span>
                        )}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-slate-700">
                            Wait: {waitTime.toFixed(1)}m
                        </div>
                    </div>

                    {/* Prep segment */}
                    <div
                        className="h-full bg-gradient-to-r from-orange-600 to-orange-500 flex items-center justify-center transition-all duration-500 relative group"
                        style={{ width: `${prepPercent}%`, minWidth: prepTime > 0 ? '60px' : '0' }}
                    >
                        {prepPercent >= 15 && (
                            <span className="text-xs font-bold text-white drop-shadow-md">
                                {prepTime.toFixed(1)}m
                            </span>
                        )}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-slate-700">
                            Prep: {prepTime.toFixed(1)}m
                        </div>
                    </div>

                    {/* Window segment */}
                    <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center transition-all duration-500 relative group"
                        style={{ width: `${windowPercent}%`, minWidth: windowTime > 0 ? '60px' : '0' }}
                    >
                        {windowPercent >= 15 && (
                            <span className="text-xs font-bold text-white drop-shadow-md">
                                {windowTime.toFixed(1)}m
                            </span>
                        )}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-slate-700">
                            Window: {windowTime.toFixed(1)}m
                        </div>
                    </div>
                </div>

                {/* Milestone dots on the bar */}
                <div className="absolute top-[50%] -translate-y-1/2 left-0 w-3 h-3 bg-white rounded-full border-2 border-yellow-500 -ml-1.5 z-10" />
                <div
                    className="absolute top-[50%] -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-orange-500 -ml-1.5 z-10"
                    style={{ left: `${waitPercent}%` }}
                />
                <div
                    className="absolute top-[50%] -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-blue-500 -ml-1.5 z-10"
                    style={{ left: `${waitPercent + prepPercent}%` }}
                />
                <div className="absolute top-[50%] -translate-y-1/2 right-0 w-3 h-3 bg-white rounded-full border-2 border-green-500 -mr-1.5 z-10" />

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-yellow-500" />
                        <span className="text-slate-400">Wait Time</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-orange-500" />
                        <span className="text-slate-400">Prep Time</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-blue-500" />
                        <span className="text-slate-400">Window Time</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface BottleneckItemProps {
    name: string;
    waitTime: number;
    prepTime: number;
    windowTime: number;
    totalTime: number;
    maxTime: number;
}

export function BottleneckItem({ name, waitTime, prepTime, windowTime, totalTime, maxTime }: BottleneckItemProps) {
    const barWidth = maxTime > 0 ? (totalTime / maxTime) * 100 : 0;
    const waitPercent = totalTime > 0 ? (waitTime / totalTime) * 100 : 0;
    const prepPercent = totalTime > 0 ? (prepTime / totalTime) * 100 : 0;
    const windowPercent = totalTime > 0 ? (windowTime / totalTime) * 100 : 0;

    // Determine status color based on total time thresholds
    const getStatusColor = () => {
        if (totalTime <= 15) return "text-green-400";
        if (totalTime <= 20) return "text-yellow-400";
        return "text-red-400";
    };

    return (
        <div className="group">
            <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-slate-200 truncate max-w-[180px]">{name}</span>
                <span className={cn("font-bold", getStatusColor())}>
                    {totalTime.toFixed(1)}m total
                </span>
            </div>

            {/* Stacked bar with all three segments */}
            <div className="relative">
                <div
                    className="flex h-6 bg-slate-800 rounded-lg overflow-hidden transition-all duration-500"
                    style={{ width: `${barWidth}%`, minWidth: '100px' }}
                >
                    {/* Wait segment */}
                    <div
                        className="h-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors relative group/seg"
                        style={{ width: `${waitPercent}%` }}
                    >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 rounded text-[10px] opacity-0 group-hover/seg:opacity-100 transition-opacity whitespace-nowrap z-20 border border-slate-700">
                            Wait: {waitTime.toFixed(1)}m
                        </div>
                    </div>

                    {/* Prep segment */}
                    <div
                        className="h-full bg-orange-500/80 hover:bg-orange-500 transition-colors relative group/seg"
                        style={{ width: `${prepPercent}%` }}
                    >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 rounded text-[10px] opacity-0 group-hover/seg:opacity-100 transition-opacity whitespace-nowrap z-20 border border-slate-700">
                            Prep: {prepTime.toFixed(1)}m
                        </div>
                    </div>

                    {/* Window segment */}
                    <div
                        className="h-full bg-blue-500/80 hover:bg-blue-500 transition-colors relative group/seg"
                        style={{ width: `${windowPercent}%` }}
                    >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 rounded text-[10px] opacity-0 group-hover/seg:opacity-100 transition-opacity whitespace-nowrap z-20 border border-slate-700">
                            Window: {windowTime.toFixed(1)}m
                        </div>
                    </div>
                </div>
            </div>

            {/* Time breakdown labels */}
            <div className="flex gap-4 text-[10px] mt-1 text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-yellow-500" />
                    {waitTime.toFixed(1)}m
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-orange-500" />
                    {prepTime.toFixed(1)}m
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-blue-500" />
                    {windowTime.toFixed(1)}m
                </span>
            </div>
        </div>
    );
}
