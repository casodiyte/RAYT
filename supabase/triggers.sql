-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'CLIENT')
  );
  
  -- If driver, insert into drivers
  IF (new.raw_user_meta_data->>'role') = 'DRIVER' THEN
    INSERT INTO public.drivers (user_id, is_available)
    VALUES (new.id, true);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
