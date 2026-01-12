
/**
 * Calculates the total monetary value of an inventory item.
 * Formula: stock_quantity * cost_per_unit
 */
export const calculateInventoryItemValue = (item: any): number => {
    return Number(item.stock_quantity || 0) * Number(item.cost_per_unit || 0);
};

/**
 * Determines the stock status of an inventory item based on its running stock and par level.
 * Handles unit conversions for consistent comparison.
 */
export const getInventoryItemStatus = (item: any): "critical" | "low" | "good" => {
    const running = Number(item.running_stock || 0);

    // Calculate par in atomic units
    let multiplier = Number(item.units_per_stock || 1);
    let conversion = 1;
    const combinedUnit = (item.unit || '').toLowerCase();
    const recipeUnit = (item.recipe_unit || '').toLowerCase();

    if (combinedUnit.includes('lb') && recipeUnit.includes('oz')) conversion = 16;
    else if (combinedUnit.includes('gal') && recipeUnit.includes('oz')) conversion = 128;

    const parAtomic = Number(item.par_level || 0) * multiplier * conversion;

    // Avoid division by zero or negative par levels if necessary, 
    // but the original logic just checks <= parAtomic * 0.2
    
    if (running <= parAtomic * 0.2) return "critical";
    if (running <= parAtomic) return "low";
    return "good";
};
