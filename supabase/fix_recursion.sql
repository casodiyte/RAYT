-- First drop all conflicting SELECT policies to recreate them cleanly
DROP POLICY IF EXISTS "Drivers can view matched requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Drivers can view OPEN requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Clients can view own requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Users can view their own rides" ON public.rides;

-- REBUILD RIDE REQUESTS
-- 1. Clients see their own
CREATE POLICY "Clients can view own requests" ON public.ride_requests FOR SELECT USING (auth.uid() = client_id);
-- 2. Drivers see OPEN OR if they have offered/bid on it OR if they are assigned the ride
-- Note: we use direct queries (auth.uid()) to avoid table recursion
CREATE POLICY "Drivers can view open or interacted requests" 
ON public.ride_requests 
FOR SELECT 
USING (
  status = 'OPEN' OR 
  EXISTS (SELECT 1 FROM public.rides WHERE public.rides.ride_request_id = public.ride_requests.id AND public.rides.driver_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.offers WHERE public.offers.ride_request_id = public.ride_requests.id AND public.offers.driver_id = auth.uid())
);

-- REBUILD RIDES
-- 1. Users can see their own rides (Driver rule + Client rule without depending on ride_requests policy evaluation)
CREATE POLICY "Users can view their own rides" 
ON public.rides 
FOR SELECT 
USING (
  driver_id = auth.uid() OR 
  (SELECT client_id FROM public.ride_requests WHERE id = ride_request_id LIMIT 1) = auth.uid()
);
