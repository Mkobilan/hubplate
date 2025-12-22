// Gemini AI integration for menu processing and upsell suggestions
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

interface ParsedMenuItem {
    name: string;
    description: string | null;
    price: number;
    category: string;
}

interface UpsellSuggestion {
    itemName: string;
    reason: string;
    priority: number;
}

// Parse a menu photo into structured data
export async function parseMenuPhoto(imageBase64: string): Promise<ParsedMenuItem[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a restaurant menu parser. Analyze this menu image and extract all menu items.

Return a JSON array with the following structure for each item:
{
  "name": "Item Name",
  "description": "Brief description if available, or null",
  "price": 12.99,
  "category": "Appetizers" or "Entrees" or "Drinks" etc.
}

Rules:
- Extract the exact name as shown
- Parse prices as numbers (e.g., "$12.99" becomes 12.99)
- Infer category from menu sections
- If description is not visible, set to null
- Return ONLY the JSON array, no other text

JSON:`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64,
            },
        },
    ]);

    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        throw new Error("Failed to parse menu items from image");
    }

    return JSON.parse(jsonMatch[0]) as ParsedMenuItem[];
}

// Generate AI upsell suggestions for an item
export async function generateUpsellSuggestions(
    itemName: string,
    menuItems: { name: string; category: string; price: number }[],
    orderContext?: { time: string; existingItems: string[] }
): Promise<UpsellSuggestion[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a restaurant upsell expert. A customer ordered: "${itemName}"

Available menu items:
${menuItems.map((i) => `- ${i.name} (${i.category}) - $${i.price}`).join("\n")}

${orderContext ? `Time of day: ${orderContext.time}` : ""}
${orderContext?.existingItems?.length ? `Already ordered: ${orderContext.existingItems.join(", ")}` : ""}

Suggest 3 upsell items that pair well with their order. Consider:
- Complementary flavors
- Common pairings (fries with burgers, etc.)
- Higher margins (suggest appetizers, drinks, desserts)
- Time of day (coffee in morning, beer in evening)

Return ONLY a JSON array:
[
  {"itemName": "Item Name", "reason": "Brief 5-word reason", "priority": 1-3}
]

Priority 1 = best suggestion, 3 = optional

JSON:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        return [];
    }

    return JSON.parse(jsonMatch[0]) as UpsellSuggestion[];
}

// Suggest new menu items based on existing menu and ingredients
export async function suggestNewMenuItems(
    existingMenu: string[],
    availableIngredients: string[],
    cuisineStyle?: string
): Promise<{ name: string; description: string; ingredients: string[] }[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a creative chef. Suggest 5 new menu items.

Current menu items:
${existingMenu.join(", ")}

Available ingredients:
${availableIngredients.join(", ")}

${cuisineStyle ? `Cuisine style: ${cuisineStyle}` : ""}

Create unique items that:
- Use available ingredients
- Complement (don't duplicate) existing menu
- Are profitable and popular

Return ONLY a JSON array:
[
  {
    "name": "Creative Item Name",
    "description": "Appetizing 15-word description",
    "ingredients": ["ingredient1", "ingredient2"]
  }
]

JSON:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        return [];
    }

    return JSON.parse(jsonMatch[0]);
}

// Suggest ingredient substitutions
export async function suggestSubstitutions(
    itemName: string,
    originalIngredient: string,
    dietaryRestriction?: string,
    availableIngredients?: string[]
): Promise<{ substitute: string; notes: string }[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Suggest 3 substitutes for "${originalIngredient}" in "${itemName}".

${dietaryRestriction ? `Dietary requirement: ${dietaryRestriction}` : ""}
${availableIngredients ? `Available ingredients: ${availableIngredients.join(", ")}` : ""}

Return ONLY a JSON array:
[
  {"substitute": "Ingredient Name", "notes": "Brief cooking adjustment note"}
]

JSON:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        return [];
    }

    return JSON.parse(jsonMatch[0]);
}
