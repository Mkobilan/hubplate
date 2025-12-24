-- Employee Invitations Table
CREATE TABLE IF NOT EXISTS public.employee_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    token UUID UNIQUE DEFAULT gen_random_uuid(),
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'server', 'bartender', 'cook', 'host', 'busser')),
    hourly_rate DECIMAL(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.employee_invites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Location owners can manage invites" ON public.employee_invites
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Allow public access to view invite details via token (for the acceptance page)
CREATE POLICY "Public can view invite by token" ON public.employee_invites
    FOR SELECT USING (status = 'pending' AND expires_at > NOW());

-- Indexing
CREATE INDEX idx_employee_invites_token ON public.employee_invites(token);
CREATE INDEX idx_employee_invites_location ON public.employee_invites(location_id);
