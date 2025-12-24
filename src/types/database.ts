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
                    employee_id: string;
                    table_number: string | null;
                    status: "open" | "sent" | "preparing" | "ready" | "served" | "paid" | "cancelled";
                    subtotal: number;
                    tax: number;
                    tip: number;
                    total: number;
                    payment_method: string | null;
                    paid_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    employee_id: string;
                    table_number?: string | null;
                    status?: "open" | "sent" | "preparing" | "ready" | "served" | "paid" | "cancelled";
                    subtotal?: number;
                    tax?: number;
                    tip?: number;
                    total?: number;
                    payment_method?: string | null;
                    paid_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    employee_id?: string;
                    table_number?: string | null;
                    status?: "open" | "sent" | "preparing" | "ready" | "served" | "paid" | "cancelled";
                    subtotal?: number;
                    tax?: number;
                    tip?: number;
                    total?: number;
                    payment_method?: string | null;
                    paid_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            order_items: {
                Row: {
                    id: string;
                    order_id: string;
                    menu_item_id: string;
                    quantity: number;
                    unit_price: number;
                    modifiers: Json | null;
                    notes: string | null;
                    status: "pending" | "preparing" | "ready" | "served";
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    order_id: string;
                    menu_item_id: string;
                    quantity?: number;
                    unit_price: number;
                    modifiers?: Json | null;
                    notes?: string | null;
                    status?: "pending" | "preparing" | "ready" | "served";
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    order_id?: string;
                    menu_item_id?: string;
                    quantity?: number;
                    unit_price?: number;
                    modifiers?: Json | null;
                    notes?: string | null;
                    status?: "pending" | "preparing" | "ready" | "served";
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
