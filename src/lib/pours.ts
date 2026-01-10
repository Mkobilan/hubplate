import { createClient } from "@/lib/supabase/client";
import { OrderItem } from "@/types/pos";

/**
 * Automatically logs pours for an order by looking up linked recipes.
 * Should be called after an order is successfully sent to the kitchen.
 */
export async function processOrderPours(
    orderId: string,
    items: OrderItem[],
    locationId: string,
    employeeId: string | null
) {
    if (!orderId || !items || items.length === 0 || !locationId) return;

    const supabase = createClient();

    try {
        console.log(`Processing pours for Order #${orderId.slice(0, 4)} with ${items.length} items`);

        // 1. Get unique menu item IDs from the order
        const menuItemIds = Array.from(new Set(items.map(i => i.menuItemId)));

        if (menuItemIds.length === 0) return;

        // 2. Find which menu items are linked to recipes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: links, error: linkError } = await (supabase
            .from('recipe_menu_items') as any)
            .select('recipe_id, menu_item_id')
            .in('menu_item_id', menuItemIds);

        if (linkError) {
            console.error("Error checking recipe links:", linkError);
            return;
        }

        if (!links || links.length === 0) {
            console.log("No linked recipes found for these items.");
            return;
        }

        // 2a. Idempotency Check: Get existing pours for this order to avoid duplicates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingPours } = await (supabase
            .from('pours') as any)
            .select('order_item_ref')
            .eq('order_id', orderId);

        const existingRefs = new Set((existingPours || []).map((p: any) => p.order_item_ref));


        const recipeIds = Array.from(new Set(links.map((l: any) => l.recipe_id)));

        // 3. Fetch full recipe details (ingredients) for the matched recipes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: recipes, error: recipeError } = await (supabase
            .from('recipes') as any)
            .select(`
                id,
                name,
                recipe_ingredients (
                    inventory_item_id,
                    quantity_used,
                    unit
                )
            `)
            .in('id', recipeIds);

        if (recipeError) {
            console.error("Error fetching recipes for pours:", recipeError);
            return;
        }

        if (!recipes || recipes.length === 0) return;

        // 4. Construct pour records
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const poursToInsert: any[] = [];

        items.forEach(item => {
            // SKIP if already logged
            if (item.id && existingRefs.has(item.id)) return;

            // Find if this item has a linked recipe
            // An item could theoretically be linked to multiple recipes (e.g. combo?), but usually 1:1.
            // We'll iterate all links matching this menu item.
            const itemLinks = links.filter((l: any) => l.menu_item_id === item.menuItemId);

            itemLinks.forEach((link: any) => {
                const recipe = recipes.find((r: any) => r.id === link.recipe_id);

                if (recipe && recipe.recipe_ingredients) {
                    recipe.recipe_ingredients.forEach((ing: any) => {
                        // Only log if mapped to inventory
                        if (ing.inventory_item_id && ing.quantity_used) {
                            poursToInsert.push({
                                location_id: locationId,
                                recipe_id: recipe.id,
                                inventory_item_id: ing.inventory_item_id,
                                employee_id: employeeId,
                                quantity: ing.quantity_used * item.quantity,
                                unit: ing.unit || 'oz',
                                pour_type: 'standard',
                                notes: 'Auto-logged from Order',
                                order_id: orderId,
                                order_item_ref: item.id
                            });
                        }
                    });
                }
            });
        });

        if (poursToInsert.length > 0) {
            console.log(`Inserting ${poursToInsert.length} pour records...`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: insertError } = await (supabase.from('pours') as any).insert(poursToInsert);

            if (insertError) {
                console.error("Failed to insert pours:", insertError);
            } else {
                console.log("Pours logged successfully.");
            }
        }
    } catch (err) {
        console.error("Exception in processOrderPours:", err);
    }
}
