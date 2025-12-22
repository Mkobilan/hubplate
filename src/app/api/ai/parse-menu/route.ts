// AI Menu Parsing API route
import { NextRequest, NextResponse } from 'next/server';
import { parseMenuPhoto } from '@/lib/ai/gemini';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageBase64, locationId } = await request.json();

        if (!imageBase64) {
            return NextResponse.json({ error: 'Image data required' }, { status: 400 });
        }

        // Parse menu using Gemini AI
        const menuItems = await parseMenuPhoto(imageBase64);

        // Optionally save to database
        if (locationId && menuItems.length > 0) {
            const itemsToInsert = menuItems.map(item => ({
                location_id: locationId,
                name: item.name,
                description: item.description,
                price: item.price,
                category: item.category,
                available: true,
                created_by: user.id,
            }));

            const { error } = await (supabase.from('menu_items') as any)
                .insert(itemsToInsert);

            if (error) {
                console.error('Failed to save menu items:', error);
            }
        }

        return NextResponse.json({
            items: menuItems,
            count: menuItems.length
        });
    } catch (error) {
        console.error('Menu parsing error:', error);
        return NextResponse.json(
            { error: 'Failed to parse menu' },
            { status: 500 }
        );
    }
}
