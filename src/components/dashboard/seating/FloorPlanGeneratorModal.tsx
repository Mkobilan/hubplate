"use client";

import { useState } from "react";
import {
    X,
    Upload,
    Sparkles,
    Loader2,
    Check,
    Layout,
    Plus,
    Maximize,
    MousePointer2
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface FloorPlanGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
}

export function FloorPlanGeneratorModal({ isOpen, onClose, locationId }: FloorPlanGeneratorModalProps) {
    const router = useRouter();
    const [step, setStep] = useState<"upload" | "processing" | "review">("upload");
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [parsedLayout, setParsedLayout] = useState<any[]>([]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFile(file);
            handleGenerate(file);
        }
    };

    const handleGenerate = async (file: File) => {
        setStep("processing");
        setIsProcessing(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("locationId", locationId);

            const response = await fetch("/api/ai/parse-floorplan", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Failed to parse floor plan");

            const data = await response.json();
            setParsedLayout(data.tables || []);
            setStep("review");
        } catch (err: any) {
            toast.error(err.message);
            setStep("upload");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        setIsProcessing(true);
        try {
            const response = await fetch("/api/seating/save-generated", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    locationId,
                    tables: parsedLayout,
                    name: "AI Generated Layout"
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to save layout");
            }

            const data = await response.json();
            toast.success("Floor plan created successfully!");
            onClose();

            // Redirect to editor for the new map
            if (data.mapId) {
                router.push(`/dashboard/seating/editor?mapId=${data.mapId}`);
            } else {
                window.location.reload();
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="AI Floor Plan Generator"
            className="max-w-4xl"
        >
            <div className="space-y-6 pt-4">
                {step === "upload" && (
                    <div className="space-y-6">
                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6 flex items-start gap-4">
                            <Sparkles className="h-6 w-6 text-orange-500 shrink-0" />
                            <div>
                                <h3 className="font-bold text-orange-200">How it works</h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    Upload a photo or PDF of your restaurant's floor plan. Our AI will identify tables, booths, and bars, and automatically create a digital layout for you.
                                </p>
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-slate-700 rounded-2xl p-16 text-center hover:border-orange-500/50 transition-colors cursor-pointer relative group">
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect} accept="image/*,.pdf" />
                            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <Upload className="h-8 w-8 text-slate-500" />
                            </div>
                            <h3 className="text-lg font-bold">Upload Floor Plan Image</h3>
                            <p className="text-sm text-slate-500">Supports JPG, PNG, or PDF</p>
                        </div>
                    </div>
                )}

                {step === "processing" && (
                    <div className="py-20 text-center space-y-6">
                        <div className="relative inline-block">
                            <Loader2 className="h-16 w-16 text-orange-500 animate-spin" />
                            <Sparkles className="h-8 w-8 text-orange-400 absolute -top-2 -right-2 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Analyzing Layout...</h2>
                            <p className="text-slate-400 max-w-sm mx-auto mt-2">
                                Our AI is identifying tables, chair positions, and booth layouts from your image.
                            </p>
                        </div>
                    </div>
                )}

                {step === "review" && (
                    <div className="space-y-6">
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                            <Check className="h-5 w-5 text-green-500" />
                            <p className="text-sm text-green-200/80">
                                AI successfully identified <b>{parsedLayout.length} objects</b>. Please review the detected layout.
                            </p>
                        </div>

                        <div className="card bg-slate-900 border-slate-800 h-[400px] relative overflow-hidden flex items-center justify-center border-dashed">
                            {/* Mini Preview Visualization */}
                            <div className="grid grid-cols-4 gap-4 p-8 opacity-50">
                                {parsedLayout.slice(0, 12).map((tbl, i) => (
                                    <div key={i} className="w-12 h-12 border-2 border-orange-500/30 rounded-lg flex items-center justify-center text-[10px] font-bold text-orange-500/50">
                                        {tbl.label}
                                    </div>
                                ))}
                            </div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[1px]">
                                <Layout className="h-12 w-12 text-slate-700 mb-4" />
                                <p className="text-sm text-slate-400">Layout Preview Ready</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep("upload")} className="btn btn-secondary flex-1">Start Over</button>
                            <button onClick={handleSave} className="btn btn-primary flex-1" disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                Create Section & Tables
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
