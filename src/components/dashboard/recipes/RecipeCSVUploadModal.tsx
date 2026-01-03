"use client";

import { useState } from "react";
import {
    X,
    Upload,
    AlertCircle,
    Loader2,
    Check,
    Download,
    Info,
    FileText
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import type { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type RecipeInsert = Database["public"]["Tables"]["recipes"]["Insert"];
type IngredientInsert = Database["public"]["Tables"]["recipe_ingredients"]["Insert"];

interface RecipeCSVUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    onComplete: () => void;
}

export default function RecipeCSVUploadModal({ isOpen, onClose, locationId, onComplete }: RecipeCSVUploadModalProps) {
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);

        try {
            const text = await file.text();
            const rows = text.split("\n").map(row => row.split(","));
            const headers = rows[0].map(h => h.trim().toLowerCase());

            // Simple CSV parsing - Expecting: name, description, instructions, ingredients (item|qty|unit;item|qty|unit)
            // Example Row: "Margarita", "Classic cocktail", "1. Shake 2. Pour", "Tequila|2|oz;Lime Juice|1|oz;Agave|0.5|oz"

            const nameIdx = headers.indexOf("name");
            const ingredientsIdx = headers.indexOf("ingredients");

            if (nameIdx === -1 || ingredientsIdx === -1) {
                throw new Error("CSV must contain 'name' and 'ingredients' columns");
            }

            const supabase = createClient();
            const dataRows = rows.slice(1).filter(r => r.length > 1 && r[nameIdx]);

            for (const row of dataRows) {
                const name = row[nameIdx].trim();
                const desc = headers.indexOf("description") !== -1 ? row[headers.indexOf("description")].trim() : "";
                const inst = headers.indexOf("instructions") !== -1 ? row[headers.indexOf("instructions")].trim() : "";
                const ingredientsRaw = row[ingredientsIdx].trim();

                // 1. Create Recipe
                const recipeData: RecipeInsert = {
                    location_id: locationId,
                    name: name,
                    description: desc,
                    instructions: inst
                };

                const { data: recipe, error: recipeError } = await (supabase.from("recipes") as any)
                    .insert(recipeData)
                    .select()
                    .single();

                if (recipeError) throw recipeError;

                // 2. Parse and Add Ingredients
                // Expected format: Tequila|2|oz;Lime Juice|1|oz
                const ingPairs = ingredientsRaw.split(";");
                for (const pair of ingPairs) {
                    const [invName, qty, unit] = pair.split("|").map(s => s.trim());
                    if (!invName || !qty) continue;

                    // Match inventory item by name
                    const { data: invItem } = await (supabase
                        .from("inventory_items") as any)
                        .select("id, name")
                        .eq("location_id", locationId)
                        .ilike("name", invName)
                        .single();

                    if (invItem && recipe) { // Ensure recipe is not null before inserting ingredients
                        const ingredientData: IngredientInsert = {
                            recipe_id: (recipe as any).id,
                            inventory_item_id: (invItem as any).id,
                            quantity_used: parseFloat(qty),
                            unit: unit || "unit"
                        };
                        await (supabase.from("recipe_ingredients") as any)
                            .insert(ingredientData);
                    }
                }
            }

            toast.success("Recipes imported successfully!");
            onComplete();
            onClose();
        } catch (err: any) {
            console.error("Upload error:", err);
            toast.error(err.message || "Failed to upload CSV");
        } finally {
            setUploading(false);
            setFile(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Upload className="h-5 w-5 text-orange-500" />
                        Import Recipe Book
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-200/80 leading-relaxed">
                            <p className="font-bold mb-1">CSV Format Requirements:</p>
                            <p>Columns: `name`, `description`, `instructions`, `ingredients`</p>
                            <p className="mt-1">`ingredients` format: `Item Name | Quantity | Unit` separated by semicolons (`; `).</p>
                            <p className="mt-1 font-mono text-[10px] bg-slate-900/50 p-1.5 rounded border border-slate-800">
                                Margarita,,,"Tequila|2|oz;Lime Juice|1|oz"
                            </p>
                        </div>
                    </div>

                    <div
                        className={cn(
                            "border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-10 transition-all",
                            file ? "border-green-500/50 bg-green-500/5" : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/20"
                        )}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
                        }}
                    >
                        {file ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="p-3 bg-green-500/20 rounded-full mb-3">
                                    <FileText className="h-8 w-8 text-green-500" />
                                </div>
                                <p className="font-medium text-slate-200">{file.name}</p>
                                <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                <button
                                    className="text-xs text-red-400 hover:text-red-300 mt-4 font-medium"
                                    onClick={() => setFile(null)}
                                >
                                    Replace File
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center cursor-pointer">
                                <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:bg-slate-700 transition-colors">
                                    <Upload className="h-8 w-8 text-slate-500" />
                                </div>
                                <p className="font-medium">Click to upload or drag & drop</p>
                                <p className="text-xs text-slate-500 mt-1">CSV files only</p>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                />
                            </label>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                    <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
                    <button
                        className="btn btn-primary min-w-[120px]"
                        disabled={!file || uploading}
                        onClick={handleUpload}
                    >
                        {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Check className="h-4 w-4" />
                                Import Book
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
