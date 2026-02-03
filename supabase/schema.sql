-- Create types
CREATE TYPE user_role AS ENUM ('CLIENT', 'DRIVER');
CREATE TYPE ride_status AS ENUM ('OPEN', 'MATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE offer_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'CLIENT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drivers Table
CREATE TABLE public.drivers (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  is_available BOOLEAN DEFAULT TRUE,
  last_lat NUMERIC,
  last_lng NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Ride Requests
CREATE TABLE public.ride_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.profiles(id) NOT NULL,
  pickup_lat NUMERIC NOT NULL,
  pickup_lng NUMERIC NOT NULL,
  pickup_reference TEXT NOT NULL,
  dest_text TEXT NOT NULL,
  dest_lat NUMERIC,
  dest_lng NUMERIC,
  km_estimated NUMERIC,
  suggested_price NUMERIC,
  client_bid NUMERIC NOT NULL,
  status ride_status DEFAULT 'OPEN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- Offers
CREATE TABLE public.offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_request_id UUID REFERENCES public.ride_requests(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount NUMERIC NOT NULL,
  status offer_status DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Rides
CREATE TABLE public.rides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_request_id UUID REFERENCES public.ride_requests(id) NOT NULL,
  driver_id UUID REFERENCES public.profiles(id) NOT NULL,
  final_price NUMERIC NOT NULL,
  status ride_status DEFAULT 'MATCHED',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Drivers
CREATE POLICY "Drivers are viewable by everyone" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Drivers can update own status" ON public.drivers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Drivers can insert own status" ON public.drivers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ride Requests
CREATE POLICY "Clients can view own requests" ON public.ride_requests FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Drivers can view OPEN requests" ON public.ride_requests FOR SELECT USING (status = 'OPEN'); 
CREATE POLICY "Clients can create requests" ON public.ride_requests FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients can update own requests" ON public.ride_requests FOR UPDATE USING (auth.uid() = client_id);

-- Offers
CREATE POLICY "Clients can view offers for their requests" ON public.offers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.ride_requests WHERE id = ride_request_id AND client_id = auth.uid())
);
CREATE POLICY "Drivers can view own offers" ON public.offers FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Drivers can create offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = driver_id);

-- Rides
CREATE POLICY "Users can view their own rides" ON public.rides FOR SELECT USING (
  driver_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.ride_requests WHERE id = ride_request_id AND client_id = auth.uid())
);
CREATE POLICY "Users can create rides" ON public.rides FOR INSERT WITH CHECK (true); 
CREATE POLICY "Participants can update rides" ON public.rides FOR UPDATE USING (
  driver_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.ride_requests WHERE id = ride_request_id AND client_id = auth.uid())
);
