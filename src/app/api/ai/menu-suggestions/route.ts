// AI Menu Suggestions API route
import { NextRequest, NextResponse } from 'next/server';
import { suggestNewMenuItems } from '@/lib/ai/gemini';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { locationId, cuisineStyle } = await request.json();

        if (!locationId) {
            return NextResponse.json({ error: 'Location required' }, { status: 400 });
        }

        // Get current menu items
        const { data: menuItems } = await supabase
            .from('menu_items')
            .select('name')
            .eq('location_id', locationId);

        // Get available inventory items as ingredients
        const { data: inventory } = await supabase
            .from('inventory_items')
            .select('name')
            .eq('location_id', locationId)
            .gt('stock_quantity', 0);

        const existingMenu = menuItems?.map(i => i.name) || [];
        const availableIngredients = inventory?.map(i => i.name) || [];

        // Generate AI suggestions
        const suggestions = await suggestNewMenuItems(
            existingMenu,
            availableIngredients,
            cuisineStyle
        );

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Menu suggestions error:', error);
        return NextResponse.json(
            { error: 'Failed to generate suggestions' },
            { status: 500 }
        );
    }
}
