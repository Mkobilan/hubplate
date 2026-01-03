"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import Image from "next/image";

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    onRemove: (url: string) => void;
    bucketName?: string;
    label?: string;
    className?: string;
}

export function ImageUpload({
    value,
    onChange,
    onRemove,
    bucketName = "images", // default bucket
    label = "Upload Image",
    className
}: ImageUploadProps) {
    const [loading, setLoading] = useState(false);

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            setLoading(true);
            const supabase = createClient();

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            onChange(data.publicUrl);
            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload image");
        } finally {
            setLoading(false);
        }
    };

    if (value) {
        return (
            <div className={`relative w-full h-40 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center ${className}`}>
                <div className="relative w-full h-full">
                    <img
                        src={value}
                        alt="Upload"
                        className="w-full h-full object-cover"
                    />
                </div>
                <button
                    onClick={() => onRemove(value)}
                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-lg z-10"
                    type="button"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div className={`w-full ${className}`}>
            {label && <p className="text-sm font-medium text-slate-400 mb-2">{label}</p>}
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-800 border-dashed rounded-lg cursor-pointer hover:bg-slate-900/50 hover:border-slate-700 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {loading ? (
                        <Loader2 className="h-8 w-8 text-orange-500 animate-spin mb-2" />
                    ) : (
                        <Upload className="h-8 w-8 text-slate-500 group-hover:text-slate-400 mb-2 transition-colors" />
                    )}
                    <p className="text-xs text-slate-500 group-hover:text-slate-400">
                        {loading ? "Uploading..." : "Click to upload"}
                    </p>
                </div>
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onUpload}
                    disabled={loading}
                />
            </label>
        </div>
    );
}
