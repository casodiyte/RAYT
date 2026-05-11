"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Phone, MapPin, CheckCircle, Car, Navigation, MessageSquare, Send, X } from "lucide-react";
import { NavigationButtons } from "@/components/NavigationButtons";
import { Map, MapMarker, MarkerContent, MapRoute } from "@/components/ui/map";
import { useModal } from "@/context/ModalContext";

export default function RidePage() {
    const { id } = useParams();
    const { user, profile } = useAuth();
    const router = useRouter();
    const { showConfirm } = useModal();

    const [ride, setRide] = useState<any>(null);
    const [request, setRequest] = useState<any>(null);
    const [driver, setDriver] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

    // Chat States
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Status mapping to human readable and progress
    const STATUS_STEPS = ["MATCHED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_PAYMENT", "COMPLETED", "CANCELLED"];
    
    const STATUS_LABELS: Record<string, string> = {
        MATCHED: "CONDUCTOR ASIGNADO",
        EN_ROUTE: "CONDUCTOR EN CAMINO",
        ARRIVED: "LLEGÓ AL ORIGEN",
        IN_PROGRESS: "VIAJE EN CURSO",
        AWAITING_PAYMENT: "PAGO PENDIENTE",
        COMPLETED: "VIAJE FINALIZADO",
        CANCELLED: "VIAJE CANCELADO"
    };
    
    // Throttling for location broadcasts (save costs)
    const lastBroadcastRef = useRef<number>(0);

    useEffect(() => {
        if (!id) return;
        fetchRideData();

        // Realtime subscription for status updates
        const channel = supabase
            .channel('ride-update')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rides',
                    filter: `id=eq.${id}`
                },
                (payload) => {
                    setRide(payload.new);
                    // Redirect for Client (or Driver on another device) when status marks as terminal
                    if (payload.new.status === 'COMPLETED' || payload.new.status === 'CANCELLED') {
                        setTimeout(() => router.push(profile?.role === 'DRIVER' ? '/driver/requests' : '/client/request-ride'), 3000);
                    }
                }
            )
            .subscribe();

        // Chat subscription
        const fetchMessages = async () => {
            const { data } = await supabase.from('ride_messages').select('*').eq('ride_id', id).order('created_at', { ascending: true });
            if (data) setMessages(data);
        };
        fetchMessages();

        const chatChannel = supabase.channel(`ride-chat-${id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'ride_messages', filter: `ride_id=eq.${id}` },
                (payload) => {
                    setMessages(prev => [...prev, payload.new]);
                    if (!isChatOpen) setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(chatChannel);
        };
    }, [id, isChatOpen]);

    const isDriver = profile?.role === "DRIVER";

    // Effect for Driver: Broadcast Location with Throttling (4s)
    useEffect(() => {
        if (!isDriver || !ride || !id) return;
        if (ride.status !== 'EN_ROUTE' && ride.status !== 'IN_PROGRESS') return;

        const channel = supabase.channel(`ride-${id}-location`);
        let watchId: number;

        channel.subscribe((status) => {
            if (status !== 'SUBSCRIBED') return;

            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const now = Date.now();
                    
                    // Local state remains instant for driver responsiveness
                    setDriverLocation({ lat: latitude, lng: longitude });

                    // Broadcast to server only every 4 seconds to reduce Supabase Realtime cost
                    if (now - lastBroadcastRef.current >= 4000) {
                        lastBroadcastRef.current = now;
                        channel.send({
                            type: 'broadcast',
                            event: 'location-update',
                            payload: { lat: latitude, lng: longitude }
                        });
                    }
                },
                (error) => console.error("Error watching position:", error),
                { enableHighAccuracy: true, maximumAge: 3000, timeout: 6000 }
            );
        });

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            supabase.removeChannel(channel);
        };
    }, [isDriver, ride?.status, id]);

    // Effect for Client: Listen to Location Broadcast
    useEffect(() => {
        if (isDriver || !ride || !id) return;
        if (ride.status === 'COMPLETED') return;

        const channel = supabase.channel(`ride-${id}-location`)
            .on('broadcast', { event: 'location-update' }, (payload) => {
                setDriverLocation(payload.payload);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isDriver, ride?.status, id]);

    const fetchRideData = async () => {
        try {
            // 1. Get Ride
            const { data: rideData, error: rideError } = await supabase
                .from("rides")
                .select("*")
                .eq("id", id)
                .single();

            if (rideError) throw rideError;
            setRide(rideData);

            // 2. Get Driver Info
            if (rideData.driver_id) {
                const { data: driverData } = await supabase
                    .from('drivers')
                    .select('*, profiles(name)')
                    .eq('user_id', rideData.driver_id)
                    .single();
                if (driverData) setDriver(driverData);
            }

            // 3. Get Request Details (for pickup/dest info)
            const { data: reqData, error: reqError } = await supabase
                .from("ride_requests")
                .select("*")
                .eq("id", rideData.ride_request_id)
                .single();

            if (reqError) throw reqError;
            setRequest(reqData);

            // 3. Fetch Route from OSRM from Pickup to Destination
            if (reqData.pickup_lat && reqData.dest_lat) {
                fetch(`https://router.project-osrm.org/route/v1/driving/${reqData.pickup_lng},${reqData.pickup_lat};${reqData.dest_lng},${reqData.dest_lat}?overview=full&geometries=geojson`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.routes && data.routes[0]) {
                            setRouteCoords(data.routes[0].geometry.coordinates);
                        }
                    }).catch(err => console.error("Error fetching route", err));
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const [waitingTime, setWaitingTime] = useState(0);
    const [extraFee, setExtraFee] = useState(0);

    useEffect(() => {
        if (!ride || ride.status !== 'ARRIVED') {
            setWaitingTime(0);
            setExtraFee(0);
            return;
        }

        const interval = setInterval(() => {
            if (!ride.arrived_at) return;
            const arrivedTime = new Date(ride.arrived_at).getTime();
            const now = new Date().getTime();
            const diffMinutes = Math.floor((now - arrivedTime) / 60000);
            
            setWaitingTime(diffMinutes);
            if (diffMinutes > 3) {
                setExtraFee((diffMinutes - 3) * 5);
            }
        }, 10000); // Check every 10s

        return () => clearInterval(interval);
    }, [ride?.status, ride?.arrived_at]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;
        
        const tempMsg = newMessage.trim();
        setNewMessage("");
        
        const { error } = await supabase.from('ride_messages').insert({
            ride_id: id,
            sender_id: user.id,
            content: tempMsg
        });
        
        if (error) console.error("Error sending message:", error);
    };

    const updateStatus = async (newStatus: string) => {
        try {
            const updates: any = { status: newStatus };
            
            if (newStatus === 'ARRIVED') {
                updates.arrived_at = new Date().toISOString();
            }
            
            if (newStatus === 'IN_PROGRESS' && extraFee > 0) {
                updates.waiting_fee = extraFee;
                updates.final_price = ride.final_price + extraFee;
            }

            const { error } = await supabase
                .from("rides")
                .update(updates)
                .eq("id", id);

            if (error) throw error;
            
            fetchRideData();

            if (newStatus === 'COMPLETED') {
                setTimeout(() => router.push(profile?.role === 'DRIVER' ? '/driver/requests' : '/client/request-ride'), 3000);
            }

        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-black/20"><Loader2 className="animate-spin" /></div>;
    if (!ride || !request) return <div className="p-8">Viaje no encontrado</div>;

    const currentStepIndex = STATUS_STEPS.indexOf(ride.status);
    const isCompleted = ride.status === 'COMPLETED';
    const isCancelled = ride.status === 'CANCELLED';

    const headerBg = isCompleted ? 'bg-green-100' : isCancelled ? 'bg-red-100' : 'bg-black';
    const headerText = isCompleted ? 'text-green-800' : isCancelled ? 'text-red-800' : 'text-white';
    const subText = isCompleted ? 'text-green-700' : isCancelled ? 'text-red-700' : 'text-gray-400';

    const basePrice = ride.final_price - (ride.waiting_fee || 0);
    const currentWaitingFee = ride.status === 'ARRIVED' ? extraFee : (ride.waiting_fee || 0);

    return (
        <div className="max-w-md mx-auto p-4 min-h-screen bg-white pb-48 relative overflow-hidden">
            {/* BUTTON CHAT FLOATING */}
            {!isCompleted && !isCancelled && ride.status !== 'AWAITING_PAYMENT' && (
                <button 
                    onClick={() => { setIsChatOpen(true); setUnreadCount(0); }}
                    className="fixed bottom-24 right-6 z-40 bg-black text-white p-4 rounded-full shadow-2xl active:scale-95 transition-transform"
                >
                    <div className="relative">
                        <MessageSquare size={24} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-black">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                </button>
            )}

            {/* CHAT WINDOW SLIDE UP */}
            {isChatOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsChatOpen(false)} />
                    <div className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500 h-[70vh]">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border">
                                    <img src="/car-logo.png" alt="Car" className="w-6 h-auto" />
                                </div>
                                <h3 className="font-black uppercase tracking-wider text-sm">Chat del Viaje</h3>
                            </div>
                            <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.length === 0 && (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    Dile algo al {isDriver ? 'cliente' : 'conductor'}...
                                </div>
                            )}
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-[26px] text-sm break-words shadow-sm ${
                                        m.sender_id === user?.id 
                                        ? 'bg-black text-white rounded-tr-none' 
                                        : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
                                    }`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={sendMessage} className="p-6 bg-white border-t flex gap-2 items-center">
                            <input 
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Escribe un mensaje..."
                                className="flex-1 bg-gray-100 border-none rounded-2xl py-4 px-6 text-sm focus:ring-2 focus:ring-black"
                            />
                            <button type="submit" className="bg-black text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-transform">
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Arrival Notification for Client */}
            {!isDriver && ride.status === 'ARRIVED' && (
                <div className="bg-blue-600 text-white p-4 rounded-xl mb-4 animate-bounce shadow-lg flex items-center gap-3">
                    <CheckCircle className="shrink-0" />
                    <div>
                        <p className="font-bold">¡Tu conductor ha llegado!</p>
                        <p className="text-xs opacity-90">Tienes 3 min. de cortesía. Después se cobrará $5/min.</p>
                    </div>
                </div>
            )}

            {/* AWAITING PAYMENT OVERLAY */}
            {ride.status === 'AWAITING_PAYMENT' && (
                <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6 text-white text-center">
                    <div className="w-full max-w-sm space-y-8">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-widest text-orange-500">RESUMEN DE PAGO</h2>
                            <p className="text-gray-400 text-sm mt-1">El viaje ha finalizado con éxito</p>
                        </div>

                        <div className="bg-white/10 p-10 rounded-[40px] border border-white/20 shadow-2xl backdrop-blur-sm">
                            <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-2">Total a {isDriver ? 'Cobrar' : 'Pagar'}</p>
                            <div className="flex items-start justify-center">
                                <span className="text-2xl mt-4 mr-1 font-bold text-gray-400">$</span>
                                <p className="text-7xl font-black tracking-tighter tabular-nums text-white">
                                    {ride.status === 'ARRIVED' ? (ride.final_price + extraFee) : ride.final_price}
                                </p>
                            </div>
                            <p className="text-gray-400 font-bold mt-2">MXN</p>
                            
                            <div className="mt-8 pt-6 border-t border-white/10 space-y-2 text-sm text-gray-400">
                                <div className="flex justify-between">
                                    <span>Tarifa Base</span>
                                    <span>${basePrice}</span>
                                </div>
                                {currentWaitingFee > 0 && (
                                    <div className="flex justify-between text-orange-400 font-bold">
                                        <span>Extras por Espera</span>
                                        <span>+${currentWaitingFee}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isDriver ? (
                            <button
                                onClick={() => updateStatus("COMPLETED")}
                                className="w-full bg-green-500 text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-green-500/40 active:scale-95 transition-transform"
                            >
                                RECIBÍ EL PAGO
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="inline-block p-4 rounded-full bg-orange-500/10 border border-orange-500/20">
                                    <Loader2 className="animate-spin text-orange-500" size={32} />
                                </div>
                                <p className="text-lg font-medium">Por favor, entrega el efectivo</p>
                                <p className="text-xs text-gray-400 max-w-[200px] mx-auto opacity-70">
                                    Estamos esperando que el conductor confirme que recibió el dinero para terminar el viaje.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Header Status */}
            <div className={`text-center py-8 rounded-2xl mb-6 ${headerBg} duration-500`}>
                <h1 className={`text-3xl font-black uppercase ${headerText}`}>
                    {STATUS_LABELS[ride.status] || ride.status}
                </h1>
                {ride.status === 'ARRIVED' && (
                    <div className="mt-2 text-sm font-medium">
                        Tiempo de Espera: <span className="text-orange-500">{waitingTime} min</span>
                        {extraFee > 0 && <span className="ml-2 text-red-500">(+${extraFee} Extra)</span>}
                    </div>
                )}
            </div>

            {/* Trip Details */}
            <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-xl border space-y-4">
                    <div className="flex gap-3">
                        <div className="mt-1">
                            <div className="bg-blue-500 w-3 h-3 rounded-full" />
                            <div className="w-0.5 h-10 bg-gray-300 mx-auto my-1" />
                            <div className="bg-black w-3 h-3 rounded-full" />
                        </div>
                        <div className="space-y-8 flex-1">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Origen</p>
                                <p className="font-medium text-gray-900">{request.pickup_reference}</p>
                                {isDriver && ride.status !== 'COMPLETED' && (
                                    <NavigationButtons lat={request.pickup_lat} lng={request.pickup_lng} type="pickup" />
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Destino</p>
                                <p className="font-medium text-gray-900">{request.dest_text}</p>
                                {isDriver && ride.status === 'IN_PROGRESS' && request.dest_lat && (
                                    <NavigationButtons lat={request.dest_lat} lng={request.dest_lng} type="dropoff" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tarjeta del Conductor Profesional */}
                {driver && !isDriver && (
                    <div className="bg-white border-2 border-gray-50 rounded-[32px] p-6 shadow-xl flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-500 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-50 transition-colors" />
                        
                        <div className="w-20 h-20 rounded-[28px] bg-gray-50 flex items-center justify-center shadow-inner relative overflow-hidden shrink-0 border border-gray-100">
                             <div className="absolute inset-0 opacity-10" style={{ 
                                 backgroundColor: driver.vehicle_color?.toLowerCase().includes('azul') ? '#3b82f6' : 
                                                 driver.vehicle_color?.toLowerCase().includes('rojo') ? '#ef4444' :
                                                 driver.vehicle_color?.toLowerCase().includes('verde') ? '#22c55e' :
                                                 driver.vehicle_color?.toLowerCase().includes('amarillo') ? '#eab308' :
                                                 driver.vehicle_color?.toLowerCase().includes('blanco') ? '#f1f5f9' : 'gray'
                             }} />
                              <img 
                                 src="/car-logo.png" 
                                 alt="Car" 
                                 className="relative z-10 w-14 h-auto object-contain drop-shadow-sm" 
                              />
                        </div>
                        
                        <div className="flex-1 relative z-10">
                             <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mb-1">Tu Conductor Profesional</p>
                             <h3 className="text-xl font-black uppercase tracking-tight text-gray-800 leading-tight">
                                {driver.profiles?.name || 'Chofer Asignado'}
                             </h3>
                             <div className="flex flex-wrap items-center gap-2 mt-3">
                                  <div className="bg-black px-3 py-1.5 rounded-xl shadow-lg border border-black group-hover:border-blue-500 transition-colors">
                                      <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase">{driver.plate}</span>
                                  </div>
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-100">
                                    {driver.vehicle_model} • {driver.vehicle_color}
                                  </span>
                             </div>
                        </div>

                        {!isDriver && driver.profiles?.phone && (
                            <a href={`tel:${driver.profiles.phone}`} className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-110 active:scale-95 transition-all">
                                <Phone size={20} />
                            </a>
                        )}
                    </div>
                )}

                {/* Mapa */}
                <div className="h-[350px] w-full rounded-xl overflow-hidden border shadow-sm relative">
                    <Map viewport={{ center: [request.pickup_lng, request.pickup_lat], zoom: 13 }} interactive={true}>
                        <MapMarker longitude={request.pickup_lng} latitude={request.pickup_lat}>
                            <MarkerContent><div className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" /></MarkerContent>
                        </MapMarker>
                        {request.dest_lat && request.dest_lng && (
                            <MapMarker longitude={request.dest_lng} latitude={request.dest_lat}>
                                <MarkerContent><div className="relative h-4 w-4 rounded-full border-2 border-white bg-black shadow-lg" /></MarkerContent>
                            </MapMarker>
                        )}
                        {routeCoords.length > 0 && ride.status !== 'COMPLETED' && ride.status !== 'CANCELLED' && (
                            <MapRoute coordinates={routeCoords} color="#3b82f6" width={5} opacity={0.8} />
                        )}
                        {driverLocation && (
                            <MapMarker longitude={driverLocation.lng} latitude={driverLocation.lat}>
                                <MarkerContent>
                                    <div className="relative h-10 w-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center animate-pulse" style={{ 
                                        backgroundColor: driver?.vehicle_color?.toLowerCase().includes('azul') ? '#3b82f6' : 
                                                        driver?.vehicle_color?.toLowerCase().includes('rojo') ? '#ef4444' :
                                                        driver?.vehicle_color?.toLowerCase().includes('amarillo') ? '#eab308' :
                                                        driver?.vehicle_color?.toLowerCase().includes('verde') ? '#22c55e' :
                                                        driver?.vehicle_color?.toLowerCase().includes('blanco') ? '#f1f5f9' : '#10b981'
                                    }}>
                                        <img src="/car-logo.png" alt="Car" className="w-8 h-8 object-contain" />
                                    </div>
                                </MarkerContent>
                            </MapMarker>
                        )}
                    </Map>
                </div>

                {/* Status Actions */}
                {isDriver && !isCompleted && !isCancelled && (
                    <div className="space-y-3 pt-4">
                        {ride.status === 'MATCHED' && <button onClick={() => updateStatus("EN_ROUTE")} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">IR AL ORIGEN</button>}
                        {ride.status === 'EN_ROUTE' && <button onClick={() => updateStatus("ARRIVED")} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">HE LLEGADO</button>}
                        {ride.status === 'ARRIVED' && <button onClick={() => updateStatus("IN_PROGRESS")} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">INICIAR VIAJE</button>}
                        {ride.status === 'IN_PROGRESS' && <button onClick={() => updateStatus("AWAITING_PAYMENT")} className="w-full bg-black text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">FINALIZAR VIAJE</button>}
                        
                        {(ride.status === 'MATCHED' || ride.status === 'EN_ROUTE' || ride.status === 'ARRIVED') && (
                            <button 
                                onClick={() => showConfirm(
                                    "¿Cancelar Viaje?",
                                    "¿Estás seguro de cancelar este viaje? Se le notificará al cliente.",
                                    () => updateStatus("CANCELLED"),
                                    { type: "warning", confirmText: "Sí, cancelar", cancelText: "Volver" }
                                )} 
                                className="w-full mt-4 text-red-500 font-bold text-sm py-3 border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
                            >
                                Cancelar Viaje
                            </button>
                        )}
                    </div>
                )}

                {!isDriver && !isCompleted && !isCancelled && (
                    <div className="pt-4 text-center space-y-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-dashed text-gray-400 text-xs font-medium">
                            Conductor en camino. Mantente en el punto de recogida.
                        </div>
                        
                        {(ride.status === 'MATCHED' || ride.status === 'EN_ROUTE' || ride.status === 'ARRIVED') && (
                            <button 
                                onClick={() => showConfirm(
                                    "¿Cancelar Viaje?",
                                    "¿Deseas cancelar tu viaje?",
                                    () => updateStatus("CANCELLED"),
                                    { type: "warning", confirmText: "Sí, cancelar", cancelText: "Volver" }
                                )} 
                                className="w-full text-red-500 font-bold text-sm py-4 border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
                            >
                                Cancelar mi Viaje
                            </button>
                        )}
                    </div>
                )}

                {/* Fare Info Summary */}
                <div className="border-t pt-6 mt-6 space-y-3">
                    <div className="flex justify-between items-center text-sm text-gray-500 uppercase font-bold tracking-wider">
                        <span>Resumen de Pago</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-gray-600">Tarifa Acordada</span>
                        <span className="font-semibold text-gray-900">${basePrice} MXN</span>
                    </div>
                    {currentWaitingFee > 0 && (
                        <div className="flex justify-between items-center py-1 text-red-600">
                            <span>Tiempo de espera extra</span>
                            <span className="font-bold">+$ {currentWaitingFee} MXN</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-4 border-t-2 border-dashed border-gray-100 mt-2">
                        <span className="text-lg font-bold text-gray-900">Total a {isDriver ? 'Recibir' : 'Pagar'}</span>
                        <div className="text-right">
                            <span className="text-3xl font-black text-black">
                                ${ride.status === 'ARRIVED' ? (ride.final_price + extraFee) : ride.final_price}
                            </span>
                            <span className="text-xs font-bold block text-gray-400">MXN</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
