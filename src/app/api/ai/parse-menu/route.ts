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
            console.error('Missing imageBase64 in request body');
            return NextResponse.json({ error: 'Image data required' }, { status: 400 });
        }

        console.log(`Starting menu parsing for location: ${locationId}. Image length: ${imageBase64.length}`);

        // Parse menu using Gemini AI
        let menuItems;
        try {
            menuItems = await parseMenuPhoto(imageBase64);
            console.log(`Successfully parsed ${menuItems?.length || 0} items from Gemini`);
        } catch (aiError) {
            console.error('Gemini parsing error:', aiError);
            return NextResponse.json(
                { error: `AI Parsing failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}` },
                { status: 500 }
            );
        }

        // Optionally save to database
        if (locationId && menuItems && menuItems.length > 0) {
            console.log('Synchronizing categories and items to Supabase...');
            // Get or create categories
            const categoryMap = new Map<string, string>();
            const uniqueCategories = [...new Set(menuItems.map(item => item.category))];

            for (const catName of uniqueCategories) {
                // Try to find existing category
                const { data: existingCat } = await (supabase
                    .from('menu_categories') as any)
                    .select('id')
                    .eq('location_id', locationId)
                    .ilike('name', catName)
                    .maybeSingle();

                if (existingCat) {
                    categoryMap.set(catName, existingCat.id);
                } else {
                    // Create new category
                    const { data: newCat, error: catError } = await (supabase
                        .from('menu_categories') as any)
                        .insert({
                            location_id: locationId,
                            name: catName,
                            is_active: true
                        })
                        .select('id')
                        .single();

                    if (newCat) {
                        categoryMap.set(catName, newCat.id);
                    } else if (catError) {
                        console.error(`Failed to create category ${catName}:`, catError);
                    }
                }
            }

            const itemsToInsert = menuItems.map(item => ({
                location_id: locationId,
                category_id: categoryMap.get(item.category),
                name: item.name,
                description: item.description,
                price: item.price,
                available: true,
                is_86d: false
            }));

            const { error } = await (supabase
                .from('menu_items') as any)
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
