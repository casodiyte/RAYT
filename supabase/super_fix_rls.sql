-- 1. Create helper functions that bypass RLS to prevent infinite loops
CREATE OR REPLACE FUNCTION public.get_request_client(req_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER SET search_path = public AS $$
  SELECT client_id FROM ride_requests WHERE id = req_id;
$$;

CREATE OR REPLACE FUNCTION public.has_driver_ride(req_id UUID, d_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM rides WHERE ride_request_id = req_id AND driver_id = d_id);
$$;

CREATE OR REPLACE FUNCTION public.has_driver_offer(req_id UUID, d_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM offers WHERE ride_request_id = req_id AND driver_id = d_id);
$$;

-- 2. Drop ALL related SELECT and UPDATE policies to recreate them cleanly
DROP POLICY IF EXISTS "Drivers can view matched requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Drivers can view OPEN requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Drivers can view open or interacted requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Clients can view own requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Drivers can view assigned or offered requests" ON public.ride_requests;

DROP POLICY IF EXISTS "Clients can view offers for their requests" ON public.offers;
DROP POLICY IF EXISTS "Drivers can view own offers" ON public.offers;

DROP POLICY IF EXISTS "Users can view their own rides" ON public.rides;
DROP POLICY IF EXISTS "Participants can update rides" ON public.rides;

-- 3. Ride Requests Policies (No recursive queries)
CREATE POLICY "Clients can view own requests" ON public.ride_requests FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Drivers can view open or assigned requests" 
ON public.ride_requests 
FOR SELECT 
USING (
  status = 'OPEN' OR 
  public.has_driver_ride(id, auth.uid()) OR
  public.has_driver_offer(id, auth.uid())
);

-- 4. Offers Policies
CREATE POLICY "Clients can view offers for their requests" 
ON public.offers 
FOR SELECT 
USING (
  public.get_request_client(ride_request_id) = auth.uid()
);

CREATE POLICY "Drivers can view own offers" 
ON public.offers 
FOR SELECT 
USING (auth.uid() = driver_id);

-- 5. Rides Policies
CREATE POLICY "Users can view their own rides" 
ON public.rides 
FOR SELECT 
USING (
  driver_id = auth.uid() OR 
  public.get_request_client(ride_request_id) = auth.uid()
);

CREATE POLICY "Participants can update rides" 
ON public.rides 
FOR UPDATE 
USING (
  driver_id = auth.uid() OR 
  public.get_request_client(ride_request_id) = auth.uid()
);
