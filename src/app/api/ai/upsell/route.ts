// AI Upsell Suggestions API route
import { NextRequest, NextResponse } from 'next/server';
import { generateUpsellSuggestions } from '@/lib/ai/gemini';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { itemName, locationId, existingItems, time } = await request.json();

        if (!itemName || !locationId) {
            return NextResponse.json({ error: 'Item name and location required' }, { status: 400 });
        }

        // Get all menu items for this location
        const { data: menuItems } = await supabase
            .from('menu_items')
            .select('name, category, price')
            .eq('location_id', locationId)
            .eq('available', true) as { data: { name: string; category: string; price: number }[] | null };

        if (!menuItems || menuItems.length === 0) {
            return NextResponse.json({ suggestions: [] });
        }

        // Generate AI suggestions
        const suggestions = await generateUpsellSuggestions(
            itemName,
            menuItems,
            { time: time || new Date().toLocaleTimeString(), existingItems: existingItems || [] }
        );

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Upsell suggestions error:', error);
        return NextResponse.json(
            { error: 'Failed to generate suggestions' },
            { status: 500 }
        );
    }
}
