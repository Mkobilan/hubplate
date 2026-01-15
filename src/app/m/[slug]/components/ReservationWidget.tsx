"use client";

import { useState, useMemo } from "react";
import {
    CalendarDays,
    Users,
    Clock,
    ChevronLeft,
    ChevronRight,
    Check,
    Loader2,
    Phone,
    User,
    Mail,
    MessageSquare,
    Sparkles,
    AlertCircle,
    Calendar,
    PartyPopper,
    Baby,
    Accessibility,
    Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import {
    format,
    addDays,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    isAfter,
    isBefore,
} from "date-fns";
import Link from "next/link";

interface ReservationSettings {
    minAdvanceHours: number;
    maxAdvanceDays: number;
    maxPartySizeOnline: number;
    timeSlotInterval: number;
    defaultDurationMinutes: number;
    confirmationMessage: string;
}

interface ReservationWidgetProps {
    locationId: string;
    locationName: string;
    locationPhone?: string;
    locationAddress?: string;
    brandColor: string;
    settings: ReservationSettings;
    slug: string;
}

type Step = "select" | "time" | "details" | "confirm";

export default function ReservationWidget({
    locationId,
    locationName,
    locationPhone,
    locationAddress,
    brandColor,
    settings,
    slug,
}: ReservationWidgetProps) {
    // Step tracking
    const [currentStep, setCurrentStep] = useState<Step>("select");

    // Selection state
    const [partySize, setPartySize] = useState(2);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    // Available slots
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);
    const [requiresCall, setRequiresCall] = useState(false);
    const [isClosed, setIsClosed] = useState(false);

    // Contact details
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [specialRequests, setSpecialRequests] = useState({
        allergies: "",
        occasion: "",
        notes: "",
        highChair: false,
        wheelchair: false,
    });
    const [wantsLoyalty, setWantsLoyalty] = useState(false);

    // Submission
    const [submitting, setSubmitting] = useState(false);
    const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

    // Date constraints
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = addDays(today, settings.maxAdvanceDays);

    // Calendar helpers
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const calendarDays = useMemo(() => {
        const days: Date[] = [];
        let day = calendarStart;
        while (day <= calendarEnd) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentMonth]);

    // Party size options
    const partySizeOptions = Array.from({ length: settings.maxPartySizeOnline }, (_, i) => i + 1);

    // Fetch available time slots
    const fetchAvailability = async (date: Date, size: number) => {
        setLoadingSlots(true);
        setSlotsError(null);
        setRequiresCall(false);
        setIsClosed(false);
        setAvailableSlots([]);

        try {
            const response = await fetch("/api/public-reservation/availability", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    locationId,
                    date: format(date, "yyyy-MM-dd"),
                    partySize: size,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to check availability");
            }

            if (data.requiresCall) {
                setRequiresCall(true);
                return;
            }

            if (data.isClosed) {
                setIsClosed(true);
                return;
            }

            setAvailableSlots(data.availableSlots || []);
        } catch (error: any) {
            console.error("Error fetching availability:", error);
            setSlotsError(error.message || "Failed to check availability");
        } finally {
            setLoadingSlots(false);
        }
    };

    // Handle date selection
    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setSelectedTime(null);
        fetchAvailability(date, partySize);
        setCurrentStep("time");
    };

    // Handle party size change
    const handlePartySizeChange = (size: number) => {
        setPartySize(size);
        if (selectedDate) {
            setSelectedTime(null);
            fetchAvailability(selectedDate, size);
        }
    };

    // Handle time selection
    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
        setCurrentStep("details");
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!selectedDate || !selectedTime || !customerName || !customerPhone) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch("/api/public-reservation/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    locationId,
                    date: format(selectedDate, "yyyy-MM-dd"),
                    time: selectedTime,
                    partySize,
                    customerName,
                    customerPhone,
                    customerEmail: customerEmail || undefined,
                    specialRequests: {
                        allergies: specialRequests.allergies || undefined,
                        occasion: specialRequests.occasion || undefined,
                        notes: specialRequests.notes || undefined,
                        highChair: specialRequests.highChair,
                        wheelchair: specialRequests.wheelchair,
                    },
                    wantsLoyaltyEnrollment: wantsLoyalty,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create reservation");
            }

            setConfirmationCode(data.confirmationCode);
            setCurrentStep("confirm");
            toast.success("Reservation confirmed!");
        } catch (error: any) {
            console.error("Booking error:", error);
            toast.error(error.message || "Failed to create reservation");
        } finally {
            setSubmitting(false);
        }
    };

    // Format time for display
    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(":");
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Check if date is selectable
    const isDateSelectable = (date: Date) => {
        return !isBefore(date, today) && !isAfter(date, maxDate);
    };

    return (
        <div className="pb-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-100 mb-1">Reserve a Table</h1>
                <p className="text-slate-500 text-sm">{locationName}</p>
            </div>

            {/* Progress Steps */}
            {currentStep !== "confirm" && (
                <div className="flex items-center justify-center gap-2 mb-8">
                    {["select", "time", "details"].map((step, index) => (
                        <div key={step} className="flex items-center">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                                    currentStep === step
                                        ? "text-white"
                                        : ["select", "time", "details"].indexOf(currentStep) > index
                                            ? "bg-green-500 text-white"
                                            : "bg-slate-800 text-slate-500"
                                )}
                                style={{
                                    backgroundColor:
                                        currentStep === step ? brandColor : undefined,
                                }}
                            >
                                {["select", "time", "details"].indexOf(currentStep) > index ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    index + 1
                                )}
                            </div>
                            {index < 2 && (
                                <div
                                    className={cn(
                                        "w-8 h-0.5 mx-1",
                                        ["select", "time", "details"].indexOf(currentStep) > index
                                            ? "bg-green-500"
                                            : "bg-slate-800"
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Step 1: Party Size & Date */}
            {currentStep === "select" && (
                <div className="space-y-6">
                    {/* Party Size */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-5 h-5 text-slate-400" />
                            <span className="font-medium text-slate-200">Party Size</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {partySizeOptions.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => handlePartySizeChange(size)}
                                    className={cn(
                                        "py-3 rounded-xl font-bold text-lg transition-all",
                                        partySize === size
                                            ? "text-white shadow-lg"
                                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                    )}
                                    style={{
                                        backgroundColor: partySize === size ? brandColor : undefined,
                                    }}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                        {partySize === settings.maxPartySizeOnline && (
                            <p className="text-xs text-slate-500 mt-2 text-center">
                                For larger parties, please call{" "}
                                {locationPhone && <span className="text-orange-400">{locationPhone}</span>}
                            </p>
                        )}
                    </div>

                    {/* Calendar */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                disabled={isSameMonth(currentMonth, today)}
                            >
                                <ChevronLeft className="w-5 h-5 text-slate-400" />
                            </button>
                            <span className="font-bold text-slate-200">
                                {format(currentMonth, "MMMM yyyy")}
                            </span>
                            <button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                                <div key={i} className="text-xs font-medium text-slate-500 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, i) => {
                                const isSelected = selectedDate && isSameDay(day, selectedDate);
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const isToday = isSameDay(day, today);
                                const isSelectable = isDateSelectable(day);

                                return (
                                    <button
                                        key={i}
                                        onClick={() => isSelectable && handleDateSelect(day)}
                                        disabled={!isSelectable}
                                        className={cn(
                                            "py-3 rounded-xl text-sm font-medium transition-all",
                                            isSelected
                                                ? "text-white"
                                                : isToday
                                                    ? "bg-slate-800 text-slate-200"
                                                    : isSelectable && isCurrentMonth
                                                        ? "text-slate-300 hover:bg-slate-800"
                                                        : "text-slate-700 cursor-not-allowed"
                                        )}
                                        style={{
                                            backgroundColor: isSelected ? brandColor : undefined,
                                        }}
                                    >
                                        {format(day, "d")}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Time Selection */}
            {currentStep === "time" && (
                <div className="space-y-4">
                    <button
                        onClick={() => setCurrentStep("select")}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-slate-500">Selected Date</p>
                                <p className="font-bold text-slate-200">
                                    {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-slate-500">Party Size</p>
                                <p className="font-bold text-slate-200">{partySize} guests</p>
                            </div>
                        </div>

                        {loadingSlots && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                            </div>
                        )}

                        {slotsError && (
                            <div className="text-center py-8">
                                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                                <p className="text-red-400">{slotsError}</p>
                            </div>
                        )}

                        {requiresCall && (
                            <div className="text-center py-8">
                                <Phone className="w-10 h-10 text-orange-400 mx-auto mb-3" />
                                <p className="text-slate-200 font-medium mb-1">
                                    Call to Reserve
                                </p>
                                <p className="text-slate-500 text-sm mb-4">
                                    For parties of {settings.maxPartySizeOnline + 1}+, please call us directly.
                                </p>
                                {locationPhone && (
                                    <a
                                        href={`tel:${locationPhone}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white"
                                        style={{ backgroundColor: brandColor }}
                                    >
                                        <Phone className="w-4 h-4" />
                                        {locationPhone}
                                    </a>
                                )}
                            </div>
                        )}

                        {isClosed && (
                            <div className="text-center py-8">
                                <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium mb-1">Closed</p>
                                <p className="text-slate-500 text-sm">
                                    The restaurant is closed on this day. Please select another date.
                                </p>
                            </div>
                        )}

                        {!loadingSlots && !slotsError && !requiresCall && !isClosed && (
                            <>
                                {availableSlots.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {availableSlots.map((time) => (
                                            <button
                                                key={time}
                                                onClick={() => handleTimeSelect(time)}
                                                className={cn(
                                                    "py-3 rounded-xl font-medium transition-all",
                                                    selectedTime === time
                                                        ? "text-white"
                                                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                                )}
                                                style={{
                                                    backgroundColor:
                                                        selectedTime === time ? brandColor : undefined,
                                                }}
                                            >
                                                {formatTime(time)}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                        <p className="text-slate-400 font-medium mb-1">
                                            No Available Times
                                        </p>
                                        <p className="text-slate-500 text-sm">
                                            All tables are booked for this date. Please try another day.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Step 3: Contact Details */}
            {currentStep === "details" && (
                <div className="space-y-4">
                    <button
                        onClick={() => setCurrentStep("time")}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>

                    {/* Summary */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-slate-400">
                                <CalendarDays className="w-4 h-4" />
                                <span>{selectedDate && format(selectedDate, "MMM d, yyyy")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Clock className="w-4 h-4" />
                                <span>{selectedTime && formatTime(selectedTime)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Users className="w-4 h-4" />
                                <span>{partySize} guests</span>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                        <h3 className="font-bold text-slate-200 mb-2">Your Information</h3>

                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Name *</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Phone *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="(555) 123-4567"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Email (optional)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    placeholder="john@example.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Special Requests */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                        <h3 className="font-bold text-slate-200 mb-2">Special Requests</h3>

                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Allergies / Dietary Restrictions</label>
                            <input
                                type="text"
                                value={specialRequests.allergies}
                                onChange={(e) => setSpecialRequests({ ...specialRequests, allergies: e.target.value })}
                                placeholder="Peanut allergy, gluten-free..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Occasion</label>
                            <div className="grid grid-cols-3 gap-2">
                                {["Birthday", "Anniversary", "Business"].map((occ) => (
                                    <button
                                        key={occ}
                                        onClick={() => setSpecialRequests({
                                            ...specialRequests,
                                            occasion: specialRequests.occasion === occ ? "" : occ,
                                        })}
                                        className={cn(
                                            "py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1",
                                            specialRequests.occasion === occ
                                                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                                : "bg-slate-800 text-slate-400 border border-transparent"
                                        )}
                                    >
                                        {occ === "Birthday" && <PartyPopper className="w-3 h-3" />}
                                        {occ}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setSpecialRequests({ ...specialRequests, highChair: !specialRequests.highChair })}
                                className={cn(
                                    "flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all",
                                    specialRequests.highChair
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                        : "bg-slate-800 text-slate-400 border border-transparent"
                                )}
                            >
                                <Baby className="w-4 h-4" />
                                High Chair
                            </button>
                            <button
                                onClick={() => setSpecialRequests({ ...specialRequests, wheelchair: !specialRequests.wheelchair })}
                                className={cn(
                                    "flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all",
                                    specialRequests.wheelchair
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                        : "bg-slate-800 text-slate-400 border border-transparent"
                                )}
                            >
                                <Accessibility className="w-4 h-4" />
                                Wheelchair
                            </button>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-1 block">Additional Notes</label>
                            <div className="relative">
                                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                <textarea
                                    value={specialRequests.notes}
                                    onChange={(e) => setSpecialRequests({ ...specialRequests, notes: e.target.value })}
                                    placeholder="Any other requests..."
                                    rows={2}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Loyalty */}
                    <button
                        onClick={() => setWantsLoyalty(!wantsLoyalty)}
                        className={cn(
                            "w-full bg-slate-900 border rounded-2xl p-4 flex items-center gap-3 transition-all",
                            wantsLoyalty ? "border-orange-500/50" : "border-slate-800"
                        )}
                    >
                        <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                            wantsLoyalty ? "bg-orange-500" : "border-2 border-slate-700"
                        )}>
                            {wantsLoyalty && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-orange-400" />
                                <span className="font-medium text-slate-200">Join Loyalty Program</span>
                            </div>
                            <p className="text-xs text-slate-500">Earn points & get exclusive offers</p>
                        </div>
                    </button>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !customerName || !customerPhone}
                        className={cn(
                            "w-full py-4 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                        )}
                        style={{ backgroundColor: brandColor }}
                    >
                        {submitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Confirm Reservation
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Step 4: Confirmation */}
            {currentStep === "confirm" && confirmationCode && (
                <div className="space-y-6">
                    {/* Success Animation */}
                    <div className="text-center py-8">
                        <div
                            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center animate-in zoom-in duration-300"
                            style={{ backgroundColor: brandColor }}
                        >
                            <Check className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">Reservation Confirmed!</h2>
                        <p className="text-slate-500">{settings.confirmationMessage}</p>
                    </div>

                    {/* Confirmation Code */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
                        <p className="text-sm text-slate-500 mb-2">Confirmation Code</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-3xl font-bold tracking-wider" style={{ color: brandColor }}>
                                {confirmationCode}
                            </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(confirmationCode);
                                    toast.success("Copied to clipboard!");
                                }}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <Copy className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Reservation Details */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-3 text-slate-400">
                            <CalendarDays className="w-5 h-5" />
                            <span className="text-slate-200">
                                {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400">
                            <Clock className="w-5 h-5" />
                            <span className="text-slate-200">{selectedTime && formatTime(selectedTime)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400">
                            <Users className="w-5 h-5" />
                            <span className="text-slate-200">{partySize} guests</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Link
                            href={`/m/${slug}`}
                            className="block w-full py-3 rounded-xl font-medium text-center bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                        >
                            View Menu
                        </Link>

                        {locationPhone && (
                            <p className="text-center text-sm text-slate-500">
                                Need to make changes?{" "}
                                <a href={`tel:${locationPhone}`} className="text-orange-400 hover:underline">
                                    Call us
                                </a>
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
