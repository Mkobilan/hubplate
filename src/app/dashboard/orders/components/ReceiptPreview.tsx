"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface ReceiptPreviewProps {
    orderId: string;
}

export default function ReceiptPreview({ orderId }: ReceiptPreviewProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const supabase = createClient();

                // 1. Fetch Order Basic Info
                const { data: order, error: orderError } = await (supabase as any)
                    .from("orders")
                    .select("*")
                    .eq("id", orderId)
                    .single();

                if (orderError) throw orderError;

                // 2. Fetch Related Data in Parallel
                const [locationRes, customerRes] = await Promise.all([
                    // Fetch Location
                    (supabase as any).from("locations").select("*").eq("id", order.location_id).single(),
                    // Fetch Customer (if exists)
                    order.customer_id
                        ? (supabase as any).from("customers").select("first_name, last_name").eq("id", order.customer_id).single()
                        : Promise.resolve({ data: null, error: null })
                ]);

                if (locationRes.error) console.error("Location fetch error:", locationRes.error);

                // Construct the full object expected by the UI
                setData({
                    ...order,
                    location: locationRes.data || {},
                    customer: customerRes.data || null,
                    items: order.items || []
                });

            } catch (err: any) {
                console.error("Error fetching receipt data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [orderId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p>Generating Receipt...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-8 text-center text-red-400">
                <p>Could not load receipt data.</p>
            </div>
        );
    }

    const { location, items, subtotal, tax, total, table_number, created_at, id, customer } = data;
    const date = new Date(created_at).toLocaleString();

    return (
        <div className="w-full bg-white text-black p-4 font-mono text-sm shadow-xl mx-auto max-w-[300px] leading-tight print-content">
            {/* Header */}
            <div className="text-center mb-4 border-b border-black/10 pb-4">
                <h1 className="text-xl font-bold uppercase mb-1">{location.name}</h1>
                {location.address && <p className="text-xs">{location.address}</p>}
                {location.phone && <p className="text-xs">{location.phone}</p>}
                {location.email && <p className="text-xs">{location.email}</p>}
            </div>

            {/* Info */}
            <div className="mb-4 text-xs space-y-1">
                <div className="flex justify-between">
                    <span>Order #:</span>
                    <span>{id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{date}</span>
                </div>
                {table_number && (
                    <div className="flex justify-between">
                        <span>Table:</span>
                        <span>{table_number}</span>
                    </div>
                )}
                {customer && (
                    <div className="flex justify-between">
                        <span>Customer:</span>
                        <span>{customer.first_name} {customer.last_name}</span>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="border-t border-b border-black border-dashed py-2 mb-4">
                <div className="grid grid-cols-12 font-bold mb-2">
                    <span className="col-span-2">Qty</span>
                    <span className="col-span-7">Item</span>
                    <span className="col-span-3 text-right">Price</span>
                </div>
                <div className="space-y-2">
                    {items.map((item: any, idx: number) => (
                        <div key={idx}>
                            <div className="grid grid-cols-12">
                                <span className="col-span-2">{item.quantity}</span>
                                <span className="col-span-7 font-bold">{item.name}</span>
                                <span className="col-span-3 text-right">{formatCurrency(item.price)}</span>
                            </div>
                            {/* Support for add_ons (from JSON) or specific modifiers if used elsewhere */}
                            {item.add_ons && item.add_ons.length > 0 && (
                                <div className="pl-6 text-xs text-gray-600">
                                    {item.add_ons.map((ao: any, i: number) => (
                                        <div key={i}>+ {ao.name} ({formatCurrency(ao.price)})</div>
                                    ))}
                                </div>
                            )}
                            {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                                <div className="pl-6 text-xs text-gray-600">
                                    {Object.entries(item.modifiers).map(([key, value]) => (
                                        <div key={key}>+ {value as string}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-6 text-right">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-black pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>

            {/* Tips Section */}
            <div className="mb-8 space-y-6 pt-4 border-t border-black border-dashed">
                <div className="flex justify-between items-end">
                    <span className="font-bold text-lg">Tip:</span>
                    <span className="border-b border-black w-32"></span>
                </div>
                <div className="flex justify-between items-end">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="border-b border-black w-32"></span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs space-y-2">
                <p className="font-bold">Thank you for dining with us!</p>
                <p>Please come again.</p>
                <div className="mt-4 pt-4 border-t border-black/10">
                    <p className="text-[10px] text-gray-500">Powered by HubPlate</p>
                </div>
            </div>
        </div>
    );
}
