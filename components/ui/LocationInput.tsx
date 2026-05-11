"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2, CheckCircle } from "lucide-react";
import { getCurrentPosition, Coordinates, getDistanceFromLatLonInKm } from "@/lib/location";
import { cn } from "@/lib/utils";
import { Map, MapMarker, MarkerContent, MapControls } from "@/components/ui/map";

interface LocationInputProps {
    label: string;
    onLocationChange: (coords: Coordinates | null, reference: string) => void;
    requireCoords?: boolean;
    biasCoords?: Coordinates | null;
}

export function LocationInput({ label, onLocationChange, requireCoords = false, biasCoords = null }: LocationInputProps) {
    const [coords, setCoords] = useState<Coordinates | null>(null);
    const [reference, setReference] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Hide suggestions when clicking outside would be ideal, 
    // but for simplicity we'll handle it nicely inline.

    const handleGetLocation = async () => {
        setLoading(true);
        setError(null);
        try {
            const pos = await getCurrentPosition();
            setCoords(pos);
            onLocationChange(pos, reference);
        } catch (err) {
            setError("No se pudo obtener la ubicación. Asegúrate de que el GPS esté activado.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkerDragEnd = (lngLat: { lng: number; lat: number }) => {
        const newCoords = { lat: lngLat.lat, lng: lngLat.lng };
        setCoords(newCoords);
        onLocationChange(newCoords, reference);
    };

    const handleRefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setReference(value);
        onLocationChange(coords, value);

        if (value.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Nominatim API: More precise, no token required, but needs an User-Agent
                let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&limit=8&countrycodes=mx&accept-language=es`;
                
                if (biasCoords) {
                    // Bias results to a ~10km radius around the bias coordinates
                    const r = 0.1;
                    const viewbox = `${biasCoords.lng - r},${biasCoords.lat + r},${biasCoords.lng + r},${biasCoords.lat - r}`;
                    url += `&viewbox=${viewbox}&lat=${biasCoords.lat}&lon=${biasCoords.lng}`;
                }

                const res = await fetch(url, {
                    headers: {
                        'Accept-Language': 'es'
                    }
                });
                const data = await res.json();
                
                // Nominatim returns an array of objects directly
                setSuggestions(data || []);
                setShowSuggestions(true);
            } catch (err) {
                console.error("Error fetching suggestions:", err);
            } finally {
                setIsSearching(false);
            }
        }, 800);
    };

    const handleSelectSuggestion = (item: any) => {
        const addressText = item.display_name;

        const newCoords = {
            lng: parseFloat(item.lon),
            lat: parseFloat(item.lat)
        };

        setReference(addressText);
        setCoords(newCoords);
        onLocationChange(newCoords, addressText);

        setShowSuggestions(false);
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>

            {requireCoords ? (
                <div className="flex gap-2 mb-2">
                    <button
                        type="button"
                        onClick={handleGetLocation}
                        className={cn(
                            "flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors",
                            coords && "border-green-500 bg-green-50"
                        )}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin text-gray-400" size={20} />
                        ) : coords ? (
                            <>
                                <CheckCircle className="text-green-600" size={20} />
                                <span className="text-green-700 font-medium">Ubicación Establecida</span>
                            </>
                        ) : (
                            <>
                                <MapPin className="text-blue-600" size={20} />
                                <span className="text-blue-700 font-medium">Usar Ubicación Actual</span>
                            </>
                        )}
                    </button>
                </div>
            ) : null}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="relative">
                <input
                    type="text"
                    placeholder={requireCoords ? "Referencia (e.g. Casa verde)" : "Ingresa dirección o destino"}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm py-3 px-4 bg-gray-50 border"
                    value={reference}
                    onChange={handleRefChange}
                    onFocus={async () => {
                        if (reference.length === 0 && biasCoords) {
                            setIsSearching(true);
                            try {
                                // Search for generic nearby places to suggest
                                const r = 0.05;
                                const viewbox = `${biasCoords.lng - r},${biasCoords.lat + r},${biasCoords.lng + r},${biasCoords.lat - r}`;
                                const url = `https://nominatim.openstreetmap.org/search?q=plaza,parque,tienda,restaurante&format=json&addressdetails=1&limit=5&countrycodes=mx&accept-language=es&viewbox=${viewbox}&bounded=1&lat=${biasCoords.lat}&lon=${biasCoords.lng}`;
                                
                                const res = await fetch(url);
                                const data = await res.json();
                                setSuggestions(data || []);
                                setShowSuggestions(true);
                            } catch (err) {
                                console.error("Error fetching initial suggestions:", err);
                            } finally {
                                setIsSearching(false);
                            }
                        } else if (suggestions.length > 0) {
                            setShowSuggestions(true);
                        }
                    }}
                />

                {isSearching && (
                    <div className="absolute right-3 top-3 text-gray-400">
                        <Loader2 className="animate-spin w-5 h-5" />
                    </div>
                )}

                {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.map((item, idx) => {
                            const addressParts = item.display_name.split(", ");
                            const mainText = addressParts[0] || "Lugar desconocido";
                            const subText = addressParts.slice(1, 4).join(", ");
                            return (
                                <li
                                    key={idx}
                                    onClick={() => handleSelectSuggestion(item)}
                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between gap-4"
                                >
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm text-gray-900 line-clamp-1">{mainText}</div>
                                        {subText && <div className="text-[10px] text-gray-500 line-clamp-1 font-medium">{subText}</div>}
                                    </div>
                                    {biasCoords && (
                                        <div className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap">
                                            {getDistanceFromLatLonInKm(biasCoords.lat, biasCoords.lng, parseFloat(item.lat), parseFloat(item.lon)).toFixed(1)} km
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {coords && (
                <div className="h-[200px] w-full rounded-md overflow-hidden border relative mt-2">
                    <Map
                        viewport={{ center: [coords.lng, coords.lat], zoom: 15 }}
                        interactive={true}
                    >
                        <MapMarker
                            longitude={coords.lng}
                            latitude={coords.lat}
                            draggable={true}
                            onDragEnd={handleMarkerDragEnd}
                        >
                            <MarkerContent />
                        </MapMarker>
                        <MapControls showLocate={false} showCompass={false} />
                    </Map>
                </div>
            )}
        </div>
    );
}
