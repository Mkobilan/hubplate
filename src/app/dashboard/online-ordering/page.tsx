"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Loader2, Globe, QrCode, Copy, ExternalLink, Save, Upload, Palette, Truck, CalendarClock, Clock } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import QRCode from "react-qr-code";

// Day labels for operating hours
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface OperatingHour {
    day_of_week: number;
    is_open: boolean;
    open_time: string;
    close_time: string;
}

export default function OnlineOrderingPage() {
    const { currentEmployee: profile, currentLocation } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [slug, setSlug] = useState("");
    const [originalSlug, setOriginalSlug] = useState("");
    const [orderingEnabled, setOrderingEnabled] = useState(false);
    const [brandColor, setBrandColor] = useState("#f97316"); // Default orange-500

    // Branding (URLs)
    const [logoUrl, setLogoUrl] = useState("");
    const [bannerUrl, setBannerUrl] = useState("");
    const [tableNumber, setTableNumber] = useState("");

    // Delivery Settings
    const [deliveryEnabled, setDeliveryEnabled] = useState(false);
    const [deliveryRadius, setDeliveryRadius] = useState(5.0);
    const [uberOrgId, setUberOrgId] = useState("");
    const [settingUpUber, setSettingUpUber] = useState(false);

    // Validation
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [slugError, setSlugError] = useState("");

    // Online Reservations Settings
    const [onlineReservationsEnabled, setOnlineReservationsEnabled] = useState(false);
    const [minAdvanceHours, setMinAdvanceHours] = useState(1);
    const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
    const [timeSlotInterval, setTimeSlotInterval] = useState(15);
    const [maxPartySizeOnline, setMaxPartySizeOnline] = useState(8);
    const [pacingLimit, setPacingLimit] = useState<number | null>(null);
    const [confirmationMessage, setConfirmationMessage] = useState('Thank you for your reservation! We look forward to seeing you.');
    const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
    const [savingReservations, setSavingReservations] = useState(false);

    useEffect(() => {
        if (!currentLocation?.id) return;
        fetchLocationSettings();
    }, [currentLocation?.id]);

    const fetchLocationSettings = async () => {
        if (!currentLocation?.id) return;

        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("locations")
                .select("slug, brand_color, logo_url, banner_url, ordering_enabled, delivery_enabled, delivery_radius, uber_organization_id")
                .eq("id", currentLocation.id)
                .single() as any;

            if (error) throw error;

            if (data) {
                console.log("Fetched Settings:", data);
                setSlug(data.slug || "");
                setOriginalSlug(data.slug || "");
                setBrandColor(data.brand_color || "#f97316");
                setLogoUrl(data.logo_url || "");
                setBannerUrl(data.banner_url || "");
                setOrderingEnabled(data.ordering_enabled ?? false);
                setDeliveryEnabled(data.delivery_enabled ?? false);
                setDeliveryRadius(data.delivery_radius || 5.0);
                setUberOrgId(data.uber_organization_id || "");
            }

            // Fetch reservation settings
            const { data: resSettings } = await (supabase as any)
                .from("reservation_settings")
                .select("*")
                .eq("location_id", currentLocation.id)
                .single();

            if (resSettings) {
                setOnlineReservationsEnabled(resSettings.online_reservations_enabled ?? false);
                setMinAdvanceHours(resSettings.min_advance_hours ?? 1);
                setMaxAdvanceDays(resSettings.max_advance_days ?? 30);
                setTimeSlotInterval(resSettings.time_slot_interval ?? 15);
                setMaxPartySizeOnline(resSettings.max_party_size_online ?? 8);
                setPacingLimit(resSettings.pacing_limit ?? null);
                setConfirmationMessage(resSettings.confirmation_message ?? 'Thank you for your reservation!');
            }

            // Fetch operating hours
            const { data: hours } = await (supabase as any)
                .from("operating_hours")
                .select("*")
                .eq("location_id", currentLocation.id)
                .order("day_of_week", { ascending: true });

            if (hours && hours.length > 0) {
                setOperatingHours(hours.map((h: any) => ({
                    day_of_week: h.day_of_week,
                    is_open: h.is_open,
                    open_time: h.open_time?.substring(0, 5) || '11:00',
                    close_time: h.close_time?.substring(0, 5) || '22:00'
                })));
            } else {
                // Initialize default hours
                setOperatingHours(DAYS_OF_WEEK.map((_, i) => ({
                    day_of_week: i,
                    is_open: true,
                    open_time: '11:00',
                    close_time: '22:00'
                })));
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    // Slug validator with debounce (simple version)
    useEffect(() => {
        if (!slug || slug === originalSlug) {
            setSlugAvailable(null);
            setSlugError("");
            return;
        }

        const checkSlug = async () => {
            // Basic regex: alphanumeric and hyphens only
            if (!/^[a-z0-9-]+$/.test(slug)) {
                setSlugError("Only lowercase letters, numbers, and hyphens allowed.");
                setSlugAvailable(false);
                return;
            }

            const supabase = createClient();
            const { count, error } = await supabase
                .from("locations")
                .select("*", { count: "exact", head: true })
                .eq("slug", slug);

            if (error) {
                setSlugAvailable(false);
                return;
            }

            setSlugAvailable(count === 0);
            setSlugError(count === 0 ? "" : "This URL is already taken.");
        };

        const timer = setTimeout(checkSlug, 500);
        return () => clearTimeout(timer);
    }, [slug, originalSlug]);

    const handleSave = async () => {
        if (slugError || (slug && slugAvailable === false)) {
            toast.error("Please fix the URL errors first.");
            return;
        }

        if (!currentLocation?.id) {
            toast.error("No location selected");
            return;
        }

        setSaving(true);
        try {
            const supabase = createClient();
            const { error } = await (supabase.from("locations") as any)
                .update({
                    slug: slug || null,
                    brand_color: brandColor,
                    logo_url: logoUrl,
                    banner_url: bannerUrl,
                    ordering_enabled: orderingEnabled,
                    delivery_enabled: deliveryEnabled,
                    delivery_radius: deliveryRadius
                })
                .eq("id", currentLocation.id);

            if (error) throw error;

            toast.success("Settings saved successfully!");
            setOriginalSlug(slug);
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleSetupUber = async () => {
        if (!currentLocation?.id) return;

        setSettingUpUber(true);
        try {
            const response = await fetch("/api/delivery/setup-uber", {
                method: "POST",
                body: JSON.stringify({ locationId: currentLocation.id }),
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setUberOrgId(data.organization_id);
            setDeliveryEnabled(true);
            toast.success("Uber Direct connected successfully!");
        } catch (error: any) {
            console.error("Uber setup error:", error);
            toast.error(error.message || "Failed to setup Uber");
        } finally {
            setSettingUpUber(false);
        }
    };

    const handleDownloadQR = () => {
        const svg = document.getElementById("qr-code-svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            if (ctx) {
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const pngFile = canvas.toDataURL("image/png");
                const downloadLink = document.createElement("a");
                downloadLink.download = `qr-code-${slug}.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            }
        };

        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    const handleSaveReservationSettings = async () => {
        if (!currentLocation?.id) {
            toast.error("No location selected");
            return;
        }

        setSavingReservations(true);
        try {
            const supabase = createClient();

            // Upsert reservation settings
            const { error: resError } = await (supabase as any)
                .from("reservation_settings")
                .upsert({
                    location_id: currentLocation.id,
                    online_reservations_enabled: onlineReservationsEnabled,
                    min_advance_hours: minAdvanceHours,
                    max_advance_days: maxAdvanceDays,
                    time_slot_interval: timeSlotInterval,
                    max_party_size_online: maxPartySizeOnline,
                    pacing_limit: pacingLimit,
                    confirmation_message: confirmationMessage
                }, { onConflict: 'location_id' });

            if (resError) throw resError;

            // Upsert operating hours
            for (const hour of operatingHours) {
                const { error: hourError } = await (supabase as any)
                    .from("operating_hours")
                    .upsert({
                        location_id: currentLocation.id,
                        day_of_week: hour.day_of_week,
                        is_open: hour.is_open,
                        open_time: hour.open_time + ':00',
                        close_time: hour.close_time + ':00'
                    }, { onConflict: 'location_id,day_of_week' });

                if (hourError) throw hourError;
            }

            toast.success("Reservation settings saved!");
        } catch (error) {
            console.error("Error saving reservation settings:", error);
            toast.error("Failed to save reservation settings");
        } finally {
            setSavingReservations(false);
        }
    };

    const updateOperatingHour = (dayIndex: number, field: keyof OperatingHour, value: any) => {
        setOperatingHours(prev => prev.map(h =>
            h.day_of_week === dayIndex ? { ...h, [field]: value } : h
        ));
    };

    const publicUrl = slug ? `https://hubplate.app/m/${slug}` : "";

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Online Ordering</h1>
                    <p className="text-slate-400">Manage your public menu page and settings.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <span className={`text-sm px-3 py-1 rounded-md transition-all ${!orderingEnabled ? 'bg-slate-600 text-slate-200' : 'text-slate-400'}`}>Disabled</span>
                        <button
                            onClick={() => setOrderingEnabled(!orderingEnabled)}
                            className={`relative px-3 py-1 rounded-md text-sm font-medium transition-all ${orderingEnabled ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Live
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Main Settings Column */}
                <div className="md:col-span-2 space-y-6">

                    {/* URL Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Globe className="h-5 w-5 text-blue-500" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-100">Your Public Link</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Choose your unique URL
                                </label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-700 bg-slate-800 text-slate-400 text-sm">
                                        hubplate.app/m/
                                    </span>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                        className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-lg border bg-slate-950 text-slate-100 text-sm focus:ring-orange-500 focus:border-orange-500 ${slugError ? "border-red-500" : slugAvailable ? "border-green-500" : "border-slate-700"
                                            }`}
                                        placeholder="your-restaurant-name"
                                    />
                                </div>
                                {slugError && <p className="mt-1 text-xs text-red-500">{slugError}</p>}
                                {slugAvailable && slug !== originalSlug && (
                                    <p className="mt-1 text-xs text-green-500">✓ This URL is available</p>
                                )}
                            </div>

                            {slug && (
                                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-sm text-slate-400 truncate max-w-[250px]">{publicUrl}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(publicUrl);
                                                toast.success("Copied to clipboard!");
                                            }}
                                            className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                                            title="Copy Link"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                        <a
                                            href={`/m/${slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                                            title="Open Logic"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Branding Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Palette className="h-5 w-5 text-purple-500" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-100">Appearance</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2"> Brand Color </label>
                                <div className="flex gap-3 items-center">
                                    <input
                                        type="color"
                                        value={brandColor}
                                        onChange={(e) => setBrandColor(e.target.value)}
                                        className="h-10 w-10 rounded border border-slate-700 bg-transparent cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={brandColor}
                                        onChange={(e) => setBrandColor(e.target.value)}
                                        className="input text-sm w-32 uppercase"
                                        maxLength={7}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Logo</label>
                                <ImageUpload
                                    value={logoUrl}
                                    onChange={(url) => setLogoUrl(url)}
                                    onRemove={() => setLogoUrl("")}
                                    bucketName="logos"
                                    label="Upload Logo"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-400 mb-2">Banner Image</label>
                            <ImageUpload
                                value={bannerUrl}
                                onChange={(url) => setBannerUrl(url)}
                                onRemove={() => setBannerUrl("")}
                                bucketName="banners"
                                label="Upload Banner"
                            />
                        </div>
                    </div>

                    {/* Online Reservations Settings Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <CalendarClock className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-100">Online Reservations</h2>
                                    <p className="text-xs text-slate-500">Allow customers to book tables online</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setOnlineReservationsEnabled(!onlineReservationsEnabled)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${onlineReservationsEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${onlineReservationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {onlineReservationsEnabled && (
                            <div className="space-y-6">
                                {/* Operating Hours */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <label className="text-sm font-medium text-slate-300">Operating Hours</label>
                                    </div>
                                    <div className="space-y-2 bg-slate-950 rounded-lg p-3 border border-slate-800">
                                        {operatingHours.map((hour) => (
                                            <div key={hour.day_of_week} className="flex items-center gap-3">
                                                <div className="w-20 text-sm text-slate-400">{DAYS_OF_WEEK[hour.day_of_week]}</div>
                                                <button
                                                    onClick={() => updateOperatingHour(hour.day_of_week, 'is_open', !hour.is_open)}
                                                    className={`px-2 py-1 text-xs rounded ${hour.is_open ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                                                >
                                                    {hour.is_open ? 'Open' : 'Closed'}
                                                </button>
                                                {hour.is_open && (
                                                    <>
                                                        <input
                                                            type="time"
                                                            value={hour.open_time}
                                                            onChange={(e) => updateOperatingHour(hour.day_of_week, 'open_time', e.target.value)}
                                                            className="input text-xs py-1 px-2 w-24"
                                                        />
                                                        <span className="text-slate-500">to</span>
                                                        <input
                                                            type="time"
                                                            value={hour.close_time}
                                                            onChange={(e) => updateOperatingHour(hour.day_of_week, 'close_time', e.target.value)}
                                                            className="input text-xs py-1 px-2 w-24"
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Reservation Settings */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Time Slot Interval</label>
                                        <select
                                            value={timeSlotInterval}
                                            onChange={(e) => setTimeSlotInterval(parseInt(e.target.value))}
                                            className="input w-full"
                                        >
                                            <option value={15}>15 minutes</option>
                                            <option value={30}>30 minutes</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Max Party Size (Online)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={maxPartySizeOnline}
                                            onChange={(e) => setMaxPartySizeOnline(parseInt(e.target.value))}
                                            className="input w-full"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Larger parties will see &quot;Call to Reserve&quot;</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Min Advance (Hours)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={72}
                                            value={minAdvanceHours}
                                            onChange={(e) => setMinAdvanceHours(parseInt(e.target.value))}
                                            className="input w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Max Advance (Days)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={90}
                                            value={maxAdvanceDays}
                                            onChange={(e) => setMaxAdvanceDays(parseInt(e.target.value))}
                                            className="input w-full"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Pacing Limit (per time slot)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min={0}
                                            max={50}
                                            value={pacingLimit || ''}
                                            onChange={(e) => setPacingLimit(e.target.value ? parseInt(e.target.value) : null)}
                                            placeholder="No limit"
                                            className="input w-32"
                                        />
                                        <span className="text-xs text-slate-500">Max new reservations per time slot (leave empty for no limit)</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Confirmation Message</label>
                                    <textarea
                                        value={confirmationMessage}
                                        onChange={(e) => setConfirmationMessage(e.target.value)}
                                        rows={2}
                                        className="input w-full"
                                        placeholder="Thank you for your reservation!"
                                    />
                                </div>

                                <button
                                    onClick={handleSaveReservationSettings}
                                    disabled={savingReservations}
                                    className="btn btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                                >
                                    {savingReservations ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save Reservation Settings
                                </button>
                            </div>
                        )}

                        {!onlineReservationsEnabled && (
                            <div className="text-center py-6 bg-slate-950 rounded-lg border border-dashed border-slate-800">
                                <CalendarClock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">Enable to allow customers to book tables online.</p>
                                <p className="text-xs text-slate-600 mt-1">Integrates with your existing reservations system.</p>
                            </div>
                        )}
                    </div>

                    {/* Delivery Settings Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <Truck className="h-5 w-5 text-green-500" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-100">Uber Direct Delivery</h2>
                            </div>

                            {!uberOrgId ? (
                                <button
                                    onClick={handleSetupUber}
                                    disabled={settingUpUber}
                                    className="btn bg-white text-black hover:bg-slate-200 text-xs py-1.5 px-3 flex items-center gap-2"
                                >
                                    {settingUpUber ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                    Connect Uber Direct
                                </button>
                            ) : (
                                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    Active
                                </span>
                            )}
                        </div>

                        {uberOrgId ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">Enable Delivery</p>
                                        <p className="text-xs text-slate-500 mt-1">Offer local fulfillment via Uber</p>
                                    </div>
                                    <button
                                        onClick={() => setDeliveryEnabled(!deliveryEnabled)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${deliveryEnabled ? 'bg-green-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${deliveryEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2"> Delivery Radius (miles) </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min="1"
                                                max="15"
                                                step="0.5"
                                                value={deliveryRadius}
                                                onChange={(e) => setDeliveryRadius(parseFloat(e.target.value))}
                                                className="flex-1 accent-green-500"
                                            />
                                            <span className="text-sm font-bold text-slate-100 w-12 text-right">{deliveryRadius}m</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2"> Uber Organization ID </label>
                                        <div className="text-xs font-mono text-slate-500 bg-slate-950 p-2 rounded border border-slate-800 break-all">
                                            {uberOrgId}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-slate-950 rounded-lg border border-dashed border-slate-800">
                                <p className="text-sm text-slate-400">Connect to Uber Direct to start offering delivery.</p>
                                <p className="text-xs text-slate-600 mt-1">No setup fees. Pay only per delivery.</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn btn-primary py-2.5 px-6 flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Changes
                        </button>
                    </div>

                </div>

                {/* Sidebar / Preview Column */}
                <div className="space-y-6">

                    {/* QR Code Card */}
                    <div className="bg-white rounded-xl p-6 text-center border border-slate-200">
                        <h3 className="text-slate-900 font-bold mb-4">Dine-In QR Code</h3>

                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Table # (Optional)"
                                className="w-full text-center border border-slate-300 rounded-lg p-2 text-slate-800 text-sm"
                                value={tableNumber}
                                onChange={(e) => setTableNumber(e.target.value)}
                            />
                        </div>

                        <div className="bg-white p-2 inline-block rounded-lg mb-4">
                            {slug ? (
                                <QRCode
                                    id="qr-code-svg"
                                    value={`https://hubplate.app/m/${slug}?type=dine_in${tableNumber ? `&table=${tableNumber}` : ''}`}
                                    size={150}
                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    viewBox={`0 0 256 256`}
                                />
                            ) : (
                                <div className="h-[150px] w-[150px] bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                                    Set URL first
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            Scan to test. This links to your dine-in menu.
                        </p>
                        <button
                            onClick={handleDownloadQR}
                            className="w-full btn bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center gap-2"
                        >
                            <QrCode className="h-4 w-4" />
                            Download Check PNG
                        </button>
                    </div>

                    {/* Mobile Preview */}
                    <div className="border border-slate-800 rounded-[2rem] p-3 bg-slate-950 relative overflow-hidden h-[500px]">
                        <div className="absolute top-0 left-0 right-0 h-32 bg-cover bg-center" style={{
                            backgroundColor: brandColor,
                            backgroundImage: bannerUrl ? `url(${bannerUrl})` : 'none'
                        }}></div>
                        <div className="relative mt-20 mx-auto bg-slate-900 rounded-t-2xl h-full p-4 shadow-xl border-t border-white/10 overflow-y-auto no-scrollbar">
                            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4" />
                            {logoUrl && (
                                <img src={logoUrl} className="w-16 h-16 rounded-full border-4 border-slate-900 -mt-12 mb-3 bg-slate-800 object-cover" />
                            )}
                            <h3 className="font-bold text-lg text-white">Your Restaurant</h3>
                            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 w-32 bg-slate-800 rounded-lg flex-shrink-0" />
                                ))}
                            </div>
                            <div className="space-y-2 mt-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-16 w-full bg-slate-800/50 rounded-lg" />
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
