import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ReservationWidget from "../components/ReservationWidget";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: location } = await supabase
        .from("locations")
        .select("name")
        .eq("slug", slug)
        .eq("ordering_enabled", true)
        .single() as any;

    if (!location) {
        return {
            title: "Restaurant Not Found",
        };
    }

    return {
        title: `Reserve a Table - ${location.name}`,
        description: `Book a table online at ${location.name}`,
    };
}

export default async function ReservationPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const supabase = await createClient();

    // Get location data
    const { data: location, error: locationError } = await supabase
        .from("locations")
        .select("id, name, ordering_enabled, logo_url, brand_color, address, phone")
        .eq("slug", slug)
        .single() as any;

    if (locationError || !location || !location.ordering_enabled) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
                <h1 className="text-2xl font-bold text-slate-100 mb-2">Not Available</h1>
                <p className="text-slate-500">
                    This location is either not found or not accepting online reservations right now.
                </p>
            </div>
        );
    }

    // Get reservation settings
    const { data: settings } = await (supabase as any)
        .from("reservation_settings")
        .select("*")
        .eq("location_id", location.id)
        .single();

    if (!settings || !settings.online_reservations_enabled) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
                <h1 className="text-2xl font-bold text-slate-100 mb-2">Reservations Unavailable</h1>
                <p className="text-slate-500">
                    Online reservations are not currently available for this location.
                </p>
                <p className="text-slate-600 mt-2 text-sm">
                    Please call the restaurant directly to make a reservation.
                </p>
            </div>
        );
    }

    return (
        <ReservationWidget
            locationId={location.id}
            locationName={location.name}
            locationPhone={location.phone}
            locationAddress={location.address}
            brandColor={location.brand_color || "#f97316"}
            settings={{
                minAdvanceHours: settings.min_advance_hours ?? 1,
                maxAdvanceDays: settings.max_advance_days ?? 30,
                maxPartySizeOnline: settings.max_party_size_online ?? 8,
                timeSlotInterval: settings.time_slot_interval ?? 15,
                defaultDurationMinutes: settings.default_duration_minutes ?? 120,
                confirmationMessage: settings.confirmation_message ?? "Thank you for your reservation!",
            }}
            slug={slug}
        />
    );
}
