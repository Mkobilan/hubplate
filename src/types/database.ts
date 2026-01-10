// Database types - will be generated from Supabase later
// For now, defining core table types manually

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    public: {
        Tables: {
            kds_screens: {
                Row: {
                    id: string;
                    location_id: string;
                    name: string;
                    description: string | null;
                    is_active: boolean;
                    is_default: boolean;
                    display_order: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    name: string;
                    description?: string | null;
                    is_active?: boolean;
                    is_default?: boolean;
                    display_order?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    name?: string;
                    description?: string | null;
                    is_active?: boolean;
                    is_default?: boolean;
                    display_order?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            menu_item_kds_assignments: {
                Row: {
                    id: string;
                    menu_item_id: string;
                    kds_screen_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    menu_item_id: string;
                    kds_screen_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    menu_item_id?: string;
                    kds_screen_id?: string;
                    created_at?: string;
                };
            };
            organizations: {
                Row: {
                    id: string;
                    name: string;
                    owner_id: string;
                    subscription_plan: string;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                    admin_pin: string | null;
                };
                Insert: {
                    id?: string;
                    name: string;
                    owner_id: string;
                    subscription_plan?: string;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                    admin_pin?: string | null;
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
            recipes: {
                Row: {
                    id: string;
                    location_id: string;
                    name: string;
                    description: string | null;
                    instructions: string | null;
                    image_url: string | null;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    name: string;
                    description?: string | null;
                    instructions?: string | null;
                    image_url?: string | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    name?: string;
                    description?: string | null;
                    instructions?: string | null;
                    image_url?: string | null;
                    is_active?: boolean;
                    updated_at?: string;
                };
            };
            recipe_ingredients: {
                Row: {
                    id: string;
                    recipe_id: string;
                    inventory_item_id: string | null;
                    ingredient_name: string | null;
                    quantity_used: number;
                    quantity_raw: string | null;
                    unit: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    recipe_id: string;
                    inventory_item_id?: string | null;
                    ingredient_name?: string | null;
                    quantity_used: number;
                    quantity_raw?: string | null;
                    unit?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    recipe_id?: string;
                    inventory_item_id?: string | null;
                    ingredient_name?: string | null;
                    quantity_used?: number;
                    quantity_raw?: string | null;
                    unit?: string | null;
                    updated_at?: string;
                };
            };
            recipe_menu_items: {
                Row: {
                    recipe_id: string;
                    menu_item_id: string;
                };
                Insert: {
                    recipe_id: string;
                    menu_item_id: string;
                };
                Update: {
                    recipe_id?: string;
                    menu_item_id?: string;
                };
            };
            pours: {
                Row: {
                    id: string;
                    location_id: string;
                    recipe_id: string | null;
                    inventory_item_id: string;
                    employee_id: string | null;
                    quantity: number;
                    unit: string;
                    pour_type: "standard" | "double" | "shot" | "manual";
                    usage_type: "pour" | "food" | "ingredient";
                    notes: string | null;
                    order_id: string | null;
                    order_item_ref: string | null;
                    menu_item_id: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    recipe_id?: string | null;
                    inventory_item_id: string;
                    employee_id?: string | null;
                    quantity: number;
                    unit: string;
                    pour_type?: "standard" | "double" | "shot" | "manual";
                    usage_type?: "pour" | "food" | "ingredient";
                    notes?: string | null;
                    order_id?: string | null;
                    order_item_ref?: string | null;
                    menu_item_id?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    recipe_id?: string | null;
                    inventory_item_id?: string;
                    employee_id?: string | null;
                    quantity?: number;
                    unit?: string;
                    pour_type?: "standard" | "double" | "shot" | "manual";
                    usage_type?: "pour" | "food" | "ingredient";
                    notes?: string | null;
                    order_id?: string | null;
                    order_item_ref?: string | null;
                    menu_item_id?: string | null;
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
                    google_review_link: string | null;
                    slug: string | null;
                    brand_color: string | null;
                    logo_url: string | null;
                    banner_url: string | null;
                    ordering_enabled: boolean;
                    uber_organization_id: string | null;
                    delivery_enabled: boolean;
                    delivery_radius: number;
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
                    google_review_link?: string | null;
                    slug?: string | null;
                    brand_color?: string | null;
                    logo_url?: string | null;
                    banner_url?: string | null;
                    ordering_enabled?: boolean;
                    uber_organization_id?: string | null;
                    delivery_enabled?: boolean;
                    delivery_radius?: number;
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
                    google_review_link?: string | null;
                    slug?: string | null;
                    brand_color?: string | null;
                    logo_url?: string | null;
                    banner_url?: string | null;
                    ordering_enabled?: boolean;
                    uber_organization_id?: string | null;
                    delivery_enabled?: boolean;
                    delivery_radius?: number;
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
                    role: "owner" | "manager" | "gm" | "agm" | "server" | "cook" | "host" | "bartender" | "busser" | "dishwasher" | "driver" | "expo";
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
                    role: "owner" | "manager" | "gm" | "agm" | "server" | "cook" | "host" | "bartender" | "busser" | "dishwasher" | "driver" | "expo";
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
                    role?: "owner" | "manager" | "gm" | "agm" | "server" | "cook" | "host" | "bartender" | "busser" | "dishwasher" | "driver" | "expo";
                    pin_code?: string | null;
                    hourly_rate?: number | null;
                    is_active?: boolean;
                    server_color?: string | null;
                    created_at?: string;
                };
            };
            employee_roles: {
                Row: {
                    id: string;
                    employee_id: string;
                    role: "owner" | "manager" | "gm" | "agm" | "server" | "cook" | "host" | "bartender" | "busser" | "dishwasher" | "driver" | "expo";
                    rank: number;
                    hourly_rate: number | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    employee_id: string;
                    role: "owner" | "manager" | "gm" | "agm" | "server" | "cook" | "host" | "bartender" | "busser" | "dishwasher" | "driver" | "expo";
                    rank: number;
                    hourly_rate?: number | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    employee_id?: string;
                    role?: "owner" | "manager" | "gm" | "agm" | "server" | "cook" | "host" | "bartender" | "busser" | "dishwasher" | "driver" | "expo";
                    rank?: number;
                    hourly_rate?: number | null;
                    created_at?: string;
                };
            };
            menu_items: {
                Row: {
                    id: string;
                    location_id: string;
                    category_id: string | null;
                    name: string;
                    description: string | null;
                    price: number;
                    cost: number | null;
                    available: boolean;
                    is_86d: boolean;
                    image_url: string | null;
                    sort_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    category_id?: string | null;
                    name: string;
                    description?: string | null;
                    price: number;
                    cost?: number | null;
                    available?: boolean;
                    is_86d?: boolean;
                    image_url?: string | null;
                    sort_order?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    category_id?: string | null;
                    name?: string;
                    description?: string | null;
                    price?: number;
                    cost?: number | null;
                    available?: boolean;
                    is_86d?: boolean;
                    image_url?: string | null;
                    sort_order?: number;
                    created_at?: string;
                };
            };
            menu_categories: {
                Row: {
                    id: string;
                    location_id: string;
                    name: string;
                    sort_order: number;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    name: string;
                    sort_order?: number;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    name?: string;
                    sort_order?: number;
                    is_active?: boolean;
                    updated_at?: string;
                };
            };
            orders: {
                Row: {
                    id: string;
                    location_id: string;
                    customer_id: string | null;
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
                    uber_delivery_id: string | null;
                    uber_quote_id: string | null;
                    delivery_address: string | null;
                    delivery_fee: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    customer_id?: string | null;
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
                    uber_delivery_id?: string | null;
                    delivery_fee?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    customer_id?: string | null;
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
                    uber_delivery_id?: string | null;
                    delivery_fee?: number;
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
            time_entries: {
                Row: {
                    id: string;
                    employee_id: string;
                    location_id: string;
                    organization_id: string | null;
                    clock_in: string;
                    clock_out: string | null;
                    break_minutes: number;
                    total_hours: number | null;
                    hourly_rate: number | null;
                    total_pay: number | null;
                    role: string | null;
                    notes: string | null;
                    current_break_start: string | null;
                    current_break_type: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    employee_id: string;
                    location_id: string;
                    organization_id?: string | null;
                    clock_in: string;
                    clock_out?: string | null;
                    break_minutes?: number;
                    total_hours?: number | null;
                    hourly_rate?: number | null;
                    total_pay?: number | null;
                    role?: string | null;
                    notes?: string | null;
                    current_break_start?: string | null;
                    current_break_type?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    employee_id?: string;
                    location_id?: string;
                    organization_id?: string | null;
                    clock_in?: string;
                    clock_out?: string | null;
                    break_minutes?: number;
                    total_hours?: number | null;
                    hourly_rate?: number | null;
                    total_pay?: number | null;
                    role?: string | null;
                    notes?: string | null;
                    current_break_start?: string | null;
                    current_break_type?: string | null;
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
                    role: "owner" | "manager" | "gm" | "agm" | "server" | "bartender" | "cook" | "host" | "busser" | "dishwasher" | "driver" | "expo";
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
                    role: "owner" | "manager" | "gm" | "agm" | "server" | "bartender" | "cook" | "host" | "busser" | "dishwasher" | "driver" | "expo";
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
                    role?: "owner" | "manager" | "gm" | "agm" | "server" | "bartender" | "cook" | "host" | "busser" | "dishwasher" | "driver" | "expo";
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
            inventory_items: {
                Row: {
                    id: string;
                    location_id: string;
                    name: string;
                    category: string | null;
                    unit: string;
                    stock_quantity: number;
                    par_level: number | null;
                    reorder_quantity: number | null;
                    cost_per_unit: number | null;
                    supplier: string | null;
                    avg_daily_usage: number | null;
                    last_ordered_at: string | null;
                    metadata: Json | null;
                    created_at: string;
                    updated_at: string;
                };

                Insert: {
                    id?: string;
                    location_id: string;
                    name: string;
                    category?: string | null;
                    unit: string;
                    stock_quantity?: number;
                    par_level?: number | null;
                    reorder_quantity?: number | null;
                    cost_per_unit?: number | null;
                    supplier?: string | null;
                    avg_daily_usage?: number | null;
                    last_ordered_at?: string | null;
                    metadata?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };

                Update: {
                    id?: string;
                    location_id?: string;
                    name?: string;
                    category?: string | null;
                    unit?: string;
                    stock_quantity?: number;
                    par_level?: number | null;
                    reorder_quantity?: number | null;
                    cost_per_unit?: number | null;
                    supplier?: string | null;
                    avg_daily_usage?: number | null;
                    last_ordered_at?: string | null;
                    metadata?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };

            };
            ingredient_links: {
                Row: {
                    id: string;
                    menu_item_id: string;
                    inventory_item_id: string;
                    quantity_used: number;
                    unit: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    menu_item_id: string;
                    inventory_item_id: string;
                    quantity_used: number;
                    unit?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    menu_item_id?: string;
                    inventory_item_id?: string;
                    quantity_used?: number;
                    unit?: string | null;
                    created_at?: string;
                };
            };
            purchase_orders: {
                Row: {
                    id: string;
                    location_id: string;
                    supplier: string | null;
                    status: "draft" | "sent" | "received" | "cancelled";
                    total_amount: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    supplier?: string | null;
                    status?: "draft" | "sent" | "received" | "cancelled";
                    total_amount?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    supplier?: string | null;
                    status?: "draft" | "sent" | "received" | "cancelled";
                    total_amount?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            purchase_order_items: {
                Row: {
                    id: string;
                    po_id: string;
                    inventory_item_id: string;
                    quantity: number;
                    cost_at_order: number | null;
                    received_quantity: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    po_id: string;
                    inventory_item_id: string;
                    quantity: number;
                    cost_at_order?: number | null;
                    received_quantity?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    po_id?: string;
                    inventory_item_id?: string;
                    quantity?: number;
                    cost_at_order?: number | null;
                    received_quantity?: number;
                    created_at?: string;
                };
            };
            customers: {
                Row: {
                    id: string;
                    location_id: string;
                    first_name: string | null;
                    last_name: string | null;
                    email: string | null;
                    phone: string | null;
                    is_loyalty_member: boolean;
                    loyalty_tier: string | null;
                    loyalty_points: number;
                    total_visits: number;
                    total_spent: number;
                    notes: string | null;
                    birthday: string | null;
                    loyalty_signup_server_id: string | null;
                    loyalty_signup_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    first_name?: string | null;
                    last_name?: string | null;
                    email?: string | null;
                    phone?: string | null;
                    is_loyalty_member?: boolean;
                    loyalty_tier?: string | null;
                    loyalty_points?: number;
                    total_visits?: number;
                    total_spent?: number;
                    notes?: string | null;
                    birthday?: string | null;
                    loyalty_signup_server_id?: string | null;
                    loyalty_signup_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    first_name?: string | null;
                    last_name?: string | null;
                    email?: string | null;
                    phone?: string | null;
                    is_loyalty_member?: boolean;
                    loyalty_tier?: string | null;
                    loyalty_points?: number;
                    total_visits?: number;
                    total_spent?: number;
                    notes?: string | null;
                    birthday?: string | null;
                    loyalty_signup_server_id?: string | null;
                    loyalty_signup_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            customer_feedback: {
                Row: {
                    id: string;
                    location_id: string;
                    customer_id: string | null;
                    server_id: string | null;
                    rating: number;
                    comment: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    customer_id?: string | null;
                    server_id?: string | null;
                    rating: number;
                    comment?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    customer_id?: string | null;
                    rating?: number;
                    comment?: string | null;
                    created_at?: string;
                };
            };
            marketing_campaigns: {
                Row: {
                    id: string;
                    location_id: string;
                    name: string;
                    type: string;
                    status: "draft" | "scheduled" | "active" | "completed" | "cancelled" | "running";
                    subject: string | null;
                    message: string | null;
                    target_audience: Json | null;
                    sent_count: number;
                    open_count: number;
                    click_count: number;
                    scheduled_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    name: string;
                    type: string;
                    status?: "draft" | "scheduled" | "active" | "completed" | "cancelled" | "running";
                    subject?: string | null;
                    message?: string | null;
                    target_audience?: Json | null;
                    sent_count?: number;
                    open_count?: number;
                    click_count?: number;
                    scheduled_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    name?: string;
                    type?: string;
                    status?: "draft" | "scheduled" | "active" | "completed" | "cancelled" | "running";
                    subject?: string | null;
                    message?: string | null;
                    target_audience?: Json | null;
                    sent_count?: number;
                    open_count?: number;
                    click_count?: number;
                    scheduled_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            waitlist: {
                Row: {
                    id: string;
                    location_id: string;
                    customer_name: string;
                    customer_phone: string | null;
                    party_size: number;
                    status: "waiting" | "seated" | "cancelled" | "no_show" | "completed";
                    notes: string | null;
                    estimated_wait_minutes: number;
                    table_id: string | null;
                    table_label: string | null;
                    created_at: string;
                    updated_at: string;
                    seated_at: string | null;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    customer_name: string;
                    customer_phone?: string | null;
                    party_size: number;
                    status?: "waiting" | "seated" | "cancelled" | "no_show" | "completed";
                    notes?: string | null;
                    estimated_wait_minutes?: number;
                    table_id?: string | null;
                    table_label?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    seated_at?: string | null;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    customer_name?: string;
                    customer_phone?: string | null;
                    party_size?: number;
                    status?: "waiting" | "seated" | "cancelled" | "no_show" | "completed";
                    notes?: string | null;
                    estimated_wait_minutes?: number;
                    table_id?: string | null;
                    table_label?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    seated_at?: string | null;
                };
            };
            employee_custom_fields: {
                Row: {
                    id: string;
                    location_id: string;
                    field_name: string;
                    field_label: string;
                    field_type: "text" | "number" | "date" | "boolean" | "phone" | "email";
                    is_required: boolean;
                    display_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    field_name: string;
                    field_label: string;
                    field_type?: "text" | "number" | "date" | "boolean" | "phone" | "email";
                    is_required?: boolean;
                    display_order?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    field_name?: string;
                    field_label?: string;
                    field_type?: "text" | "number" | "date" | "boolean" | "phone" | "email";
                    is_required?: boolean;
                    display_order?: number;
                    created_at?: string;
                };
            };
            employee_custom_values: {
                Row: {
                    id: string;
                    employee_id: string;
                    field_id: string;
                    value: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    employee_id: string;
                    field_id: string;
                    value?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    employee_id?: string;
                    field_id?: string;
                    value?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            vendors: {
                Row: {
                    id: string;
                    location_id: string;
                    name: string;
                    email: string | null;
                    phone: string | null;
                    address: string | null;
                    account_number: string | null;
                    payment_terms: string | null;
                    default_gl_code: string | null;
                    notes: string | null;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    name: string;
                    email?: string | null;
                    phone?: string | null;
                    address?: string | null;
                    account_number?: string | null;
                    payment_terms?: string | null;
                    default_gl_code?: string | null;
                    notes?: string | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    name?: string;
                    email?: string | null;
                    phone?: string | null;
                    address?: string | null;
                    account_number?: string | null;
                    payment_terms?: string | null;
                    default_gl_code?: string | null;
                    notes?: string | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            invoices: {
                Row: {
                    id: string;
                    location_id: string;
                    vendor_id: string | null;
                    invoice_number: string | null;
                    invoice_date: string | null;
                    due_date: string | null;
                    subtotal: number;
                    tax: number;
                    total: number;
                    status: "pending" | "approved" | "paid" | "disputed" | "cancelled";
                    source: "upload" | "scan" | "manual";
                    original_file_url: string | null;
                    original_file_name: string | null;
                    ocr_raw_data: Json | null;
                    processing_status: "processing" | "completed" | "needs_review" | "failed";
                    processing_errors: Json | null;
                    approved_by: string | null;
                    approved_at: string | null;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    vendor_id?: string | null;
                    invoice_number?: string | null;
                    invoice_date?: string | null;
                    due_date?: string | null;
                    subtotal?: number;
                    tax?: number;
                    total?: number;
                    status?: "pending" | "approved" | "paid" | "disputed" | "cancelled";
                    source?: "upload" | "scan" | "manual";
                    original_file_url?: string | null;
                    original_file_name?: string | null;
                    ocr_raw_data?: Json | null;
                    processing_status?: "processing" | "completed" | "needs_review" | "failed";
                    processing_errors?: Json | null;
                    approved_by?: string | null;
                    approved_at?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    vendor_id?: string | null;
                    invoice_number?: string | null;
                    invoice_date?: string | null;
                    due_date?: string | null;
                    subtotal?: number;
                    tax?: number;
                    total?: number;
                    status?: "pending" | "approved" | "paid" | "disputed" | "cancelled";
                    source?: "upload" | "scan" | "manual";
                    original_file_url?: string | null;
                    original_file_name?: string | null;
                    ocr_raw_data?: Json | null;
                    processing_status?: "processing" | "completed" | "needs_review" | "failed";
                    processing_errors?: Json | null;
                    approved_by?: string | null;
                    approved_at?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            invoice_line_items: {
                Row: {
                    id: string;
                    invoice_id: string;
                    inventory_item_id: string | null;
                    description: string;
                    quantity: number;
                    unit: string | null;
                    unit_price: number;
                    extended_price: number;
                    gl_code: string | null;
                    category: string | null;
                    sub_category: string | null;
                    confidence_score: number;
                    needs_review: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    invoice_id: string;
                    inventory_item_id?: string | null;
                    description: string;
                    quantity?: number;
                    unit?: string | null;
                    unit_price?: number;
                    extended_price?: number;
                    gl_code?: string | null;
                    category?: string | null;
                    sub_category?: string | null;
                    confidence_score?: number;
                    needs_review?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    invoice_id?: string;
                    inventory_item_id?: string | null;
                    description?: string;
                    quantity?: number;
                    unit?: string | null;
                    unit_price?: number;
                    extended_price?: number;
                    gl_code?: string | null;
                    category?: string | null;
                    sub_category?: string | null;
                    confidence_score?: number;
                    needs_review?: boolean;
                    created_at?: string;
                };
            };
            ingredient_price_history: {
                Row: {
                    id: string;
                    inventory_item_id: string;
                    vendor_id: string | null;
                    invoice_id: string | null;
                    location_id: string;
                    price_per_unit: number;
                    unit: string | null;
                    recorded_at: string;
                };
                Insert: {
                    id?: string;
                    inventory_item_id: string;
                    vendor_id?: string | null;
                    invoice_id?: string | null;
                    location_id: string;
                    price_per_unit: number;
                    unit?: string | null;
                    recorded_at?: string;
                };
                Update: {
                    id?: string;
                    inventory_item_id?: string;
                    vendor_id?: string | null;
                    invoice_id?: string | null;
                    location_id?: string;
                    price_per_unit?: number;
                    unit?: string | null;
                    recorded_at?: string;
                };
            };
            invoice_approvals: {
                Row: {
                    id: string;
                    invoice_id: string;
                    employee_id: string | null;
                    action: "submitted" | "approved" | "rejected" | "edited";
                    notes: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    invoice_id: string;
                    employee_id?: string | null;
                    action: "submitted" | "approved" | "rejected" | "edited";
                    notes?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    invoice_id?: string;
                    employee_id?: string | null;
                    action?: "submitted" | "approved" | "rejected" | "edited";
                    notes?: string | null;
                    created_at?: string;
                };
            };
            payroll_periods: {
                Row: {
                    id: string;
                    organization_id: string | null;
                    location_id: string;
                    start_date: string;
                    end_date: string;
                    status: "open" | "processing" | "completed" | "cancelled";
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    organization_id?: string | null;
                    location_id: string;
                    start_date: string;
                    end_date: string;
                    status?: "open" | "processing" | "completed" | "cancelled";
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    organization_id?: string | null;
                    location_id?: string;
                    start_date?: string;
                    end_date?: string;
                    status?: "open" | "processing" | "completed" | "cancelled";
                    updated_at?: string;
                };
            };
            payroll_runs: {
                Row: {
                    id: string;
                    period_id: string;
                    employee_id: string;
                    regular_hours: number;
                    overtime_hours: number;
                    gross_regular_pay: number;
                    gross_overtime_pay: number;
                    tips_earned: number;
                    deductions_total: number;
                    net_pay_estimated: number;
                    metadata: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    period_id: string;
                    employee_id: string;
                    regular_hours?: number;
                    overtime_hours?: number;
                    gross_regular_pay?: number;
                    gross_overtime_pay?: number;
                    tips_earned?: number;
                    deductions_total?: number;
                    net_pay_estimated?: number;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    period_id?: string;
                    employee_id?: string;
                    regular_hours?: number;
                    overtime_hours?: number;
                    gross_regular_pay?: number;
                    gross_overtime_pay?: number;
                    tips_earned?: number;
                    deductions_total?: number;
                    net_pay_estimated?: number;
                    metadata?: Json;
                    updated_at?: string;
                };
            };
            tip_pools: {
                Row: {
                    id: string;
                    location_id: string;
                    name: string;
                    description: string | null;
                    contribution_rules: Json;
                    distribution_rules: Json;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    name: string;
                    description?: string | null;
                    contribution_rules?: Json;
                    distribution_rules?: Json;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    name?: string;
                    description?: string | null;
                    contribution_rules?: Json;
                    distribution_rules?: Json;
                    is_active?: boolean;
                    updated_at?: string;
                };
            };
            pricing_rules: {
                Row: {
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
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    location_id: string;
                    name: string;
                    rule_type: 'discount' | 'surge';
                    days_of_week: number[];
                    start_time: string;
                    end_time: string;
                    discount_type?: 'percentage' | 'fixed';
                    value: number;
                    category_ids?: string[];
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    location_id?: string;
                    name?: string;
                    rule_type?: 'discount' | 'surge';
                    days_of_week?: number[];
                    start_time?: string;
                    end_time?: string;
                    discount_type?: 'percentage' | 'fixed';
                    value?: number;
                    category_ids?: string[];
                    is_active?: boolean;
                    updated_at?: string;
                };
            };
        };


        Views: {};
        Functions: {
            get_active_pricing_rules: {
                Args: {
                    p_location_id: string;
                };
                Returns: Database["public"]["Tables"]["pricing_rules"]["Row"][];
            };
        };
        Enums: {};
    };
};

// Convenience types
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
export type IngredientLink = Database["public"]["Tables"]["ingredient_links"]["Row"];
export type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];
export type PurchaseOrderItem = Database["public"]["Tables"]["purchase_order_items"]["Row"];
export type TimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerFeedback = Database["public"]["Tables"]["customer_feedback"]["Row"];
export type WaitlistEntry = Database["public"]["Tables"]["waitlist"]["Row"];
export type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceLineItem = Database["public"]["Tables"]["invoice_line_items"]["Row"];
export type IngredientPriceHistory = Database["public"]["Tables"]["ingredient_price_history"]["Row"];
export type InvoiceApproval = Database["public"]["Tables"]["invoice_approvals"]["Row"];
export type PayrollPeriod = Database["public"]["Tables"]["payroll_periods"]["Row"];
export type PayrollRun = Database["public"]["Tables"]["payroll_runs"]["Row"];
export type TipPool = Database["public"]["Tables"]["tip_pools"]["Row"];
export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];
export type RecipeIngredient = Database["public"]["Tables"]["recipe_ingredients"]["Row"];
export type Pour = Database["public"]["Tables"]["pours"]["Row"];
export type PricingRule = Database["public"]["Tables"]["pricing_rules"]["Row"];


