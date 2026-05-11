"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, DollarSign, UserCircle, Check } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";
import { useModal } from "@/context/ModalContext";

interface Offer {
    id: string;
    amount: number;
    driver_id: string;
    driver: {
        name: string;
        phone: string;
    };
    created_at: string;
}

export default function OffersPage() {
    const router = useRouter();
    const { showNotification } = useNotification();
    const { showConfirm } = useModal();
    const searchParams = useSearchParams();
    const requestId = searchParams.get("id");

    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("OPEN");

    useEffect(() => {
        if (!requestId) return;

        // 1. Fetch existing offers
        fetchOffers();

        // 2. Subscribe to new offers
        const channel = supabase
            .channel('offers-channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'offers',
                    filter: `ride_request_id=eq.${requestId}`
                },
                () => {
                    // Reload all offers to get joined driver data easily 
                    // (Realtime payload doesn't have joins, so fetch is easier for MVP)
                    fetchOffers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [requestId]);

    const fetchOffers = async () => {
        if (!requestId) return;
        const { data, error } = await supabase
            .from("offers")
            .select(`
        id,
        amount,
        driver_id,
        created_at
      `)
            .eq("ride_request_id", requestId)
            .eq("status", "PENDING")
            .order('amount', { ascending: true }); // Lower price first? or newest? Let's do lowest price.

        if (error) console.error(error);

        // Manual join for profiles since my profile types in RLS may restrict listing all clients... 
        // actually, drivers table or profile table is readable.
        // Let's doing separate fetch for driver names for simplicity or better, change query to join if possible.
        // Supabase JS inner join: .select('*, driver:profiles(*)')

        if (data) {
            // Enriched query
            const enriched = await Promise.all(data.map(async (o: any) => {
                const { data: driver } = await supabase.from("profiles").select("name, phone").eq("id", o.driver_id).single();
                return { ...o, driver };
            }));
            setOffers(enriched as Offer[]);
        }
        setLoading(false);
    };

    const handleAccept = async (offer: Offer) => {
        if (!requestId) return;
        try {
            // 1. Update Offer
            const { error: offerError } = await supabase
                .from("offers")
                .update({ status: "ACCEPTED" })
                .eq("id", offer.id);

            if (offerError) throw offerError;

            // 2. Update Request
            const { error: reqError } = await supabase
                .from("ride_requests")
                .update({ status: "MATCHED" })
                .eq("id", requestId);

            if (reqError) throw reqError;

            // 3. Create Ride
            const { data: ride, error: rideError } = await supabase
                .from("rides")
                .insert({
                    ride_request_id: requestId,
                    driver_id: offer.driver_id,
                    final_price: offer.amount,
                    status: "MATCHED"
                })
                .select()
                .single();

            if (rideError) throw rideError;

            router.push(`/ride/${ride.id}`);

        } catch (err) {
            console.error(err);
            showNotification("Algo salió mal al aceptar la oferta.", "error");
        }
    };

    const handleCancel = async () => {
        if (!requestId) return;
        
        showConfirm(
            "¿Cancelar Solicitud?",
            "¿Estás seguro de que deseas cancelar tu solicitud de viaje?",
            async () => {
                try {
                    setLoading(true);
                    const { error } = await supabase
                        .from("ride_requests")
                        .update({ status: "CANCELLED" })
                        .eq("id", requestId);

                    if (error) throw error;
                    router.push("/client/request-ride");
                } catch (err) {
                    console.error(err);
                    showNotification("No se pudo cancelar la solicitud.", "error");
                } finally {
                    setLoading(false);
                }
            },
            { type: "warning", confirmText: "Sí, cancelar", cancelText: "Volver" }
        );
    };

    return (
        <div className="max-w-md mx-auto p-4 min-h-screen bg-gray-50 pb-48 relative">
            <h1 className="text-2xl font-bold mb-2">Conductores Haciendo Ofertas</h1>
            <p className="text-gray-500 mb-6 text-sm italic">Espera a que los conductores oferten por tu viaje...</p>

            {loading && (
                <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin text-gray-400" />
                </div>
            )}

            <div className="space-y-4">
                {offers.length === 0 && !loading && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                        <Loader2 className="animate-spin h-6 w-6 mx-auto mb-2 text-blue-500" />
                        <p className="text-gray-400">Esperando ofertas...</p>
                    </div>
                )}

                {offers.map((offer) => (
                    <div key={offer.id} className="bg-white p-5 rounded-xl shadow-sm border border-green-100 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <UserCircle className="text-gray-400" size={20} />
                                <span className="font-semibold">{offer.driver?.name || "Conductor"}</span>
                            </div>
                            <div className="text-3xl font-bold text-green-700">
                                ${offer.amount}
                            </div>
                        </div>
                        <button
                            onClick={() => handleAccept(offer)}
                            className="bg-black text-white px-5 py-3 rounded-lg font-medium hover:bg-gray-800 flex items-center gap-2 shadow-lg shadow-gray-200"
                        >
                            <Check size={18} />
                            Aceptar
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-12 pt-6 border-t border-gray-100 flex justify-center">
                <button 
                    onClick={handleCancel}
                    disabled={loading}
                    className="text-red-500 font-bold text-sm flex items-center gap-2 hover:bg-red-50 px-6 py-2 rounded-full transition-all border border-red-100/50"
                >
                    Cancelar esta Solicitud
                </button>
            </div>
        </div>
    );
}
