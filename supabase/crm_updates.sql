-- Add email field to profiles for CRM display
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Sync existing emails from auth.users (useful for Christan's current DB)
UPDATE public.profiles p 
SET email = u.email 
FROM auth.users u 
WHERE p.id = u.id;

-- Update trigger function to include email in future signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, role, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'CLIENT'),
    new.email
  );
  
  -- If driver, insert into drivers
  IF (new.raw_user_meta_data->>'role') = 'DRIVER' THEN
    INSERT INTO public.drivers (user_id, is_available)
    VALUES (new.id, true);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
