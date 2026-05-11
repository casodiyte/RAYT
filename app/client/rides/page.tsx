"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
    Loader2, 
    MapPin, 
    Navigation, 
    ChevronRight, 
    Clock, 
    CreditCard,
    SearchX,
    Calendar,
    ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function ClientRidesPage() {
    const { user, profile } = useAuth();
    const [rides, setRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchRides();
    }, [user]);

    const fetchRides = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('rides')
                .select('*, ride_requests!inner(*)')
                .eq('ride_requests.client_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setRides(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-black/20" /></div>;

    return (
        <div className="max-w-md mx-auto p-6 min-h-screen bg-white">
            <header className="mb-8">
                <h1 className="text-3xl font-black uppercase tracking-tight">Mis Viajes</h1>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Historial de servicio</p>
            </header>

            {rides.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
                    <SearchX size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-500 font-bold">Aún no has viajado</p>
                    <Link href="/client/request-ride" className="mt-4 text-sm text-blue-600 font-bold uppercase tracking-widest">Pide tu primer viaje</Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {rides.map((ride) => {
                        const basePrice = ride.final_price - (ride.waiting_fee || 0);
                        const isCompleted = ride.status === 'COMPLETED';
                        
                        return (
                            <div key={ride.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
                                {/* Ticket Like Header */}
                                <div className="bg-gray-50 p-4 flex justify-between items-center border-b border-dashed border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-gray-400" />
                                        <span className="text-[10px] font-black uppercase text-gray-400">
                                            {new Date(ride.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {ride.status.replace("_", " ")}
                                    </div>
                                </div>

                                <div className="p-5 space-y-4">
                                    {/* Route Preview */}
                                    <div className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <div className="w-0.5 h-6 bg-gray-200 my-1" />
                                            <div className="w-2 h-2 rounded-full bg-black" />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-3">
                                            <p className="text-xs font-bold text-gray-900 truncate">
                                                {ride.ride_requests?.pickup_reference}
                                            </p>
                                            <p className="text-xs font-medium text-gray-500 truncate">
                                                {ride.ride_requests?.dest_text}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Price Breakdown */}
                                    <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-gray-300">Resumen de Cobro</p>
                                            <div className="flex flex-col text-xs text-gray-500">
                                                <span>Pactado: ${basePrice}</span>
                                                {ride.waiting_fee > 0 && (
                                                    <span className="text-red-500 font-bold">Extra: +${ride.waiting_fee}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-black">${ride.final_price}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase">MXN En Efectivo</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
