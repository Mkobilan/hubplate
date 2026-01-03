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
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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
                mimeType: imageBase64.startsWith('data:') ? imageBase64.split(';')[0].split(':')[1] : "image/jpeg",
                data: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64,
            },
        },
    ]);

    const text = result.response.text();
    console.log('Gemini Raw Response:', text);

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        console.error('No JSON array found in Gemini response:', text);
        throw new Error("Failed to parse menu items from image. Gemini response was not in the expected format.");
    }

    return JSON.parse(jsonMatch[0]) as ParsedMenuItem[];
}

// Generate AI upsell suggestions for an item
export async function generateUpsellSuggestions(
    itemName: string,
    menuItems: { name: string; category: string; price: number }[],
    orderContext?: { time: string; existingItems: string[] }
): Promise<UpsellSuggestion[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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

// Detailed Menu Suggestions for the AI Suggestions Page
export async function generateMenuSuggestions(
    existingMenu: string[],
    inventoryItems: string[],
    customPrompt: string,
    cuisineStyle: string = "General"
): Promise<{
    name: string;
    description: string;
    reasoning: string;
    estimatedProfit: number;
    popularity: string;
    difficulty: string;
    prepTime: string;
}[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are a world-class executive chef and restaurant consultant.
    
Context:
- Restaurant Style: ${cuisineStyle}
- Current Menu: ${existingMenu.slice(0, 50).join(", ")}
- Available Inventory: ${inventoryItems.length > 0 ? inventoryItems.slice(0, 50).join(", ") : "Infer from menu items"}

User's Request: "${customPrompt}"

Task: Suggest 3-5 innovative menu items that strictly follow the user's request.
If the user asks for a specific category (e.g. "sandwich", "drink"), ONLY suggest that.
If the inventory is empty, infer likely ingredients from the existing menu (e.g., if they have "Cheeseburger", they have beef, cheese, buns).

For each item provide:
1. Name & Description
2. Reasoning: Why this fits the request/trends?
3. Estimated Profit: A realistic dollar amount (e.g. 8.50) based on typical industry margins.
4. Popularity: "High", "Trending", "Stable"
5. Difficulty: "Easy", "Medium", "Hard"
6. Prep Time: e.g. "15 mins"
7. Recipe: Brief list of key ingredients and 2-3 step instructions.

Return ONLY a JSON array with this structure:
[
  {
    "name": "Item Name",
    "description": "Appetizing description",
    "reasoning": "Why this works...",
    "estimatedProfit": 8.50,
    "popularity": "High",
    "difficulty": "Medium",
    "prepTime": "15 mins",
    "recipe": {
        "ingredients": ["ing1", "ing2"],
        "instructions": ["step1", "step2"]
    }
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

// AI Reorder Suggestions based on sales velocity and stock levels
export async function generateReorderSuggestions(
    inventoryItems: { name: string; stock: number; parLevel: number; unit: string; avgDailyUsage: number }[]
): Promise<{ itemName: string; reorderQty: number; urgency: "critical" | "moderate" | "low"; reasoning: string }[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are an inventory management AI. Analyze stock levels and suggest reorder quantities.

Current Inventory:
${inventoryItems.map((i) => `- ${i.name}: ${i.stock} ${i.unit} (Par: ${i.parLevel}, Daily Usage: ${i.avgDailyUsage})`).join("\n")}

For items running low:
1. Calculate days until stockout
2. Suggest reorder quantity to reach par + 3 days buffer
3. Assign urgency: "critical" (< 2 days), "moderate" (2-5 days), "low" (> 5 days)

Return ONLY a JSON array for items needing reorder:
[
  {"itemName": "Item Name", "reorderQty": 50, "urgency": "critical", "reasoning": "Will run out in 1.5 days based on current usage"}
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

// AI Waste Reduction Insights
export async function generateWasteReductionInsights(
    wasteData: { item: string; quantity: number; reason: string; cost: number }[]
): Promise<{ insight: string; recommendation: string; potentialSavings: number }[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are a food waste reduction expert. Analyze waste patterns and provide actionable insights.

Recent Waste Logs:
${wasteData.map((w) => `- ${w.item}: ${w.quantity} units, Reason: ${w.reason}, Cost: $${w.cost}`).join("\n")}

Provide 3 specific, actionable insights to reduce waste. Consider:
- Par level adjustments
- FIFO improvements
- Prep timing optimization
- Menu engineering changes

Return ONLY a JSON array:
[
  {"insight": "Brief observation", "recommendation": "Specific action to take", "potentialSavings": 150.00}
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

// Parse a floor plan image into structured table data
export async function parseFloorplan(imageBase64: string): Promise<{ tables: any[] }> {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are a floor plan analysis expert. Analyze this restaurant floor plan image and identify all tables and seating objects.
        
For each object, provide:
1. label (e.g., T1, T2, Booth 5, Bar 1)
2. shape (rect, circle, or booth)
3. x, y (relative coordinates 0-1000)
4. width, height (relative sizes)
5. capacity (integer)

Return ONLY a JSON object:
{
  "tables": [
    { "label": "T1", "shape": "rect", "x": 100, "y": 150, "width": 60, "height": 60, "capacity": 4 },
    ...
  ]
}`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                mimeType: imageBase64.startsWith('data:') ? imageBase64.split(';')[0].split(':')[1] : "image/jpeg",
                data: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64,
            },
        },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error("Failed to parse AI response: No JSON found");
    }

    return JSON.parse(jsonMatch[0]);
}
