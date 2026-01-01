-- Create invoices storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
-- Allow public access to view invoices (needed for the dashboard previews)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'invoices');

-- Allow authenticated users to upload invoices
CREATE POLICY "Authenticated Upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'invoices');

-- Allow users to delete their own uploaded invoices
CREATE POLICY "Delete Own Invoices" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'invoices');
