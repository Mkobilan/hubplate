import { createClient } from "@/lib/supabase/client";
import { OrderItem } from "@/types/pos";

/**
 * Automatically logs inventory usage for an order by looking up:
 * 1. Linked recipes (via recipe_menu_items → recipe_ingredients)
 * 2. Direct ingredient links (via ingredient_links table)
 * 3. Add-on recipes (via add_on_recipe_links → recipe_ingredients)
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
        console.log(`Processing inventory usage for Order #${orderId.slice(0, 4)} with ${items.length} items`);

        // 1. Get unique menu item IDs from the order
        const menuItemIds = Array.from(new Set(items.map(i => i.menuItemId)));

        if (menuItemIds.length === 0) return;

        // 2. Idempotency Check: Get existing logs for this order to avoid duplicates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingLogs } = await (supabase
            .from('pours') as any)
            .select('order_item_ref, parent_item_quantity')
            .eq('order_id', orderId);

        const existingLogMap = new Map((existingLogs || []).map((p: any) => [p.order_item_ref, p.parent_item_quantity]));

        // 3. Cleanup: Remove logs for items that are no longer in the order 
        // OR have changed quantity (we will re-insert them)
        const currentItemRefs = new Set(items.map(i => i.id).filter(Boolean));
        const refsToRemove = (existingLogs || [])
            .filter((p: any) => {
                const item = items.find(i => i.id === p.order_item_ref);
                // Remove if item no longer exists OR quantity changed
                return !item || item.quantity !== p.parent_item_quantity;
            })
            .map((p: any) => p.order_item_ref);

        if (refsToRemove.length > 0) {
            console.log(`Removing ${refsToRemove.length} stale/changed inventory logs...`);
            await (supabase.from('pours') as any)
                .delete()
                .eq('order_id', orderId)
                .in('order_item_ref', Array.from(new Set(refsToRemove)));
        }

        // Re-fetch existing refs after cleanup to know what to "skip"
        const existingRefsAfterCleanup = new Set(
            (existingLogMap.size > 0)
                ? (existingLogs || [])
                    .filter((p: any) => !refsToRemove.includes(p.order_item_ref))
                    .map((p: any) => p.order_item_ref)
                : []
        );

        // 3. Find which menu items are linked to recipes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: recipeLinks, error: linkError } = await (supabase
            .from('recipe_menu_items') as any)
            .select('recipe_id, menu_item_id')
            .in('menu_item_id', menuItemIds);

        if (linkError) {
            console.error("Error checking recipe links:", linkError);
        }

        const menuItemsWithRecipes = new Set((recipeLinks || []).map((l: any) => l.menu_item_id));
        const recipeIds = Array.from(new Set((recipeLinks || []).map((l: any) => l.recipe_id)));

        // 4. Collect all add-on names from all order items to look up add_on_recipe_links
        const allAddOnNames = new Set<string>();
        items.forEach(item => {
            (item.modifiers || []).forEach(mod => {
                if (mod.name && mod.type === 'add-on') {
                    allAddOnNames.add(mod.name);
                }
            });
        });

        // 4b. Fetch add-ons by name for this location
        let addOnsByName: Record<string, string> = {}; // name -> add_on_id
        let addOnRecipeLinks: any[] = [];

        if (allAddOnNames.size > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: addOnsData, error: addOnError } = await (supabase
                .from('add_ons') as any)
                .select('id, name')
                .eq('location_id', locationId)
                .in('name', Array.from(allAddOnNames));

            if (addOnError) {
                console.error("Error fetching add-ons:", addOnError);
            } else {
                (addOnsData || []).forEach((ao: any) => {
                    addOnsByName[ao.name] = ao.id;
                });

                // Fetch add_on_recipe_links for these add-ons
                const addOnIds = Object.values(addOnsByName);
                if (addOnIds.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data: addOnLinks, error: addOnLinkError } = await (supabase
                        .from('add_on_recipe_links') as any)
                        .select('add_on_id, recipe_id')
                        .in('add_on_id', addOnIds);

                    if (addOnLinkError) {
                        console.error("Error fetching add-on recipe links:", addOnLinkError);
                    } else {
                        addOnRecipeLinks = addOnLinks || [];
                        // Add these recipe IDs to the main recipe list to fetch
                        addOnRecipeLinks.forEach((l: any) => {
                            if (!recipeIds.includes(l.recipe_id)) {
                                recipeIds.push(l.recipe_id);
                            }
                        });
                    }
                }
            }
        }

        // 5. Fetch full recipe details (ingredients) for all matched recipes (menu items + add-ons)
        let recipes: any[] = [];
        if (recipeIds.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: recipeData, error: recipeError } = await (supabase
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
                console.error("Error fetching recipes:", recipeError);
            } else {
                recipes = recipeData || [];
            }
        }

        // 6. Fetch inventory item categories to determine usage_type (pour vs food)
        const allInventoryItemIds = new Set<string>();
        recipes.forEach((r: any) => {
            (r.recipe_ingredients || []).forEach((ing: any) => {
                if (ing.inventory_item_id) allInventoryItemIds.add(ing.inventory_item_id);
            });
        });

        // 7. Find direct ingredient_links for menu items WITHOUT recipes
        const menuItemsWithoutRecipes = menuItemIds.filter(id => !menuItemsWithRecipes.has(id));
        let directLinks: any[] = [];

        if (menuItemsWithoutRecipes.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: linkData, error: directLinkError } = await (supabase
                .from('ingredient_links') as any)
                .select('menu_item_id, inventory_item_id, quantity_used, unit')
                .in('menu_item_id', menuItemsWithoutRecipes);

            if (directLinkError) {
                console.error("Error fetching direct ingredient links:", directLinkError);
            } else {
                directLinks = linkData || [];
                directLinks.forEach((dl: any) => {
                    if (dl.inventory_item_id) allInventoryItemIds.add(dl.inventory_item_id);
                });
            }
        }

        // 8. Fetch inventory item details to categorize usage type
        let inventoryCategories: Record<string, string> = {};
        if (allInventoryItemIds.size > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: invData } = await (supabase
                .from('inventory_items') as any)
                .select('id, category')
                .in('id', Array.from(allInventoryItemIds));

            (invData || []).forEach((item: any) => {
                inventoryCategories[item.id] = item.category || '';
            });
        }

        // Helper to determine usage type based on inventory category
        const getUsageType = (inventoryItemId: string, isDirectLink: boolean): "pour" | "food" | "ingredient" => {
            if (isDirectLink) return 'ingredient';

            const category = (inventoryCategories[inventoryItemId] || '').toLowerCase();
            const alcoholKeywords = ['alcohol', 'liquor', 'spirit', 'wine', 'beer', 'cocktail', 'vodka', 'rum', 'whiskey', 'gin', 'tequila', 'brandy', 'liqueur', 'vermouth', 'bitters'];

            if (alcoholKeywords.some(kw => category.includes(kw))) {
                return 'pour';
            }
            return 'food';
        };

        // 9. Construct inventory usage records
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logsToInsert: any[] = [];

        // Process recipe-linked items
        items.forEach(item => {
            // SKIP if already logged
            if (item.id && existingRefsAfterCleanup.has(item.id)) return;

            // Find if this item has linked recipes
            const itemLinks = (recipeLinks || []).filter((l: any) => l.menu_item_id === item.menuItemId);

            itemLinks.forEach((link: any) => {
                const recipe = recipes.find((r: any) => r.id === link.recipe_id);

                if (recipe && recipe.recipe_ingredients) {
                    recipe.recipe_ingredients.forEach((ing: any) => {
                        // Only log if mapped to inventory
                        if (ing.inventory_item_id && ing.quantity_used) {
                            logsToInsert.push({
                                location_id: locationId,
                                recipe_id: recipe.id,
                                inventory_item_id: ing.inventory_item_id,
                                employee_id: employeeId,
                                quantity: ing.quantity_used * item.quantity,
                                unit: ing.unit || 'oz',
                                pour_type: 'standard',
                                usage_type: getUsageType(ing.inventory_item_id, false),
                                notes: 'Auto-logged from Order',
                                order_id: orderId,
                                order_item_ref: item.id,
                                menu_item_id: item.menuItemId,
                                parent_item_quantity: item.quantity
                            });
                        }
                    });
                }
            });

            // Process direct ingredient links (for items without recipes)
            if (!menuItemsWithRecipes.has(item.menuItemId)) {
                const itemDirectLinks = directLinks.filter((dl: any) => dl.menu_item_id === item.menuItemId);

                itemDirectLinks.forEach((dl: any) => {
                    if (dl.inventory_item_id && dl.quantity_used) {
                        logsToInsert.push({
                            location_id: locationId,
                            recipe_id: null,
                            inventory_item_id: dl.inventory_item_id,
                            employee_id: employeeId,
                            quantity: dl.quantity_used * item.quantity,
                            unit: dl.unit || 'each',
                            pour_type: 'standard',
                            usage_type: 'ingredient',
                            notes: 'Auto-logged from Order (direct link)',
                            order_id: orderId,
                            order_item_ref: item.id,
                            menu_item_id: item.menuItemId,
                            parent_item_quantity: item.quantity
                        });
                    }
                });
            }

            // 10. Process ADD-ON modifiers for this item
            (item.modifiers || []).forEach(mod => {
                if (mod.type !== 'add-on' || !mod.name) return;

                const addOnId = addOnsByName[mod.name];
                if (!addOnId) return;

                // Find recipe links for this add-on
                const addOnLinks = addOnRecipeLinks.filter((l: any) => l.add_on_id === addOnId);

                addOnLinks.forEach((link: any) => {
                    const recipe = recipes.find((r: any) => r.id === link.recipe_id);

                    if (recipe && recipe.recipe_ingredients) {
                        recipe.recipe_ingredients.forEach((ing: any) => {
                            if (ing.inventory_item_id && ing.quantity_used) {
                                logsToInsert.push({
                                    location_id: locationId,
                                    recipe_id: recipe.id,
                                    inventory_item_id: ing.inventory_item_id,
                                    employee_id: employeeId,
                                    // Multiply by item quantity (if customer orders 2 burgers with extra bacon, deduct for both)
                                    quantity: ing.quantity_used * item.quantity,
                                    unit: ing.unit || 'each',
                                    pour_type: 'standard',
                                    usage_type: getUsageType(ing.inventory_item_id, false),
                                    notes: `Auto-logged from Add-On: ${mod.name}`,
                                    order_id: orderId,
                                    order_item_ref: `${item.id}-addon-${addOnId}`,
                                    menu_item_id: item.menuItemId,
                                    add_on_id: addOnId,
                                    add_on_name: mod.name,
                                    parent_item_quantity: item.quantity
                                });
                            }
                        });
                    }
                });
            });
        });

        if (logsToInsert.length > 0) {
            console.log(`Inserting ${logsToInsert.length} inventory usage records...`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: insertError } = await (supabase.from('pours') as any).insert(logsToInsert);

            if (insertError) {
                console.error("Failed to insert inventory logs:", insertError);
            } else {
                console.log("Inventory usage logged successfully.");
            }
        } else {
            console.log("No inventory items to log for this order.");
        }
    } catch (err) {
        console.error("Exception in processOrderPours:", err);
    }
}
