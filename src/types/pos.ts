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
    modifiers?: { name: string; price: number; type: 'add-on' | 'upsell' }[];
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
