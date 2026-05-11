-- Status enum for verification
DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS status verification_status,
ADD COLUMN IF NOT EXISTS plate TEXT,
ADD COLUMN IF NOT EXISTS economic_number TEXT,
ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
ADD COLUMN IF NOT EXISTS vehicle_year TEXT,
ADD COLUMN IF NOT EXISTS vehicle_color TEXT,
ADD COLUMN IF NOT EXISTS is_concessionaire BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create a storage bucket for driver documents if not exists (handled via SQL/Settings normally, but let's assume 'documents' bucket)
-- Note: Supabase storage setup usually happens in the UI or via API, but we'll assume the tables are enough for now.

-- Update RLS for and drivers to allow public read of basic vehicle info but private read of sensitive status
-- (Already handled by "Drivers are viewable by everyone" in schema.sql but we might want to restrict sensitive columns)

-- Policy to allow drivers to update their own verification data
DROP POLICY IF EXISTS "Drivers can update own verification data" ON public.drivers;
CREATE POLICY "Drivers can update own verification data" ON public.drivers
FOR UPDATE USING (auth.uid() = user_id);
