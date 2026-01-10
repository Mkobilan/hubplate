import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractTextFromPDF } from "@/lib/pdf/pdfUtils";
import { ParsedRecipe } from "@/lib/csv/csvUtils";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 1. Extract text from PDF
        const pdfText = await extractTextFromPDF(buffer);

        if (!pdfText || pdfText.trim().length === 0) {
            return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
        }

        // 2. Send to Gemini for parsing
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
            You are an expert recipe parser. I will provide you with the text content of a recipe book (PDF).
            Your task is to extract all recipes and structure them into a JSON format.

            The text contains multiple recipes. Each recipe likely has a name, ingredients, and instructions.

            Return a JSON array of objects with the following structure:
            [
                {
                    "name": "Recipe Name",
                    "description": "Brief description (if available)",
                    "ingredients_raw": "Original ingredients text",
                    "instructions": "Full cooking instructions",
                    "parsed_ingredients": [
                        { "name": "Ingredient Name", "quantity": 1.5, "unit": "oz" }
                    ]
                }
            ]

            Rules:
            1. Extract as many recipes as you find.
            2. For 'parsed_ingredients', try to normalize units and quantities. If unclear, default quantity to 1 and unit to "unit".
            3. 'ingredients_raw' should be a single string containing the ingredients list from the source.
            4. Respond ONLY with the JSON array. Do not include markdown formatting (like \`\`\`json).

            PDF Content:
            ${pdfText.slice(0, 30000)} {/* Limit context window if needed, though Flash handles decent size */}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();

        // Parse JSON response
        const recipes = JSON.parse(responseText);

        // Map to ParsedRecipe type ensuring all fields exist
        const parsedRecipes: ParsedRecipe[] = recipes.map((r: any, index: number) => ({
            name: r.name || "Untitled Recipe",
            description: r.description,
            instructions: r.instructions,
            ingredients_raw: r.ingredients_raw || "",
            parsed_ingredients: r.parsed_ingredients || [],
            custom_fields: {},
            validation_errors: [],
            row_index: index + 1
        }));

        return NextResponse.json({ recipes: parsedRecipes });

    } catch (error) {
        console.error("PDF Parsing Error:", error);
        return NextResponse.json({ error: "Failed to process PDF" }, { status: 500 });
    }
}
