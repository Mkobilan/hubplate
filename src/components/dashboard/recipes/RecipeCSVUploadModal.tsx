"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
    Upload,
    FileSpreadsheet,
    X,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Check,
    AlertCircle,
    Sparkles,
    ArrowRight,
    CheckCircle,
    BookOpen,
    Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import {
    STANDARD_RECIPE_FIELDS,
    type FieldMapping,
    type AIFieldMappingSuggestion,
    type RecipeFieldKey,
    type ParsedRecipe,
    transformCSVToRecipes,
    cleanIngredientName
} from "@/lib/csv/csvUtils";
import type { Database } from "@/types/database";

type RecipeInsert = Database["public"]["Tables"]["recipes"]["Insert"];
type IngredientInsert = Database["public"]["Tables"]["recipe_ingredients"]["Insert"];
type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];

interface RecipeCSVUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
    onComplete: () => void;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "result";

interface ImportResult {
    success: boolean;
    total_processed: number;
    successful_imports: number;
    failed_imports: number;
    created_recipes: { id: string; name: string }[];
    errors: { row: number; name: string; error: string }[];
}

export default function RecipeCSVUploadModal({
    isOpen,
    onClose,
    locationId,
    onComplete
}: RecipeCSVUploadModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
    const [mappings, setMappings] = useState<FieldMapping[]>([]);
    const [aiSuggestions, setAiSuggestions] = useState<AIFieldMappingSuggestion[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [parsedRecipes, setParsedRecipes] = useState<ParsedRecipe[]>([]);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setStep("upload");
        setCsvData([]);
        setMappings([]);
        setAiSuggestions([]);
        setParsedRecipes([]);
        setImportResult(null);
        setError(null);
        setIsLoadingAI(false);
        setLoading(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileSelect = async (file: File) => {
        const isCSV = file.name.toLowerCase().endsWith(".csv");
        const isPDF = file.name.toLowerCase().endsWith(".pdf");

        if (!isCSV && !isPDF) {
            setError("Please upload a CSV or PDF file");
            return;
        }

        setLoading(true);
        setError(null);

        if (isPDF) {
            // Handle PDF Upload
            try {
                setStep("importing"); // Temporary loading state or custom "parsing" state
                const formData = new FormData();
                formData.append("file", file);

                const response = await fetch("/api/ai/parse-pdf-recipe", {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Failed to parse PDF");
                }

                const { recipes } = await response.json();
                setParsedRecipes(recipes);
                setStep("preview");
            } catch (err: unknown) {
                const error = err as Error;
                setError("Error parsing PDF: " + error.message);
                setStep("upload");
            } finally {
                setLoading(false);
            }
        } else {
            // Handle CSV Upload (Existing Logic)
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    if (results.meta.fields && results.meta.fields.length > 0) {
                        const headers = results.meta.fields;
                        setCsvData(results.data as Record<string, string>[]);
                        setStep("mapping");

                        // Initialize with basic auto-mapping
                        const initialMappings: FieldMapping[] = headers.map(header => {
                            const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
                            let target: RecipeFieldKey | "skip" = "skip";

                            if (h === 'name' || h === 'recipe' || h === 'cocktail' || h === 'drink' || h === 'title') target = 'name';
                            else if (h === 'description' || h === 'desc' || h === 'about') target = 'description';
                            else if (h === 'instructions' || h === 'steps' || h === 'method' || h === 'directions') target = 'instructions';
                            else if (h === 'ingredients' || h === 'items' || h === 'components') target = 'ingredients';

                            return {
                                csvColumn: header,
                                targetField: target
                            };
                        });
                        setMappings(initialMappings);

                        // Get AI suggestions
                        setIsLoadingAI(true);
                        try {
                            const response = await fetch("/api/ai/csv-mapping", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    headers,
                                    sampleData: results.data.slice(0, 5),
                                    type: "recipe"
                                })
                            });

                            if (response.ok) {
                                const { suggestions } = await response.json();
                                setAiSuggestions(suggestions);

                                setMappings(prev => prev.map(m => {
                                    const s = suggestions.find((suggest: AIFieldMappingSuggestion) => suggest.csvColumn === m.csvColumn);
                                    if (s && s.confidence > 0.7 && s.suggestedField !== "skip") {
                                        return {
                                            ...m,
                                            targetField: s.suggestedField as RecipeFieldKey,
                                            customFieldName: s.customFieldName,
                                            customFieldLabel: s.customFieldLabel
                                        };
                                    }
                                    return m;
                                }));
                            }
                        } catch (err) {
                            console.error("AI Mapping failed", err);
                        } finally {
                            setIsLoadingAI(false);
                        }
                    } else {
                        setError("Could not find headers in CSV");
                    }
                    setLoading(false);
                },
                error: (err) => {
                    setError("Error parsing CSV: " + err.message);
                    setLoading(false);
                }
            });
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const updateMapping = (csvColumn: string, updates: Partial<FieldMapping>) => {
        setMappings(prev => prev.map(m =>
            m.csvColumn === csvColumn ? { ...m, ...updates } : m
        ));
    };

    const handlePreview = () => {
        const recipes = transformCSVToRecipes(csvData, mappings);
        setParsedRecipes(recipes);
        setStep("preview");
    };

    const handleImport = async () => {
        if (parsedRecipes.length === 0) return;

        setStep("importing");
        setError(null);

        const supabase = createClient();
        const result: ImportResult = {
            success: true,
            total_processed: parsedRecipes.length,
            successful_imports: 0,
            failed_imports: 0,
            created_recipes: [],
            errors: []
        };

        try {
            // 0. Fetch all inventory items once for efficient matching
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: inventoryItems } = await (supabase.from("inventory_items") as any)
                .select("id, name")
                .eq("location_id", locationId);

            // 0b. Fetch all menu items for auto-linking
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: menuItems } = await (supabase.from("menu_items") as any)
                .select("id, name")
                .eq("location_id", locationId);

            for (const recipe of parsedRecipes) {
                // Skip recipes with critical validation errors
                if (!recipe.name || recipe.validation_errors.some(e => e.column === "name")) {
                    result.failed_imports++;
                    result.errors.push({
                        row: recipe.row_index,
                        name: recipe.name || "Unknown",
                        error: "Missing recipe name"
                    });
                    continue;
                }

                try {
                    // Placeholder for missing recipe name to avoid DB constraint violation
                    const finalRecipeName = recipe.name || `Unnamed Recipe ${new Date().toLocaleDateString()}_${Math.floor(Math.random() * 1000)}`;

                    // 1. Create the recipe
                    const recipeData: RecipeInsert = {
                        location_id: locationId,
                        name: finalRecipeName,
                        description: recipe.description || "",
                        instructions: recipe.instructions || ""
                    };

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data: createdRecipe, error: recipeError } = await (supabase.from("recipes") as any)
                        .insert(recipeData)
                        .select()
                        .single();

                    if (recipeError) throw recipeError;

                    // 2. Always store ingredients (with or without inventory match)
                    if (createdRecipe && recipe.parsed_ingredients.length > 0) {
                        for (const ing of recipe.parsed_ingredients) {
                            // Try to match inventory item by name
                            let inventoryItemId: string | null = null;

                            if (inventoryItems && inventoryItems.length > 0) {
                                const rawName = ing.name.trim();
                                const cleanedName = cleanIngredientName(rawName) || rawName.toLowerCase();

                                console.log(`[Import] Matching: "${rawName}" -> Cleaned: "${cleanedName}"`);

                                // Strategy 1: Exact Match
                                let match = inventoryItems.find((item: InventoryItem) =>
                                    item.name.toLowerCase().trim() === rawName.toLowerCase()
                                );

                                // Strategy 2: Clean Match
                                if (!match && cleanedName !== rawName.toLowerCase()) {
                                    match = inventoryItems.find((item: InventoryItem) =>
                                        item.name.toLowerCase().trim() === cleanedName
                                    );
                                }

                                // Strategy 3: Fuzzy Match
                                if (!match) {
                                    match = inventoryItems.find((item: InventoryItem) =>
                                        item.name.toLowerCase().includes(cleanedName) ||
                                        cleanedName.includes(item.name.toLowerCase().trim())
                                    );
                                }

                                if (match) {
                                    console.log(`[Import] ✅ MATCH FOUND for "${rawName}": ${match.name}`);
                                    inventoryItemId = match.id;
                                } else {
                                    console.log(`[Import] ❌ NO MATCH for "${rawName}" (Cleaned: "${cleanedName}")`);
                                }
                            }

                            // Always insert the ingredient with name stored
                            const ingredientData: IngredientInsert = {
                                recipe_id: createdRecipe.id,
                                ingredient_name: ing.name,
                                inventory_item_id: inventoryItemId,
                                quantity_used: ing.quantity,
                                quantity_raw: `${ing.quantity} ${ing.unit}`,
                                unit: ing.unit
                            };
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            await (supabase.from("recipe_ingredients") as any).insert(ingredientData);
                        }
                    }

                    // 3. Auto-link Menu Items (New Feature)
                    if (createdRecipe && menuItems && menuItems.length > 0) {
                        const recipeName = finalRecipeName.trim().toLowerCase();
                        // Try Exact Match (Case insensitive)
                        const match = menuItems.find((item: { id: string; name: string }) =>
                            item.name.trim().toLowerCase() === recipeName
                        );

                        if (match) {
                            console.log(`[Import] ✅ MENU MATCH FOUND for "${finalRecipeName}": ${match.name}`);
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            await (supabase.from("recipe_menu_items") as any).insert({
                                recipe_id: createdRecipe.id,
                                menu_item_id: match.id
                            });
                        }
                    }

                    result.successful_imports++;
                    result.created_recipes.push({ id: createdRecipe.id, name: recipe.name });

                } catch (err) {
                    const error = err as Error;
                    result.failed_imports++;
                    result.errors.push({
                        row: recipe.row_index,
                        name: recipe.name,
                        error: error.message || "Unknown error"
                    });
                }
            }

            result.success = result.failed_imports === 0;
            setImportResult(result);
            setStep("result");

            if (result.successful_imports > 0) {
                onComplete();
            }

        } catch (err) {
            const error = err as Error;
            setError(error.message || "Failed to import recipes");
            setStep("preview");
        }
    };

    // Calculate valid recipes count for preview
    const validRecipesCount = useMemo(() => {
        return parsedRecipes.filter(r =>
            r.name && !r.validation_errors.some(err => err.column === "name")
        ).length;
    }, [parsedRecipes]);

    const warningsCount = useMemo(() => {
        return parsedRecipes.reduce((sum, r) => sum + r.validation_errors.length, 0);
    }, [parsedRecipes]);

    const isMappingComplete = true; // All mapping is now optional

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="card w-full max-w-3xl bg-slate-900 border-slate-800 shadow-2xl relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {step === 'upload' && <Upload className="h-5 w-5 text-orange-500" />}
                            {step === 'mapping' && <FileSpreadsheet className="h-5 w-5 text-blue-500" />}
                            {(step === 'preview' || step === 'importing') && <BookOpen className="h-5 w-5 text-green-500" />}
                            {step === 'result' && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {step === 'upload' ? "Upload Recipe Book" :
                                step === 'mapping' ? "Map CSV Columns" :
                                    step === 'preview' ? "Preview Import" :
                                        step === 'importing' ? "Importing..." :
                                            "Import Results"}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {step === 'upload' ? "Select a CSV file with your recipe book" :
                                step === 'mapping' ? "Match your CSV headers to recipe fields" :
                                    step === 'preview' ? "Review recipes before importing" :
                                        step === 'importing' ? "Please wait..." :
                                            "Import complete"}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Progress Steps */}
                {step !== "result" && step !== "importing" && (
                    <div className="flex items-center justify-center gap-2 py-4 border-b border-slate-800/50">
                        {["upload", "mapping", "preview"].map((s, i) => (
                            <div key={s} className="flex items-center">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                                    step === s ? "bg-orange-500 text-white" :
                                        ["mapping", "preview"].indexOf(step) > i ? "bg-green-500 text-white" :
                                            "bg-slate-800 text-slate-500"
                                )}>
                                    {["mapping", "preview"].indexOf(step) > i ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        i + 1
                                    )}
                                </div>
                                {i < 2 && (
                                    <div className={cn(
                                        "w-12 h-0.5 mx-1",
                                        ["mapping", "preview"].indexOf(step) > i ? "bg-green-500" : "bg-slate-700"
                                    )} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 mb-4">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-400 font-medium">Error</p>
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Step: Upload */}
                    {step === "upload" && (
                        <div className="space-y-4">
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer",
                                    isDragging ? "border-orange-500 bg-orange-500/10" : "border-slate-700 hover:border-slate-600"
                                )}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".csv,.pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileSelect(file);
                                    }}
                                />
                                <FileSpreadsheet className={cn(
                                    "w-16 h-16 mx-auto mb-4",
                                    isDragging ? "text-orange-500" : "text-slate-500"
                                )} />
                                <p className="text-lg font-medium mb-2">
                                    {isDragging ? "Drop your recipe file here" : "Drag & drop your CSV or PDF"}
                                </p>
                                <p className="text-sm text-slate-500 mb-4">or click to browse</p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-400">
                                    <Upload className="w-4 h-4" />
                                    Select File
                                </div>
                            </div>

                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                                <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-200/80">
                                    <p className="font-bold mb-1">Flexible Format Support</p>
                                    <p>Your CSV can have any column names. We&apos;ll use AI to automatically detect and map your columns to recipe fields.</p>
                                    <p className="mt-2">Ingredients can be in various formats:</p>
                                    <ul className="list-disc list-inside mt-1 text-xs">
                                        <li><code className="text-blue-300">Tequila|2|oz;Lime Juice|1|oz</code></li>
                                        <li><code className="text-blue-300">2oz Tequila, 1oz Lime Juice</code></li>
                                        <li><code className="text-blue-300">Tequila, Lime Juice, Agave</code></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step: Mapping */}
                    {step === "mapping" && (
                        <div className="space-y-4">
                            {isLoadingAI && (
                                <div className="flex items-center gap-2 text-orange-400 bg-orange-500/10 px-4 py-2 rounded-lg">
                                    <Sparkles className="w-4 h-4 animate-pulse" />
                                    <span className="text-sm">AI is analyzing your columns...</span>
                                </div>
                            )}

                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                {mappings.map((mapping) => {
                                    const suggestion = aiSuggestions.find(s => s.csvColumn === mapping.csvColumn);
                                    const sampleValue = csvData[0]?.[mapping.csvColumn] || "";

                                    return (
                                        <div key={mapping.csvColumn} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium truncate">{mapping.csvColumn}</p>
                                                        {suggestion && suggestion.confidence > 0.8 && (
                                                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded uppercase font-bold flex items-center gap-1">
                                                                <Sparkles className="w-3 h-3" />
                                                                AI Match
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate">e.g., &quot;{sampleValue.substring(0, 50)}{sampleValue.length > 50 ? '...' : ''}&quot;</p>
                                                </div>

                                                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                                                <div className="w-48">
                                                    <select
                                                        className="input py-1.5 text-sm w-full bg-slate-900 border-slate-700"
                                                        value={mapping.targetField}
                                                        onChange={(e) => {
                                                            const value = e.target.value as RecipeFieldKey | "custom" | "skip";
                                                            updateMapping(mapping.csvColumn, {
                                                                targetField: value,
                                                                customFieldName: value === "custom" ? mapping.csvColumn.toLowerCase().replace(/\s+/g, "_") : undefined,
                                                                customFieldLabel: value === "custom" ? mapping.csvColumn : undefined
                                                            });
                                                        }}
                                                    >
                                                        <option value="skip">-- Skip Column --</option>
                                                        <optgroup label="Recipe Fields">
                                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                            {(Object.entries(STANDARD_RECIPE_FIELDS) as [string, any][]).map(([key, field]) => (
                                                                <option key={key} value={key}>{field.label} {field.required ? "*" : ""}</option>
                                                            ))}
                                                        </optgroup>
                                                        <option value="custom">→ Custom Field</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {mapping.targetField === 'custom' && (
                                                <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs text-slate-500">Field Name (internal)</label>
                                                        <input
                                                            type="text"
                                                            className="input py-1.5 text-sm"
                                                            value={mapping.customFieldName || ""}
                                                            onChange={(e) => updateMapping(mapping.csvColumn, { customFieldName: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                                                            placeholder="e.g., category"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-500">Display Label</label>
                                                        <input
                                                            type="text"
                                                            className="input py-1.5 text-sm"
                                                            value={mapping.customFieldLabel || ""}
                                                            onChange={(e) => updateMapping(mapping.csvColumn, { customFieldLabel: e.target.value })}
                                                            placeholder="e.g., Category"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Required fields warning removed to give user flexibility */}
                        </div>
                    )}

                    {/* Step: Preview */}
                    {step === "preview" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                                    <BookOpen className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-green-400">{validRecipesCount}</p>
                                    <p className="text-sm text-green-300">Ready to Import</p>
                                </div>
                                <div className={cn(
                                    "border rounded-xl p-4 text-center",
                                    warningsCount > 0 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-slate-900/50 border-slate-800"
                                )}>
                                    <AlertCircle className={cn("w-8 h-8 mx-auto mb-2", warningsCount > 0 ? "text-yellow-400" : "text-slate-500")} />
                                    <p className={cn("text-2xl font-bold", warningsCount > 0 ? "text-yellow-400" : "text-slate-500")}>{warningsCount}</p>
                                    <p className={cn("text-sm", warningsCount > 0 ? "text-yellow-300" : "text-slate-500")}>Warnings</p>
                                </div>
                            </div>

                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                                <div className="max-h-[200px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-800/50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-semibold">Recipe Name</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold">Ingredients</th>
                                                <th className="px-3 py-2 text-center text-xs font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {parsedRecipes.map((recipe, i) => {
                                                const hasErrors = recipe.validation_errors.length > 0;
                                                const isMissingRequired = !recipe.name;

                                                return (
                                                    <tr key={i} className={cn(
                                                        isMissingRequired ? "bg-red-500/5" : hasErrors ? "bg-yellow-500/5" : ""
                                                    )}>
                                                        <td className="px-3 py-2">
                                                            {recipe.name || <span className="text-red-400 italic">No name</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-400">
                                                            {recipe.parsed_ingredients.length > 0
                                                                ? `${recipe.parsed_ingredients.length} ingredients`
                                                                : <span className="text-yellow-400">No ingredients parsed</span>
                                                            }
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {hasErrors ? (
                                                                <AlertCircle className="w-4 h-4 text-yellow-500 mx-auto" />
                                                            ) : (
                                                                <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {warningsCount > 0 && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                                    <p className="text-xs text-yellow-400 font-bold uppercase mb-2">Warnings</p>
                                    <div className="max-h-[80px] overflow-y-auto space-y-1">
                                        {parsedRecipes.flatMap(recipe =>
                                            recipe.validation_errors.map((err, i) => (
                                                <p key={`${recipe.row_index}-${i}`} className="text-xs text-yellow-300">
                                                    Row {err.row}: {err.message}
                                                </p>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step: Importing */}
                    {step === "importing" && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-16 h-16 text-orange-500 animate-spin mb-6" />
                            <p className="text-lg font-medium mb-2">Importing Recipes...</p>
                            <p className="text-sm text-slate-500">This may take a moment</p>
                        </div>
                    )}

                    {/* Step: Result */}
                    {step === "result" && importResult && (
                        <div className="space-y-4">
                            <div className={cn(
                                "rounded-2xl p-6 text-center",
                                importResult.success ? "bg-green-500/10 border border-green-500/30" : "bg-yellow-500/10 border border-yellow-500/30"
                            )}>
                                {importResult.success ? (
                                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                ) : (
                                    <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                                )}
                                <h3 className={cn("text-2xl font-bold mb-2", importResult.success ? "text-green-400" : "text-yellow-400")}>
                                    {importResult.success ? "Import Complete!" : "Import Completed with Warnings"}
                                </h3>
                                <p className="text-slate-400">
                                    Successfully imported {importResult.successful_imports} of {importResult.total_processed} recipes
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                                    <p className="text-2xl font-bold text-green-400">{importResult.successful_imports}</p>
                                    <p className="text-xs text-slate-500">Imported</p>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                                    <p className="text-2xl font-bold text-red-400">{importResult.failed_imports}</p>
                                    <p className="text-xs text-slate-500">Failed</p>
                                </div>
                            </div>

                            {importResult.errors.length > 0 && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                                    <p className="text-xs text-red-400 font-bold uppercase mb-2">Failed Imports</p>
                                    <div className="max-h-[100px] overflow-y-auto space-y-1">
                                        {importResult.errors.map((err, i) => (
                                            <p key={i} className="text-xs text-red-300">
                                                Row {err.row} ({err.name}): {err.error}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleClose}
                                className="btn btn-primary w-full"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'mapping' && (
                    <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
                        <button
                            onClick={() => setStep('upload')}
                            className="btn btn-secondary"
                            disabled={loading}
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back
                        </button>
                        <button
                            onClick={handlePreview}
                            className="btn btn-primary bg-orange-500 hover:bg-orange-600 border-none shadow-lg shadow-orange-500/20"
                            disabled={loading || !isMappingComplete}
                        >
                            Preview Import
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </button>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
                        <button
                            onClick={() => setStep('mapping')}
                            className="btn btn-secondary"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back
                        </button>
                        <button
                            onClick={handleImport}
                            className="btn btn-primary bg-orange-500 hover:bg-orange-600 border-none shadow-lg shadow-orange-500/20"
                        >
                            Import {parsedRecipes.length} Recipes
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
