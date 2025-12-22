// AI Reorder Suggestions API route
import { NextRequest, NextResponse } from 'next/server';
import { generateReorderSuggestions } from '@/lib/ai/gemini';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { locationId } = await request.json();

        if (!locationId) {
            return NextResponse.json({ error: 'Location required' }, { status: 400 });
        }

        // Get inventory items with their usage data
        const { data: inventory } = await supabase
            .from('inventory_items')
            .select('name, stock_quantity, par_level, unit, avg_daily_usage')
            .eq('location_id', locationId) as { data: { name: string; stock_quantity: number; par_level: number; unit: string; avg_daily_usage: number | null }[] | null };

        if (!inventory || inventory.length === 0) {
            return NextResponse.json({ suggestions: [] });
        }

        const inventoryItems = inventory.map((item: { name: string; stock_quantity: number; par_level: number; unit: string; avg_daily_usage: number | null }) => ({
            name: item.name,
            stock: item.stock_quantity,
            parLevel: item.par_level,
            unit: item.unit,
            avgDailyUsage: item.avg_daily_usage || 0,
        }));

        // Generate AI suggestions
        const suggestions = await generateReorderSuggestions(inventoryItems);

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Reorder suggestions error:', error);
        return NextResponse.json(
            { error: 'Failed to generate suggestions' },
            { status: 500 }
        );
    }
}
