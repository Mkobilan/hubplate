"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Smartphone,
    Nfc,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Loader2,
    Wifi,
    X,
    ChevronRight,
    Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Capacitor } from '@capacitor/core';
import { StripeTerminal, TerminalConnectTypes } from '@capacitor-community/stripe-terminal';
import { QRCodeSVG } from "qrcode.react";

export default function TapToPayPage() {
    const { t } = useTranslation();
    const [isNative, setIsNative] = useState(false);
    const [isSetUp, setIsSetUp] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [testMode, setTestMode] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [reader, setReader] = useState<any>(null);
    const [downloadUrl, setDownloadUrl] = useState("");

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
        setDownloadUrl(window.location.origin + "/hubplate.apk");
    }, []);

    const initializeTerminal = async () => {
        try {
            await StripeTerminal.initialize({
                tokenProviderEndpoint: window.location.origin + '/api/stripe/connection-token',
                isTest: testMode
            });
            return true;
        } catch (err) {
            console.error("Failed to init terminal", err);
            setStatusMessage("Failed to initialize payment system.");
            return false;
        }
    };

    const handleSetup = async () => {
        if (!isNative) return;

        setIsConnecting(true);
        setStatusMessage("Initializing...");

        const initSuccess = await initializeTerminal();
        if (!initSuccess) {
            setIsConnecting(false);
            return;
        }

        setStatusMessage("Searching for readers...");

        try {
            // Discover "Local Mobile" readers (Tap to Pay on Phone)
            const result = await StripeTerminal.discoverReaders({
                type: TerminalConnectTypes.TapToPay,
                locationId: "tml_123" // Ideally fetched from location settings
            });

            if (result.readers.length > 0) {
                const selectedReader = result.readers[0];
                setStatusMessage("Connecting to reader...");

                await StripeTerminal.connectReader({
                    reader: selectedReader
                });

                setReader(selectedReader);
                setIsSetUp(true);
                setStatusMessage("Connected!");
            } else {
                setStatusMessage("No readers found. Ensure NFC is on.");
            }
        } catch (error) {
            console.error("Setup error:", error);
            setStatusMessage("Error connecting: " + (error as any).message);
        } finally {
            setIsConnecting(false);
        }
    };

    // Web Fallback View
    if (!isNative) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Nfc className="h-8 w-8 text-orange-500" />
                            Tap-to-Pay Setup
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Accept contactless payments using your phone.
                        </p>
                    </div>
                </div>

                <div className="card p-12 text-center max-w-2xl mx-auto border-blue-500/30 bg-blue-500/5">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Download className="h-10 w-10 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Download the HubPlate App</h2>
                    <p className="text-slate-400 mb-8 max-w-md mx-auto">
                        Tap to Pay requires direct access to your device's NFC chip.
                        Please download the Hubplate App on your Android device to use this feature.
                    </p>

                    <div className="flex flex-col items-center gap-8">
                        <div className="p-4 bg-white rounded-2xl shadow-xl">
                            <QRCodeSVG value={downloadUrl} size={160} />
                            <p className="text-slate-900 text-xs font-bold mt-2">SCAN TO DOWNLOAD</p>
                        </div>

                        <div className="flex justify-center gap-4">
                            <a
                                href="/hubplate.apk"
                                download
                                className="btn btn-primary px-8 py-3"
                            >
                                <Download className="h-4 w-4" />
                                Download for Android
                            </a>
                        </div>

                        <p className="text-xs text-slate-500 italic">
                            iOS version coming soon to the App Store.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Nfc className="h-8 w-8 text-orange-500" />
                        Tap-to-Pay Setup
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Accept contactless payments directly on your phone
                    </p>
                </div>
                <Link href="/dashboard/settings/payments" className="btn btn-secondary">
                    ← Back
                </Link>
            </div>

            {!isSetUp ? (
                <div className="card p-8 lg:p-12 text-center max-w-3xl mx-auto space-y-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                        <Smartphone className="w-12 h-12 text-white" />
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold">Turn your phone into a terminal</h2>
                        <p className="text-slate-400 text-lg max-w-xl mx-auto">
                            Accept contactless payments using just your device.
                        </p>
                    </div>

                    {statusMessage && (
                        <div className="p-4 bg-slate-800 rounded-xl text-amber-400 font-mono text-sm">
                            {statusMessage}
                        </div>
                    )}

                    <div className="pt-6 space-y-4">
                        <button
                            onClick={handleSetup}
                            disabled={isConnecting}
                            className="btn btn-primary px-12 py-4 text-lg rounded-2xl shadow-xl shadow-orange-500/20"
                        >
                            {isConnecting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    {statusMessage || "Connecting..."}
                                </>
                            ) : (
                                <>
                                    Enable Tap-to-Pay
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Test Mode Toggle */}
                    <div
                        onClick={() => setTestMode(!testMode)}
                        className={cn(
                            "flex items-center justify-between p-4 rounded-xl border cursor-pointer max-w-sm mx-auto mt-8",
                            testMode ? "bg-amber-500/10 border-amber-500/50" : "bg-slate-900/50 border-slate-800"
                        )}
                    >
                        <div className="text-left">
                            <p className="font-bold text-sm">Test Mode</p>
                            <p className="text-xs text-slate-500">Simulate readers</p>
                        </div>
                        <div className={cn(
                            "w-10 h-5 rounded-full relative transition-colors",
                            testMode ? "bg-amber-500" : "bg-slate-700"
                        )}>
                            <div className={cn(
                                "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform",
                                testMode ? "translate-x-5" : ""
                            )} />
                        </div>
                    </div>

                </div>
            ) : (
                <div className="card border-green-500/30 bg-green-500/5">
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 className="h-6 w-6 text-green-400" />
                        <h3 className="text-xl font-bold text-green-400">Tap-to-Pay Active</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-6">
                        Connected to reader: <strong>{reader?.label || "Local Device"}</strong>
                    </p>
                    <div className="p-4 bg-slate-900/50 rounded-xl">
                        <p className="text-center text-slate-500 mb-4">Ready to accept payments</p>
                        <button className="btn btn-primary w-full py-4 text-lg" onClick={() => StripeTerminal.collectPaymentMethod({ paymentIntent: "pi_example_secret" })}>
                            Test Transaction (Requires Intent)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
