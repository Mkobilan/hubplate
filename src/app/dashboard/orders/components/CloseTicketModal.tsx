"use client";

import { useState } from "react";
import { X, Printer, CreditCard, QrCode, Loader2, Copy, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

interface CloseTicketModalProps {
    orderId: string;
    tableNumber: string;
    orderType: string;
    total: number;
    onClose: () => void;
}

export default function CloseTicketModal({
    orderId,
    tableNumber,
    orderType,
    total,
    onClose
}: CloseTicketModalProps) {
    const [activeOption, setActiveOption] = useState<"print" | "card" | "qr" | null>(null);
    const [copied, setCopied] = useState(false);

    // Generate payment URL for QR code
    const paymentUrl = typeof window !== "undefined"
        ? `${window.location.origin}/pay/${orderId}`
        : `/pay/${orderId}`;

    const copyPaymentLink = async () => {
        await navigator.clipboard.writeText(paymentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative card w-full max-w-md animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Close Ticket</h2>
                        <p className="text-slate-400 text-sm">
                            {orderType === "dine_in" ? `Table ${tableNumber}` : orderType.toUpperCase()}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400">Total Due</p>
                        <p className="text-2xl font-bold text-orange-400">{formatCurrency(total)}</p>
                    </div>
                </div>

                {/* Payment Options */}
                {!activeOption && (
                    <div className="space-y-3">
                        <button
                            onClick={() => setActiveOption("print")}
                            className="w-full flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-slate-600 hover:bg-slate-800 transition-all group"
                        >
                            <div className="p-3 bg-slate-700 rounded-lg group-hover:bg-slate-600 transition-colors">
                                <Printer className="h-6 w-6 text-slate-300" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-slate-100">Print Ticket</p>
                                <p className="text-sm text-slate-400">Print check for the table</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveOption("card")}
                            className="w-full flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-slate-600 hover:bg-slate-800 transition-all group"
                        >
                            <div className="p-3 bg-slate-700 rounded-lg group-hover:bg-slate-600 transition-colors">
                                <CreditCard className="h-6 w-6 text-slate-300" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-slate-100">Use Card</p>
                                <p className="text-sm text-slate-400">NFC or card reader</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveOption("qr")}
                            className="w-full flex items-center gap-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl hover:border-orange-500/50 hover:bg-orange-500/20 transition-all group"
                        >
                            <div className="p-3 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-colors">
                                <QrCode className="h-6 w-6 text-orange-400" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-orange-400">Use QR Code</p>
                                <p className="text-sm text-slate-400">Customer scans to pay</p>
                            </div>
                        </button>
                    </div>
                )}

                {/* Print Option - Coming Soon */}
                {activeOption === "print" && (
                    <div className="text-center py-8">
                        <Printer className="h-16 w-16 mx-auto text-slate-500 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-300 mb-2">Printer Setup Required</h3>
                        <p className="text-slate-400 text-sm mb-6">
                            Thermal printer integration coming soon.<br />
                            Connect a Bluetooth receipt printer to enable this feature.
                        </p>
                        <button onClick={() => setActiveOption(null)} className="btn-secondary">
                            Back to Options
                        </button>
                    </div>
                )}

                {/* Card Option - Coming Soon */}
                {activeOption === "card" && (
                    <div className="text-center py-8">
                        <CreditCard className="h-16 w-16 mx-auto text-slate-500 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-300 mb-2">Card Reader Setup Required</h3>
                        <p className="text-slate-400 text-sm mb-6">
                            Stripe Terminal integration coming soon.<br />
                            This will enable NFC tap-to-pay and Bluetooth card readers.
                        </p>
                        <button onClick={() => setActiveOption(null)} className="btn-secondary">
                            Back to Options
                        </button>
                    </div>
                )}

                {/* QR Code Option */}
                {activeOption === "qr" && (
                    <div className="text-center">
                        <p className="text-slate-400 text-sm mb-4">
                            Customer scans this code to pay
                        </p>
                        <div className="bg-white p-4 rounded-xl inline-block mb-4">
                            <QRCodeSVG
                                value={paymentUrl}
                                size={200}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <code className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                                {paymentUrl.slice(0, 40)}...
                            </code>
                            <button
                                onClick={copyPaymentLink}
                                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded transition-colors"
                                title="Copy link"
                            >
                                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                            </button>
                        </div>
                        <button onClick={() => setActiveOption(null)} className="btn-secondary">
                            Back to Options
                        </button>
                    </div>
                )}

                {/* Close button */}
                <div className="mt-6 pt-4 border-t border-slate-800">
                    <button onClick={onClose} className="btn-ghost w-full">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
