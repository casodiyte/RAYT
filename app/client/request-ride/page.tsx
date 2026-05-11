"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { supabase } from "@/lib/supabase";
import { LocationInput } from "@/components/ui/LocationInput";
import { Coordinates, estimatePrice, getDistanceFromLatLonInKm } from "@/lib/location";
import { Loader2, Car } from "lucide-react";

export default function RequestRidePage() {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const router = useRouter();

    const [pickupCoords, setPickupCoords] = useState<Coordinates | null>(null);
    const [pickupRef, setPickupRef] = useState("");
    const [destRef, setDestRef] = useState("");
    const [destCoords, setDestCoords] = useState<Coordinates | null>(null); // Optional
    const [offer, setOffer] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

    const handlePickupChange = (coords: Coordinates | null, ref: string) => {
        setPickupCoords(coords);
        setPickupRef(ref);
        recalculateEstimate(coords, destCoords);
    };

    const handleDestChange = (coords: Coordinates | null, ref: string) => {
        setDestCoords(coords);
        setDestRef(ref);
        recalculateEstimate(pickupCoords, coords);
    };

    const recalculateEstimate = (p: Coordinates | null, d: Coordinates | null) => {
        if (p && d) {
            const dist = getDistanceFromLatLonInKm(p.lat, p.lng, d.lat, d.lng);
            const est = estimatePrice(dist);
            setEstimatedPrice(est);
            // Auto-fill offer if empty? Maybe just suggestion.
            if (!offer) setOffer(est.toString());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pickupCoords || !user) return;

        const parsedBid = parseFloat(offer);
        if (isNaN(parsedBid) || parsedBid <= 0) {
            showNotification("Por favor ingresa un monto válido para tu oferta.", "error");
            return;
        }

        setLoading(true);
        try {
            const km = (pickupCoords && destCoords)
                ? getDistanceFromLatLonInKm(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng)
                : null;

            const requestPayload = {
                client_id: user.id,
                pickup_lat: pickupCoords.lat,
                pickup_lng: pickupCoords.lng,
                pickup_reference: pickupRef || "Ubicación Actual",
                dest_text: destRef || "Destino Desconocido",
                dest_lat: destCoords?.lat || null,
                dest_lng: destCoords?.lng || null,
                km_estimated: km,
                suggested_price: estimatedPrice,
                client_bid: parsedBid,
                status: "OPEN",
            };

            const { data, error } = await supabase.from("ride_requests")
                .insert(requestPayload)
                .select()
                .single();

            if (error) {
                console.error(">> ERROR FROM SUPABASE:", error);
                throw new Error(error.message || error.code || "Error desconocido de Supabase");
            }
            if (!data) {
                throw new Error("Datos devueltos por Supabase son nulos tras inserción válida.");
            }

            router.push(`/client/offers?id=${data.id}`);
        } catch (err: any) {
            console.error(">> DETALLE CRÍTICO:", err);
            console.error("Keys del error:", Object.keys(err));
            console.error("ToString:", String(err));
            showNotification("Falló la solicitud: " + (err?.message || String(err)), "error");
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = pickupCoords && destRef && offer;

    return (
        <div className="max-w-md mx-auto bg-white min-h-screen shadow-sm sm:rounded-xl sm:min-h-0 sm:my-8 sm:overflow-hidden relative">
            <div className="bg-black text-white p-4 sticky top-0 z-10">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <img src="/car-logo.png" alt="Logo" className="w-8 h-auto" /> TaxiBid
                </h1>
                <p className="text-xs text-gray-400">Solicitar un viaje</p>
            </div>

            <div className="p-6 space-y-8 pb-24">
                {/* Section 1: Pickup */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b pb-1">
                        <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                        Lugar de Recogida
                    </div>
                    <LocationInput
                        label="¿Dónde estás?"
                        onLocationChange={handlePickupChange}
                        requireCoords={true}
                    />
                </section>

                {/* Section 2: Destination */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b pb-1">
                        <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                        Destino
                    </div>
                    {/* Optional: Add "Use Map Location" button for destination if you were to add it, but strictly following 'Text Input: direccion' */}
                    <LocationInput
                        label="¿A dónde vas?"
                        onLocationChange={handleDestChange}
                        requireCoords={false}
                        biasCoords={pickupCoords}
                    />
                    {/* We allow capturing dest coords optionally inside the same component if the user clicks the button, but it defaults to text */}
                </section>

                {/* Section 3: Offer */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b pb-1">
                        <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                        Tu Oferta
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border">
                        {estimatedPrice ? (
                            <div className="mb-4 text-sm text-gray-600">
                                Tarifa estimada: <span className="font-bold text-gray-900">${estimatedPrice} MXN</span>
                            </div>
                        ) : (
                            <div className="mb-4 text-xs text-gray-400">
                                Ingresa ubicaciones precisas para ver el estimado
                            </div>
                        )}

                        <label htmlFor="offer" className="block text-sm font-medium text-gray-700 mb-1">
                            ¿Cuánto quieres pagar?
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                                type="text"
                                inputMode="decimal"
                                name="offer"
                                id="offer"
                                className="block w-full rounded-md border-0 py-3 pl-7 pr-12 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-xl sm:leading-6"
                                placeholder="0.00"
                                value={offer}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // Solo permite números y un punto decimal
                                    if (/^\d*\.?\d*$/.test(val)) {
                                        setOffer(val);
                                    }
                                }}
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-gray-500 sm:text-sm">MXN</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t sm:absolute">
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || loading}
                    className="w-full bg-black text-white py-4 rounded-xl text-lg font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                    {loading && <Loader2 className="animate-spin" />}
                    <span>Solicitar Viaje</span>
                </button>
            </div>
        </div>
    );
}
