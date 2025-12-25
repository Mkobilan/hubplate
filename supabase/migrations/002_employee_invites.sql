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
-- Management (Authenticated only)
DROP POLICY IF EXISTS "Location owners can manage invites" ON public.employee_invites;
DROP POLICY IF EXISTS "Manage invites" ON public.employee_invites;
DROP POLICY IF EXISTS "Invite manage" ON public.employee_invites;
CREATE POLICY "Invite manage" ON public.employee_invites
    FOR ALL TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid()))
    );

-- Public view (Anon only)
DROP POLICY IF EXISTS "Public can view invite by token" ON public.employee_invites;
DROP POLICY IF EXISTS "View invite public" ON public.employee_invites;
DROP POLICY IF EXISTS "Invite public view" ON public.employee_invites;
CREATE POLICY "Invite public view" ON public.employee_invites
    FOR SELECT TO anon USING (status = 'pending' AND expires_at > NOW());

-- Indexing
CREATE INDEX idx_employee_invites_token ON public.employee_invites(token);
CREATE INDEX idx_employee_invites_location ON public.employee_invites(location_id);
