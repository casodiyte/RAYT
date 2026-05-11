-- Fix RLS so drivers can read the ride_requests of their active rides
CREATE POLICY "Drivers can view matched requests" 
ON public.ride_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rides 
    WHERE public.rides.ride_request_id = public.ride_requests.id 
    AND public.rides.driver_id = auth.uid()
  )
);
