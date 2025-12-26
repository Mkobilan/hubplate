// Database types - will be generated from Supabase later
// For now, defining core table types manually

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            organizations: {
                Row: {
                    id: string;
                    name: string;
                    owner_id: string;
                    subscription_plan: string;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    owner_id: string;
                    subscription_plan?: string;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    owner_id?: string;
                    subscription_plan?: string;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            locations: {
                Row: {
                    id: string;
                    organization_id: string | null;
                    owner_id: string;
                    name: string;
                    address: string | null;
                    phone: string | null;
                    email: string | null;
                    timezone: string;
                    currency: string;
                    stripe_account_id: string | null;
                    stripe_onboarding_complete: boolean;
                    is_active: boolean;
                    tax_rate: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id?: string | null;
                    owner_id: string;
                    name: string;
                    address?: string | null;
                    phone?: string | null;
                    email?: string | null;
                    timezone?: string;
                    currency?: string;
                    stripe_account_id?: string | null;
                    stripe_onboarding_complete?: boolean;
                    is_active?: boolean;
                    tax_rate?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    owner_id?: string;
                    name?: string;
                    address?: string | null;
                    phone?: string | null;
                    email?: string | null;
                    timezone?: string;
                    currency?: string;
                    stripe_account_id?: string | null;
                    stripe_onboarding_complete?: boolean;
                    is_active?: boolean;
                    tax_rate?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            employees: {
                Row: {
                    id: string;
                    organization_id: string | null;
                    location_id: string;
                    user_id: string | null;
                    first_name: string;
                    last_name: string;
                    role: "owner" | "manager" | "server" | "cook" | "host" | "bartender" | "busser";
                    pin_code: string | null;
                    hourly_rate: number | null;
                    is_active: boolean;
                    server_color: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id?: string | null;
                    location_id?: string | null;
                    user_id?: string | null;
                    first_name: string;
                    last_name: string;
                    role: "owner" | "manager" | "server" | "cook" | "host" | "bartender" | "busser";
                    pin_code?: string | null;
                    hourly_rate?: number | null;
                    is_active?: boolean;
                    server_color?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    organization_id?: string | null;
                    location_id?: string | null;
                    user_id?: string | null;
                    first_name?: string;
                    last_name?: string;
                    role?: "owner" | "manager" | "server" | "cook" | "host" | "bartender" | "busser";
                    pin_code?: string | null;
                    hourly_rate?: number | null;
                    is_active?: boolean;
                    server_color?: string | null;
                    created_at?: string;
                };
            };
            menu_items: {
                Row: {
                    id: string;
                    location_id: string;
                    category: string;
                    name: string;
                    description: string | null;
                    price: number;
                    cost: number | null;
                    is_available: boolean;
                    is_86d: boolean;
                    image_url: string | null;
                    sort_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    category: string;
                    name: string;
                    description?: string | null;
                    price: number;
                    cost?: number | null;
                    is_available?: boolean;
                    is_86d?: boolean;
                    image_url?: string | null;
                    sort_order?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    category?: string;
                    name?: string;
                    description?: string | null;
                    price?: number;
                    cost?: number | null;
                    is_available?: boolean;
                    is_86d?: boolean;
                    image_url?: string | null;
                    sort_order?: number;
                    created_at?: string;
                };
            };
            orders: {
                Row: {
                    id: string;
                    location_id: string;
                    server_id: string | null;
                    table_number: string | null;
                    order_type: "dine_in" | "takeout" | "delivery";
                    status: "pending" | "in_progress" | "ready" | "served" | "completed" | "cancelled";
                    payment_status: "unpaid" | "paid" | "partially_paid";
                    subtotal: number;
                    tax: number;
                    tip: number;
                    total: number;
                    payment_method: string | null;
                    paid_at: string | null;
                    completed_at: string | null;
                    is_comped: boolean;
                    comp_reason: string | null;
                    comp_meta: Json | null;
                    is_edited: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    server_id?: string | null;
                    table_number?: string | null;
                    order_type?: "dine_in" | "takeout" | "delivery";
                    status?: "pending" | "in_progress" | "ready" | "served" | "completed" | "cancelled";
                    payment_status?: "unpaid" | "paid" | "partially_paid";
                    subtotal?: number;
                    tax?: number;
                    tip?: number;
                    total?: number;
                    payment_method?: string | null;
                    paid_at?: string | null;
                    completed_at?: string | null;
                    is_comped?: boolean;
                    comp_reason?: string | null;
                    comp_meta?: Json | null;
                    is_edited?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    server_id?: string | null;
                    table_number?: string | null;
                    order_type?: "dine_in" | "takeout" | "delivery";
                    status?: "pending" | "in_progress" | "ready" | "served" | "completed" | "cancelled";
                    payment_status?: "unpaid" | "paid" | "partially_paid";
                    subtotal?: number;
                    tax?: number;
                    tip?: number;
                    total?: number;
                    payment_method?: string | null;
                    paid_at?: string | null;
                    completed_at?: string | null;
                    is_comped?: boolean;
                    comp_reason?: string | null;
                    comp_meta?: Json | null;
                    is_edited?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            order_items: {
                Row: {
                    id: string;
                    order_id: string;
                    menu_item_id: string;
                    name: string;
                    quantity: number;
                    price: number;
                    unit_price: number;
                    modifiers: Json | null;
                    notes: string | null;
                    status: "pending" | "preparing" | "ready" | "served";
                    seat_number: number;
                    is_edited: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    order_id: string;
                    menu_item_id: string;
                    name: string;
                    quantity?: number;
                    price: number;
                    unit_price?: number;
                    modifiers?: Json | null;
                    notes?: string | null;
                    status?: "pending" | "preparing" | "ready" | "served";
                    seat_number?: number;
                    is_edited?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    order_id?: string;
                    menu_item_id?: string;
                    name?: string;
                    quantity?: number;
                    price?: number;
                    unit_price?: number;
                    modifiers?: Json | null;
                    notes?: string | null;
                    status?: "pending" | "preparing" | "ready" | "served";
                    seat_number?: number;
                    is_edited?: boolean;
                    created_at?: string;
                };
            };
            employee_invites: {
                Row: {
                    id: string;
                    organization_id: string | null;
                    location_id: string;
                    token: string;
                    email: string | null;
                    role: "owner" | "manager" | "server" | "bartender" | "cook" | "host" | "busser";
                    hourly_rate: number | null;
                    status: "pending" | "accepted" | "expired";
                    created_by: string;
                    expires_at: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id?: string | null;
                    location_id: string;
                    token?: string;
                    email?: string | null;
                    role: "owner" | "manager" | "server" | "bartender" | "cook" | "host" | "busser";
                    hourly_rate?: number | null;
                    status?: "pending" | "accepted" | "expired";
                    created_by: string;
                    expires_at?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    token?: string;
                    email?: string | null;
                    role?: "owner" | "manager" | "server" | "bartender" | "cook" | "host" | "busser";
                    hourly_rate?: number | null;
                    status?: "pending" | "accepted" | "expired";
                    created_by?: string;
                    expires_at?: string;
                };
            };
            seating_maps: {
                Row: {
                    id: string;
                    location_id: string;
                    name: string;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    name: string;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    name?: string;
                    is_active?: boolean;
                    updated_at?: string;
                };
            };
            seating_tables: {
                Row: {
                    id: string;
                    map_id: string;
                    label: string;
                    shape: "rect" | "circle" | "oval" | "booth" | "chair" | "door" | "wall";
                    object_type: "table" | "structure" | "seat";
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                    rotation: number;
                    capacity: number;
                    assigned_server_id: string | null;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    map_id: string;
                    label: string;
                    shape: "rect" | "circle" | "oval" | "booth" | "chair" | "door" | "wall";
                    object_type?: "table" | "structure" | "seat";
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                    rotation?: number;
                    capacity?: number;
                    assigned_server_id?: string | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    map_id?: string;
                    label?: string;
                    shape?: "rect" | "circle" | "oval" | "booth" | "chair" | "door" | "wall";
                    object_type?: "table" | "structure" | "seat";
                    x?: number;
                    y?: number;
                    width?: number;
                    height?: number;
                    rotation?: number;
                    capacity?: number;
                    assigned_server_id?: string | null;
                    is_active?: boolean;
                    updated_at?: string;
                };
            };
            notifications: {
                Row: {
                    id: string;
                    recipient_id: string;
                    location_id: string;
                    type: "schedule" | "clock_in" | "clock_out" | "shift_offer" | "shift_request" | "order_ready";
                    title: string;
                    message: string;
                    link: string | null;
                    is_read: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    recipient_id: string;
                    location_id: string;
                    type: "schedule" | "clock_in" | "clock_out" | "shift_offer" | "shift_request" | "order_ready";
                    title: string;
                    message: string;
                    link?: string | null;
                    is_read?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    recipient_id?: string;
                    location_id?: string;
                    type?: "schedule" | "clock_in" | "clock_out" | "shift_offer" | "shift_request" | "order_ready";
                    title?: string;
                    message?: string;
                    link?: string | null;
                    is_read?: boolean;
                    created_at?: string;
                };
            };
            shift_swap_requests: {
                Row: {
                    id: string;
                    organization_id: string;
                    location_id: string;
                    shift_id: string;
                    requester_id: string;
                    target_employee_id: string | null;
                    request_type: "swap" | "cover" | "open_offer";
                    swap_shift_id: string | null;
                    status: "pending" | "accepted" | "denied" | "cancelled" | "manager_pending";
                    accepted_by: string | null;
                    requester_note: string | null;
                    response_note: string | null;
                    dismissed_by_ids: string[] | null;
                    created_at: string;
                    responded_at: string | null;
                };
                Insert: {
                    id?: string;
                    organization_id: string;
                    location_id: string;
                    shift_id: string;
                    requester_id: string;
                    target_employee_id?: string | null;
                    request_type: "swap" | "cover" | "open_offer";
                    swap_shift_id?: string | null;
                    status?: "pending" | "accepted" | "denied" | "cancelled" | "manager_pending";
                    accepted_by?: string | null;
                    requester_note?: string | null;
                    response_note?: string | null;
                    dismissed_by_ids?: string[] | null;
                    created_at?: string;
                    responded_at?: string | null;
                };
                Update: {
                    id?: string;
                    organization_id?: string;
                    location_id?: string;
                    shift_id?: string;
                    requester_id?: string;
                    target_employee_id?: string | null;
                    request_type?: "swap" | "cover" | "open_offer";
                    swap_shift_id?: string | null;
                    status?: "pending" | "accepted" | "denied" | "cancelled" | "manager_pending";
                    accepted_by?: string | null;
                    requester_note?: string | null;
                    response_note?: string | null;
                    dismissed_by_ids?: string[] | null;
                    created_at?: string;
                    responded_at?: string | null;
                };
            };
        };
        Views: {};
        Functions: {};
        Enums: {};
    };
}

// Convenience types
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
