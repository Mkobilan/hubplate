"use client";

import { cn } from "@/lib/utils";

interface PieChartData {
    label: string;
    value: number;
    color: string;
}

interface PieChartProps {
    data: PieChartData[];
    size?: number;
    showLegend?: boolean;
    className?: string;
}

export function PieChart({ data, size = 160, showLegend = true, className }: PieChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
            <div className={cn("flex items-center justify-center", className)} style={{ minHeight: size }}>
                <p className="text-slate-500 text-sm">No data available</p>
            </div>
        );
    }

    // Calculate pie slices
    let currentAngle = 0;
    const slices = data.map((item) => {
        const percentage = (item.value / total) * 100;
        const angle = (item.value / total) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
        return {
            ...item,
            percentage,
            startAngle,
            endAngle: currentAngle,
        };
    });

    // Convert angle to SVG arc path
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians),
        };
    };

    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        // Handle full circle case
        if (endAngle - startAngle >= 359.99) {
            return `M ${x} ${y - radius} A ${radius} ${radius} 0 1 1 ${x - 0.001} ${y - radius} Z`;
        }

        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

        return `M ${x} ${y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
    };

    const center = size / 2;
    const radius = size / 2 - 5;

    return (
        <div className={cn("flex items-center gap-6", className)}>
            {/* Pie Chart SVG */}
            <svg width={size} height={size} className="transform -rotate-0">
                {slices.map((slice, index) => (
                    <path
                        key={index}
                        d={describeArc(center, center, radius, slice.startAngle, slice.endAngle)}
                        fill={slice.color}
                        className="transition-opacity hover:opacity-80"
                    />
                ))}
                {/* Inner circle for donut effect */}
                <circle cx={center} cy={center} r={radius * 0.5} fill="#0f172a" />
            </svg>

            {/* Legend */}
            {showLegend && (
                <div className="flex flex-col gap-2">
                    {slices.map((slice, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: slice.color }}
                            />
                            <span className="text-sm text-slate-300">
                                {slice.label}: <span className="font-bold" style={{ color: slice.color }}>{slice.value}</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
