
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { customer, orders, customPrompt } = await req.json();

        if (!customer) {
            return NextResponse.json(
                { error: "Customer data is required" },
                { status: 400 }
            );
        }

        // Prepare context for Gemini
        const orderHistorySummary = orders
            .slice(0, 20) // Limit to last 20 orders
            .map((o: any) => {
                const items = o.items || [];
                // Handle both array of items and likely stringified JSON if it comes that way (though supabase client parses jsonb)
                const itemList = Array.isArray(items) ? items : [];
                const itemNames = itemList.map((i: any) => `${i.quantity}x ${i.name || i.menu_item_name}`).join(", ");
                return `- ${new Date(o.created_at).toLocaleDateString()}: ${itemNames} (Total: $${o.total})`;
            })
            .join("\n");

        const prompt = `
            You are an expert restaurant AI assistant. Analyze the following customer profile and order history to provide personalized recommendations.
            
            CUSTOMER PROFILE:
            - Name: ${customer.first_name} ${customer.last_name}
            - Total Visits: ${customer.total_visits}
            - Total Spent: $${customer.total_spent}
            - Loyalty Tier: ${customer.loyalty_tier || "None"}
            
            ORDER HISTORY (Last 20 orders):
            ${orderHistorySummary}
            
            MANAGER'S GOAL/CUSTOM PROMPT:
            "${customPrompt || "General retention and upsell opportunities"}"
            
            Based on this, please provide a JSON response with the following structure:
            {
                "analysis": "A brief 2-3 sentence summary of the customer's habits and preferences.",
                "recommendations": [
                    {
                        "item": "Name of a specific menu item to suggest",
                        "reason": "Why this item? (e.g., 'Matches their love for spicy food')",
                        "confidence": 85
                    },
                    {
                        "item": "Another item...",
                        "reason": "...",
                        "confidence": 75
                    }
                ],
                "suggested_promo": {
                    "code": "A creative short promo code (e.g., SPICY20)",
                    "offer": "Description of the offer (e.g., 20% off all Spicy Rolls)",
                    "message": "A short personalized message to send to the customer"
                }
            }
            
            IMPORTANT: Return ONLY valid JSON. no markdown formatting.
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if present
        text = text.replace(/```json\n?|\n?```/g, "").trim();

        const data = JSON.parse(text);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error generating recommendations:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate recommendations" },
            { status: 500 }
        );
    }
}
