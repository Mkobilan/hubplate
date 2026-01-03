import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Metadata, ResolvingMetadata } from "next";

// Force dynamic rendering since we rely on the slug
export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;

    const supabase = await createClient();
    const { data: location } = await supabase
        .from("locations")
        .select("name, logo_url, banner_url")
        .eq("slug", slug)
        .eq("ordering_enabled", true)
        .single() as any;

    if (!location) {
        return {
            title: "Restaurant Not Found",
        };
    }

    return {
        title: `${location.name} - Online Ordering`,
        openGraph: {
            images: location.banner_url ? [location.banner_url] : [],
        },
    };
}

export default async function GuestLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const supabase = await createClient();

    // We fetch basic location info here to wrap the page with branding
    // The Page component will fetch the menu data
    const { data: location, error } = await supabase
        .from("locations")
        .select("*")
        .eq("slug", slug)
        .eq("ordering_enabled", true)
        .single() as any;

    if (error || !location) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Sticky Header with Dynamic Branding */}
            <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg">

                {/* Banner Image (Small) */}
                {location.banner_url && (
                    <div className="h-32 md:h-48 w-full bg-cover bg-center" style={{ backgroundImage: `url(${location.banner_url})` }} />
                )}

                <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {location.logo_url && (
                            <img
                                src={location.logo_url}
                                alt={location.name}
                                className="h-10 w-10 rounded-full bg-slate-800 object-cover border-2 border-slate-700"
                            />
                        )}
                        <h1 className="font-bold text-lg truncate max-w-[200px]">{location.name}</h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-md w-full mx-auto p-4 w-full">
                {children}
            </main>

            <footer className="py-8 text-center text-slate-600 text-xs">
                <p>Powered by HubPlate</p>
            </footer>
        </div>
    );
}
