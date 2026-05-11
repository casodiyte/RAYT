"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { NavigationButtons } from "@/components/NavigationButtons";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { Loader2, ArrowLeft, DollarSign, MapPin, Navigation, ExternalLink } from "lucide-react";
import Link from 'next/link';
import { Map, MapMarker, MarkerContent } from "@/components/ui/map";

export default function RequestDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const router = useRouter();
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bidAmount, setBidAmount] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [hasBid, setHasBid] = useState(false);

    useEffect(() => {
        if (id) fetchRequest();

        // Listen for ANY new ride assigned to this driver for THIS request
        if (!user) return;

        const ridesChannel = supabase
            .channel(`driver-request-active-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'rides',
                    filter: `ride_request_id=eq.${id}`
                },
                (payload) => {
                    if (payload.new && payload.new.driver_id === user.id) {
                        router.push(`/ride/${payload.new.id}`);
                    } else if (payload.new) {
                        // Someone else got the ride
                        showNotification("Otro conductor tomó este viaje.", "error");
                        router.push('/driver/requests');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ridesChannel);
        };
    }, [id, user, router]);

    const fetchRequest = async () => {
        const { data, error } = await supabase
            .from("ride_requests")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
            setRequest(null);
        } else {
            setRequest(data);
            if (data.client_bid) setBidAmount(data.client_bid.toString());
            checkIfBid();
        }
        setLoading(false);
    };

    const checkIfBid = async () => {
        if (!user) return;
        const { data } = await supabase
            .from("offers")
            .select("id")
            .eq("ride_request_id", id)
            .eq("driver_id", user.id)
            .maybeSingle(); // Use maybeSingle to avoid 406 error if multiple (shouldn't happen) or none

        if (data) setHasBid(true);
    }

    const handleBid = async () => {
        if (!user || !request) return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from("offers").insert({
                ride_request_id: request.id,
                driver_id: user.id,
                amount: parseFloat(bidAmount),
                status: "PENDING"
            });

            if (error) throw error;

            setHasBid(true);
            showNotification("¡Oferta enviada!", "success");
            router.push("/driver/requests");

        } catch (err) {
            console.error(err);
            showNotification("Error al enviar la oferta", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!request) return <div className="p-8 text-center">Solicitud no encontrada</div>;

    return (
        <div className="max-w-md mx-auto p-4 pb-8">
            <Link href="/driver/requests" className="inline-flex items-center text-gray-500 mb-6 hover:text-black">
                <ArrowLeft size={20} className="mr-1" /> Volver a la Lista
            </Link>

            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">
                <div className="border-b pb-4">
                    <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Oferta del Cliente</p>
                    <div className="text-3xl font-black text-green-700 flex items-center mt-1">
                        <DollarSign size={24} className="stroke-[3px]" />
                        {request.client_bid}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="relative pl-6 border-l-2 border-gray-200 space-y-8">
                        {/* Pickup */}
                        <div className="relative">
                            <div className="absolute -left-[31px] bg-blue-500 w-4 h-4 rounded-full border-2 border-white ring-1 ring-gray-100" />
                            <h3 className="text-xs font-bold text-gray-400 uppercase">Lugar de Recogida</h3>
                            <p className="text-lg font-medium text-gray-900 mt-1">{request.pickup_reference}</p>

                            {/* Navigation Links */}
                            <NavigationButtons lat={request.pickup_lat} lng={request.pickup_lng} type="pickup" />
                        </div>

                        {/* Destination */}
                        <div className="relative">
                            <div className="absolute -left-[31px] bg-black w-4 h-4 rounded-full border-2 border-white ring-1 ring-gray-100" />
                            <h3 className="text-xs font-bold text-gray-400 uppercase">Destino</h3>
                            <p className="text-lg font-medium text-gray-900 mt-1">{request.dest_text}</p>

                            {/* Show dest nav if coords available */}
                            {request.dest_lat && (
                                <NavigationButtons lat={request.dest_lat} lng={request.dest_lng} type="dropoff" />
                            )}
                            {/* If no coords, we could do a search link, need to implement that if strictly requested. 
                   User request: 'si solo texto → usar google search query'.
                   Let's add that logic inline or update component. 
               */}
                            {!request.dest_lat && (
                                <div className="mt-3">
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.dest_text)}`}
                                        target="_blank"
                                        className="flex w-full items-center justify-center gap-2 bg-gray-100 py-2.5 rounded-lg font-medium text-gray-700 hover:bg-gray-200 transition-colors text-sm"
                                    >
                                        <ExternalLink size={16} /> Buscar en Mapa
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="h-[200px] w-full mt-4 rounded-xl overflow-hidden border">
                    <Map
                        viewport={{ center: [request.pickup_lng, request.pickup_lat], zoom: 13 }}
                        interactive={false}
                    >
                        <MapMarker longitude={request.pickup_lng} latitude={request.pickup_lat}>
                            <MarkerContent>
                                <div className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
                            </MarkerContent>
                        </MapMarker>

                        {request.dest_lat && request.dest_lng && (
                            <MapMarker longitude={request.dest_lng} latitude={request.dest_lat}>
                                <MarkerContent>
                                    <div className="relative h-4 w-4 rounded-full border-2 border-white bg-black shadow-lg" />
                                </MarkerContent>
                            </MapMarker>
                        )}
                    </Map>
                </div>
            </div>

            {hasBid ? (
                <div className="mt-6 bg-white rounded-2xl shadow-sm border p-6 text-center">
                    <div className="text-green-600 font-bold text-lg flex items-center justify-center gap-2">
                        ✅ Oferta Enviada
                    </div>
                </div>
            ) : (
                <div className="mt-6 bg-white rounded-2xl shadow-sm border p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tu Contraoferta (MXN)</label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                                type="number"
                                className="block w-full rounded-md border-0 py-3 pl-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-lg font-semibold"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={async () => {
                                setBidAmount(request.client_bid.toString());
                                // Direct handleBid equivalent
                                setSubmitting(true);
                                try {
                                    const { error } = await supabase.from("offers").insert({
                                        ride_request_id: request.id,
                                        driver_id: user?.id,
                                        amount: request.client_bid,
                                        status: "PENDING"
                                    });
                                    if (error) throw error;
                                    setHasBid(true);
                                    showNotification("¡Oferta enviada y aceptada!", "success");
                                    router.push("/driver/requests");
                                } catch (err) {
                                    showNotification("Error al enviar la oferta", "error");
                                } finally {
                                    setSubmitting(false);
                                }
                            }}
                            disabled={submitting}
                            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            Aceptar por ${request.client_bid}
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => router.push('/driver/requests')}
                                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                Omitir
                            </button>
                            <button
                                onClick={handleBid}
                                disabled={submitting || parseFloat(bidAmount) === request.client_bid}
                                className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="animate-spin mx-auto" /> : "Contraofertar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
