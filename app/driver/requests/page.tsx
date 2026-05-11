"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentPosition, getDistanceFromLatLonInKm, Coordinates } from "@/lib/location";
import { Loader2, MapPin, DollarSign, Navigation, SearchX } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface Request {
    id: string;
    pickup_reference: string;
    dest_text: string;
    client_bid: number;
    pickup_lat: number;
    pickup_lng: number;
    km_estimated: number | null;
    profiles: {
        name: string;
    } | null;
}

export default function DriverRequestsPage() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState<Coordinates | null>(null);
    const [searchRadius, setSearchRadius] = useState(10); // km
    const [activeRideId, setActiveRideId] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        // 1. Check for active ride first
        checkActiveRide();

        // 2. Listen for accepted offers
        const offersChannel = supabase
            .channel('driver-offers-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'offers',
                    filter: `driver_id=eq.${user.id}`
                },
                (payload) => {
                    if (payload.new && payload.new.status === 'ACCEPTED') {
                        setNotification("¡El cliente aceptó tu tarifa! Ve a tu viaje en curso.");
                        checkActiveRide();
                    } else if (payload.new && payload.new.status === 'REJECTED') {
                        setNotification("Una de tus ofertas fue rechazada por el cliente.");
                    }
                }
            )
            .subscribe();

        // 3. Listen for new rides (for assignee notification)
        const ridesChannel = supabase
            .channel('driver-active-rides')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'rides',
                    filter: `driver_id=eq.${user.id}`
                },
                (payload) => {
                    if (payload.new && payload.new.status !== 'COMPLETED') {
                        setActiveRideId(payload.new.id);
                        setNotification("¡Tienes un nuevo viaje asignado!");
                    }
                }
            )
            .subscribe();

        // 4. Listen for new or updated ride requests
        const requestsChannel = supabase
            .channel('public:ride_requests')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to everything on ride_requests
                    schema: 'public',
                    table: 'ride_requests'
                },
                () => {
                    getCurrentPosition()
                        .then(pos => {
                            setLocation(pos);
                            fetchRequests(pos);
                        })
                        .catch(() => fetchRequests(null));
                }
            )
            .subscribe();

        // 5. Initial position and request fetch
        getCurrentPosition()
            .then(pos => {
                setLocation(pos);
                fetchRequests(pos);
            })
            .catch(err => {
                console.error("No location", err);
                fetchRequests(null);
            });

        return () => {
            supabase.removeChannel(offersChannel);
            supabase.removeChannel(ridesChannel);
            supabase.removeChannel(requestsChannel);
        };
    }, [user]);

    const checkActiveRide = async () => {
        if (!user) return; // Wait for user session

        try {
            const { data, error } = await supabase
                .from('rides')
                .select('id')
                .eq('driver_id', user.id)
                .neq('status', 'COMPLETED')
                .neq('status', 'CANCELLED')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error("Supabase Error checking active ride:", error);
            }

            if (data && data.length > 0) {
                setActiveRideId(data[0].id);
            } else {
                setActiveRideId(null);
            }
        } catch (err) {
            console.error("Exception checking active ride", err);
        }
    };

    const fetchRequests = async (loc: Coordinates | null) => {
        try {
            const { data, error } = await supabase
                .from("ride_requests")
                .select("*, profiles:client_id(name)")
                .eq("status", "OPEN")
                .order('created_at', { ascending: false });

            if (error) throw error;

            let filtered = data as Request[];

            if (loc) {
                // Filter by radius and sort by distance
                filtered = filtered
                    .map(req => ({
                        ...req,
                        dist: getDistanceFromLatLonInKm(loc.lat, loc.lng, req.pickup_lat, req.pickup_lng)
                    }))
                    .filter(req => req.dist <= searchRadius)
                    .sort((a, b) => a.dist - b.dist);
            }

            setRequests(filtered);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
            {notification && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl relative flex items-center justify-between shadow-sm animate-in slide-in-from-top-4">
                    <span className="block sm:inline font-medium">{notification}</span>
                    <button onClick={() => setNotification(null)} className="ml-4 font-bold opacity-70 hover:opacity-100">
                        ×
                    </button>
                </div>
            )}

            {activeRideId && (
                <div className="bg-black text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-green-400 font-bold mb-1 uppercase tracking-wider text-xs">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            Viaje en Curso
                        </div>
                        <h2 className="text-xl font-bold mb-3">Tienes un viaje asignado</h2>
                        <Link
                            href={`/ride/${activeRideId}`}
                            className="bg-white text-black font-bold py-3 px-6 rounded-xl block text-center hover:bg-gray-100 transition-colors"
                        >
                            Ir a la pantalla de viaje
                        </Link>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute -bottom-10 -right-10 opacity-10">
                        <Navigation size={120} />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4 mt-8">
                <h1 className="text-2xl font-bold">Viajes Cercanos</h1>
                <div className="bg-white px-3 py-1 rounded-full border text-xs font-medium shadow-sm">
                    Radio: {searchRadius}km
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-gray-400" />
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-dashed border-gray-300">
                    <SearchX size={48} className="text-gray-300" />
                    <p className="text-gray-500 font-medium px-4">
                        Buscando solicitudes cercanas...
                    </p>
                    <p className="text-sm text-gray-400">
                        Te notificaremos en cuanto haya un viaje.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(req => (
                        <Link href={`/driver/request/${req.id}`} key={req.id}>
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
                                <div className="mb-3">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Pasajero</p>
                                    <p className="text-base font-black text-gray-900 uppercase tracking-tight">
                                        {req.profiles?.name || "Usuario TaxiBid"}
                                    </p>
                                </div>

                                <div className="flex justify-between items-start mb-3 border-t pt-3">
                                    <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
                                        <DollarSign size={18} />
                                        {req.client_bid}
                                    </div>
                                    {(req as any).dist && (
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-600 font-bold">
                                            A {((req as any).dist).toFixed(1)} km
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2 mb-3">
                                    <div className="flex items-start gap-2">
                                        <MapPin size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{req.pickup_reference}</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Navigation size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-gray-600 line-clamp-1">{req.dest_text}</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
