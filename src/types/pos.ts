export interface MenuItemType {
    id: string;
    name: string;
    description?: string | null;
    category_id: string;
    price: number;
    is_86d: boolean;
    category?: { name: string };
    location_id?: string;
}

export interface OrderItem {
    id: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    modifiers?: { id?: string; name: string; price: number; type: 'add-on' | 'upsell' | 'side' | 'dressing' }[];
    seatNumber: number;
    status: 'pending' | 'preparing' | 'ready' | 'served' | 'sent';
    category_name?: string;
    isEdited?: boolean;
    isUpsell?: boolean;
    sent_at?: string;
    started_at?: string;
    ready_at?: string;
    served_at?: string;
}

export interface PricingRule {
    id: string;
    location_id: string;
    name: string;
    rule_type: 'discount' | 'surge';
    days_of_week: number[];
    start_time: string;
    end_time: string;
    discount_type: 'percentage' | 'fixed';
    value: number;
    category_ids: string[];
    is_active: boolean;
}
