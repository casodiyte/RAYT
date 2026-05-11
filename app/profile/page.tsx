"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
    User, 
    History, 
    ChevronRight, 
    LogOut, 
    Phone, 
    MapPin, 
    Calendar,
    Star,
    Award,
    Clock,
    TrendingUp,
    ShieldAlert,
    Share2,
    Users,
    Loader2,
    X,
    Shield,
    ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const { user, profile, signOut, loading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState({
        totalRides: 0,
        totalSpent: 0,
        avgRating: 4.9, // Placeholder
        joinedDate: "Marzo 2024"
    });
    const [recentRides, setRecentRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isContactsOpen, setIsContactsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formSubmitted, setFormSubmitted] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user || !profile) return;
        fetchUserData();
    }, [user, profile]);

    const handlePanic = () => {
        if (confirm("¡ALERTA! ¿Deseas llamar a los servicios de emergencia (911) ahora?")) {
            window.location.href = "tel:911";
        }
    };

    const handleSupportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        
        try {
            const response = await fetch("https://formspree.io/f/xreogoyn", {
                method: "POST",
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                setFormSubmitted(true);
                setTimeout(() => {
                    setIsSupportOpen(false);
                    setFormSubmitted(false);
                }, 3000);
            }
        } catch (err) {
            console.error("Error sending form:", err);
            alert("Hubo un problema enviando el reporte. Reintenta.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchUserData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const userId = user.id;
            const role = profile?.role;
            
            // Stats logic here...
            let countQuery;
            if (role === 'CLIENT') {
                countQuery = supabase
                    .from('rides')
                    .select('id, final_price, ride_requests!inner(client_id)', { count: 'exact' })
                    .eq('ride_requests.client_id', userId)
                    .eq('status', 'COMPLETED');
            } else {
                countQuery = supabase
                    .from('rides')
                    .select('id, final_price', { count: 'exact' })
                    .eq('driver_id', userId)
                    .eq('status', 'COMPLETED');
            }

            const { data: rides, count, error: countError } = await countQuery;
            if (!countError && rides) {
                const total = (rides as any[]).reduce((acc, r) => acc + (Number(r.final_price) || 0), 0);
                setStats(prev => ({ ...prev, totalRides: count || 0, totalSpent: total }));
            }

            // Recent rides logic here...
            let historyQuery;
            if (role === 'CLIENT') {
                historyQuery = supabase
                    .from('rides')
                    .select('*, ride_requests!inner(*)')
                    .eq('ride_requests.client_id', userId)
                    .order('created_at', { ascending: false }).limit(3);
            } else {
                historyQuery = supabase
                    .from('rides')
                    .select('*, ride_requests(*)')
                    .eq('driver_id', userId)
                    .order('created_at', { ascending: false }).limit(3);
            }
            const { data: history } = await historyQuery;
            if (history) setRecentRides(history);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const isDriver = profile?.role === 'DRIVER';

    if (authLoading || (user && !profile)) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;
    
    if (!user) return null; // Wait for redirect effect

    return (
        <div className="max-w-md mx-auto min-h-screen bg-white pb-24 relative overflow-hidden">
            {/* SUPPORT MODAL (FORMSPREE AJAX) */}
            {isSupportOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => !isSubmitting && setIsSupportOpen(false)} />
                    <div className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 h-auto max-h-[90vh]">
                        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-black uppercase tracking-widest text-lg">Soporte TaxiBid</h3>
                            </div>
                            <button onClick={() => !isSubmitting && setIsSupportOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                        </div>
                        
                        <div className="p-8">
                            {formSubmitted ? (
                                <div className="py-12 space-y-4 text-center animate-in zoom-in-95">
                                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                        <ChevronRight size={40} className="rotate-[-90deg]" />
                                    </div>
                                    <h4 className="text-xl font-black uppercase">¡Reporte Enviado!</h4>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                        En cuanto podamos nos comunicamos con usted para darle seguimiento a su solicitud.
                                    </p>
                                </div>
                            ) : (
                                <form 
                                    onSubmit={handleSupportSubmit}
                                    className="space-y-6"
                                >
                                    <input type="hidden" name="user_name" value={profile.name} />
                                    <input type="hidden" name="user_phone" value={profile.phone || 'No registrado'} />
                                    <input type="hidden" name="user_email" value={user?.email || ''} />

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">¿Qué ocurrió?</label>
                                        <textarea 
                                            name="message" 
                                            required 
                                            placeholder="Explícanos brevemente..."
                                            className="w-full p-5 bg-gray-50 border-none rounded-3xl text-sm min-h-[120px] focus:ring-2 focus:ring-black transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">Preferencias de contacto</label>
                                        <select 
                                            name="contact_method" 
                                            required
                                            className="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-black appearance-none"
                                        >
                                            <option value="whatsapp">WhatsApp</option>
                                            <option value="call">Llamada</option>
                                            <option value="email">Correo</option>
                                        </select>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="w-full bg-black text-white py-6 rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : "ENVIAR REPORTE"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TRUSTED CONTACTS MODAL */}
            {isContactsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsContactsOpen(false)} />
                    <div className="relative w-full max-w-xs bg-white rounded-[40px] p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto text-blue-600">
                            <Users size={40} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Seguridad en Viaje</h3>
                            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                                Pronto podrás añadir hasta 5 contactos de confianza para que reciban tu ubicación en tiempo real automáticamente.
                            </p>
                        </div>
                        <button onClick={() => setIsContactsOpen(false)} className="w-full bg-black text-white py-4 rounded-3xl font-bold">ENTENDIDO</button>
                    </div>
                </div>
            )}

            {/* Header / Hero Section */}
            <div className="bg-black text-white p-8 pt-12 rounded-b-[40px] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 border border-white/30 shadow-inner">
                        <User size={48} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tight tabular-nums">{profile.name}</h1>
                    <div className="flex items-center gap-2 mt-2 opacity-70">
                        <Award size={14} className="text-orange-400" />
                        <span className="text-xs font-bold uppercase tracking-widest">{isDriver ? 'Conductor Elite' : 'Pasajero VIP'}</span>
                    </div>
                </div>
                
                <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>

            {/* Stats Grid */}
            <div className="px-6 -mt-8 relative z-20">
                <div className="bg-white rounded-3xl shadow-xl border p-6 grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl flex flex-col items-center text-center border border-gray-100">
                        <TrendingUp size={20} className="text-blue-600 mb-2" />
                        <span className="text-2xl font-black">{stats.totalRides}</span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter">Viajes Totales</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl flex flex-col items-center text-center border border-gray-100">
                        <Clock size={20} className="text-orange-500 mb-2" />
                        <span className="text-2xl font-black tabular-nums">${stats.totalSpent}</span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter">{isDriver ? 'Ganancia' : 'Consumo'}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Sections */}
            <div className="p-6 space-y-8">
                
                {/* ADMIN DASHBOARD LINK (ONLY FOR ADMINS) */}
                {profile.role === 'ADMIN' && (
                    <section className="animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                                <ShieldCheck size={16} /> Panel Maestro
                            </h2>
                        </div>
                        <Link 
                            href="/admin/verifications"
                            className="w-full flex items-center justify-between p-6 bg-indigo-600 text-white rounded-[32px] shadow-xl shadow-indigo-200 group active:scale-95 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <ShieldCheck size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Control Central</p>
                                    <p className="font-black uppercase tracking-tighter text-lg leading-tight">Administrar CRM</p>
                                </div>
                            </div>
                            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </section>
                )}

                {/* Security Section (NEW) */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                            <Shield size={16} /> Seguridad y Protección
                        </h2>
                    </div>
                    <div className="space-y-3">
                        <button 
                            onClick={handlePanic}
                            className="w-full flex items-center justify-between p-4 bg-red-50 rounded-3xl border border-red-100 group active:scale-95 transition-transform"
                        >
                            <div className="flex items-center gap-3 text-red-600">
                                <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-200">
                                    <ShieldAlert size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm uppercase tracking-tight">Botón de Pánico</p>
                                    <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Llama al 911 ahora</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-red-300" />
                        </button>

                        <button 
                            onClick={() => setIsContactsOpen(true)}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-3xl border border-gray-100 active:scale-95 transition-all"
                        >
                            <div className="flex items-center gap-3 text-gray-700">
                                <div className="p-3 bg-black text-white rounded-2xl shadow-lg shadow-black/10">
                                    <Users size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm uppercase tracking-tight">Contactos de Confianza</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Añade quién recibe tu ruta</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </button>
                    </div>
                </section>

                {/* HELP & SUPPORT SECTION (NEW) */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                            <Phone size={16} /> Ayuda y Soporte
                        </h2>
                    </div>
                    <button 
                        onClick={() => setIsSupportOpen(true)}
                        className="w-full flex items-center justify-between p-4 bg-blue-50/50 rounded-3xl border border-blue-100 active:scale-95 transition-all"
                    >
                        <div className="flex items-center gap-3 text-blue-700">
                            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                                <Phone size={20} />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-sm uppercase tracking-tight">Centro de Ayuda</p>
                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Problemas con un viaje</p>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-blue-300" />
                    </button>
                </section>

                {/* Recent History Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                            <History size={16} /> Historial Reciente
                        </h2>
                        <Link href="/client/rides" className="text-xs font-bold text-blue-600 uppercase">Ver todo</Link>
                    </div>
                    <div className="space-y-3">
                        {recentRides.length === 0 ? (
                            <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400 text-sm">
                                No hay viajes registrados aún.
                            </div>
                        ) : (
                            recentRides.map((ride, idx) => (
                                <div key={idx} className="p-4 bg-white rounded-2xl border shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                        <MapPin size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-gray-900 truncate">{ride.ride_requests?.dest_text || 'Viaje finalizado'}</p>
                                        <p className="text-xs text-gray-400 truncate">{new Date(ride.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-sm text-black">${ride.final_price}</p>
                                        <p className="text-[10px] font-bold text-green-500 uppercase">Éxito</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Logout Button */}
                <div className="pt-8">
                    <button 
                        onClick={() => signOut()}
                        className="w-full bg-gray-50 text-red-600 border border-red-100 py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={20} />
                        Cerrar Sesión
                    </button>
                    <p className="text-center text-[10px] uppercase tracking-tighter text-gray-300 mt-4 font-black">TaxiBid v1.0.2 - Premium Experience</p>
                </div>

            </div>
        </div>
    );
}
