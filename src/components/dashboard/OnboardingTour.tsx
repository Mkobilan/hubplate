"use client";

import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    ChefHat,
    Users,
    Calendar,
    Package,
    PieChart,
    Settings,
    X,
    ChevronRight,
    ChevronLeft,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";

const TOUR_STEPS = [
    {
        title: "Welcome to HubPlate!",
        description: "We're excited to help you run your restaurant more efficiently. Let's take a quick 1-minute tour of your new dashboard.",
        icon: <ChefHat className="h-10 w-10 text-orange-500" />,
        target: "none"
    },
    {
        title: "The Heart of Your Operation",
        description: "This is your main dashboard. Here you'll see real-time updates on orders, staff, and daily performance.",
        icon: <LayoutDashboard className="h-10 w-10 text-blue-500" />,
        target: "sidebar-dashboard"
    },
    {
        title: "Master Your Floor Plan",
        description: "Design your visual seating map, assign servers, and track table status with precision.",
        icon: <LayoutDashboard className="h-10 w-10 text-green-500" />,
        target: "sidebar-seating"
    },
    {
        title: "Smart Scheduling",
        description: "Create rule-based schedules and manage employee availability automatically.",
        icon: <Calendar className="h-10 w-10 text-purple-500" />,
        target: "sidebar-schedule"
    },
    {
        title: "Inventory & AI",
        description: "Track your stock in real-time and use AI to generate menus or analyze trends.",
        icon: <Package className="h-10 w-10 text-orange-500" />,
        target: "sidebar-inventory"
    },
    {
        title: "Ready to Start?",
        description: "You're all set! Head over to Settings to finish setting up your restaurant details and payments.",
        icon: <Sparkles className="h-10 w-10 text-yellow-500" />,
        target: "sidebar-settings"
    }
];

export function OnboardingTour() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const currentEmployee = useAppStore((state) => state.currentEmployee);
    const supabase = createClient();

    useEffect(() => {
        const checkTourStatus = async () => {
            if (!currentEmployee) return;

            // Fetch fresh data for tour status
            const { data: empData } = await supabase
                .from('employees')
                .select('has_completed_tour')
                .eq('id', currentEmployee.id)
                .single();

            const data = empData as any;

            if (data && !data.has_completed_tour) {
                // Short delay to let the dashboard load
                setTimeout(() => setIsVisible(true), 1500);
            }
        };

        checkTourStatus();
    }, [currentEmployee]);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            completeTour();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const completeTour = async () => {
        setIsVisible(false);
        if (currentEmployee) {
            await (supabase.from('employees') as any)
                .update({ has_completed_tour: true })
                .eq('id', currentEmployee.id);
        }
    };

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button
                    onClick={completeTour}
                    className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-800">
                    <div
                        className="h-full bg-orange-500 transition-all duration-500"
                        style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
                    />
                </div>

                <div className="p-8 md:p-10 text-center">
                    <div className="flex justify-center mb-8">
                        <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700">
                            {step.icon}
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-4">{step.title}</h2>
                    <p className="text-slate-400 text-lg leading-relaxed mb-10">
                        {step.description}
                    </p>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                                currentStep === 0
                                    ? "text-slate-700 cursor-not-allowed"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            <ChevronLeft className="h-5 w-5" />
                            Previous
                        </button>

                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20"
                        >
                            {currentStep === TOUR_STEPS.length - 1 ? "Get Started" : "Next Step"}
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Step Indicators */}
                <div className="flex justify-center gap-2 pb-8">
                    {TOUR_STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300",
                                i === currentStep ? "w-8 bg-orange-500" : "w-2 bg-slate-800"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Visual Guide Element - This would ideally highlight the sidebar items */}
            {step.target !== "none" && (
                <div className="fixed inset-0 pointer-events-none border-4 border-orange-500/30 rounded-lg animate-pulse" />
            )}
        </div>
    );
}
