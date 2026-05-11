-- Add file URL columns to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS ine_url TEXT,
ADD COLUMN IF NOT EXISTS license_url TEXT,
ADD COLUMN IF NOT EXISTS insurance_url TEXT,
ADD COLUMN IF NOT EXISTS circulation_url TEXT,
ADD COLUMN IF NOT EXISTS photo_front_url TEXT,
ADD COLUMN IF NOT EXISTS photo_side_url TEXT,
ADD COLUMN IF NOT EXISTS owner_auth_url TEXT;

-- Update RLS to allow drivers to upload their own info
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- If policy exists, skip or replace
DO $$ BEGIN
    CREATE POLICY "Drivers can update their own data" ON public.drivers
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
