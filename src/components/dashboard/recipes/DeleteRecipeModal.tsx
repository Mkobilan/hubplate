"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    recipeName: string;
    isDeleting: boolean;
}

export default function DeleteRecipeModal({
    isOpen,
    onClose,
    onConfirm,
    recipeName,
    isDeleting
}: DeleteRecipeModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="card w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Delete Recipe?</h3>
                        <p className="text-slate-400 text-sm">
                            Are you sure you want to delete <span className="text-white font-medium">{recipeName}</span>? This action cannot be undone.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="btn btn-primary bg-red-600 hover:bg-red-700 text-white border-none"
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Recipe"}
                    </button>
                </div>
            </div>
        </div>
    );
}
