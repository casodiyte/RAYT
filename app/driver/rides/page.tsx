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
    ArrowRight,
    TrendingUp
} from "lucide-react";
import Link from "next/link";

export default function DriverRidesPage() {
    const { user, profile } = useAuth();
    const [rides, setRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalEarnings, setTotalEarnings] = useState(0);

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
                .eq('driver_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                setRides(data);
                const total = data.reduce((acc, r) => acc + (Number(r.final_price) || 0), 0);
                setTotalEarnings(total);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-black/20"><Loader2 className="animate-spin text-black/20" /></div>;

    return (
        <div className="max-w-md mx-auto p-6 min-h-screen bg-white">
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-green-700">Ganancias</h1>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Historial del conductor</p>
                </div>
                <div className="bg-green-50 px-4 py-2 rounded-2xl border border-green-100 flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-green-600">Total Generado</span>
                    <span className="text-xl font-black text-green-800">${totalEarnings}</span>
                </div>
            </header>

            {rides.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
                    <TrendingUp size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-500 font-bold">Aún no has realizado viajes</p>
                    <Link href="/driver/requests" className="mt-4 text-sm text-green-600 font-bold uppercase tracking-widest">Empieza a conducir</Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {rides.map((ride) => {
                        const basePrice = ride.final_price - (ride.waiting_fee || 0);
                        const isCompleted = ride.status === 'COMPLETED';
                        
                        return (
                            <div key={ride.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
                                <div className="bg-gray-50 p-4 flex justify-between items-center border-b border-gray-200">
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
                                    <div className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            <div className="w-0.5 h-6 bg-gray-200 my-1" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-black" />
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

                                    <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-gray-300">Desglose</p>
                                            <div className="flex flex-col text-xs text-gray-500">
                                                <span>Tarifa: ${basePrice}</span>
                                                {ride.waiting_fee > 0 && (
                                                    <span className="text-green-600 font-bold">Espera: +${ride.waiting_fee}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-green-700">${ride.final_price}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase">Efectivo Recibido</p>
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
