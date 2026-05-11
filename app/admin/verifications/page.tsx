"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
    LayoutDashboard, 
    Users, 
    ShieldCheck, 
    LogOut, 
    Search,
    Check,
    X,
    Eye,
    Car,
    FileText,
    TrendingUp,
    AlertCircle,
    Loader2,
    ChevronRight,
    Phone,
    Activity,
    Calendar,
    MapPin,
    Shield,
    Camera
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useModal } from "@/context/ModalContext";

export default function AdminVerifications() {
    const { profile, loading: authLoading, signOut } = useAuth();
    const router = useRouter();
    const { showAlert, showConfirm } = useModal();
    const [view, setView] = useState<'DASHBOARD' | 'VERIFICATIONS' | 'USERS'>('DASHBOARD');
    const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [recentRides, setRecentRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [stats, setStats] = useState({ 
        totalDrivers: 0, 
        pending: 0, 
        approved: 0, 
        totalRides: 0, 
        totalEarnings: 0,
        todayRides: 0
    });

    useEffect(() => {
        if (!authLoading) {
            if (profile?.role !== "ADMIN") {
                router.push("/");
            } else {
                fetchData();
            }
        }
    }, [profile, authLoading, router, view]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // General Stats
            const { data: drivers } = await supabase.from('drivers').select('status');
            const { data: rides } = await supabase.from('rides').select('final_price, created_at');
            
            if (drivers && rides) {
                const today = new Date().toISOString().split('T')[0];
                setStats({
                    totalDrivers: drivers.length,
                    pending: drivers.filter(d => d.status === 'PENDING').length,
                    approved: drivers.filter(d => d.status === 'APPROVED').length,
                    totalRides: rides.length,
                    totalEarnings: rides.reduce((acc, r) => acc + (Number(r.final_price) || 0), 0),
                    todayRides: rides.filter(r => r.created_at.startsWith(today)).length
                });
            }

            if (view === 'DASHBOARD') {
                const { data: latestRides } = await supabase
                    .from('rides')
                    .select('*, profiles:driver_id(name)')
                    .order('created_at', { ascending: false })
                    .limit(5);
                if (latestRides) setRecentRides(latestRides);
            } else if (view === 'VERIFICATIONS') {
                const { data } = await supabase
                    .from('drivers')
                    .select('*, profiles(name, phone, email)')
                    .eq('status', 'PENDING');
                if (data) setPendingDrivers(data);
            } else {
                const { data } = await supabase
                    .from('profiles')
                    .select('*, drivers(*)')
                    .order('created_at', { ascending: false });
                if (data) setAllUsers(data);
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    
    const handleAction = (userId: string, status: 'APPROVED' | 'REJECTED') => {
        if (status === 'REJECTED') {
            showPrompt(
                "Motivo del Rechazo",
                "Indica por qué se rechaza al conductor:",
                (reason) => {
                    if (reason.trim()) {
                        processAction(userId, status, reason);
                    } else {
                        showAlert("Error", "Debes ingresar un motivo para el rechazo.", "warning");
                    }
                },
                { confirmText: "Rechazar", cancelText: "Volver" }
            );
        } else {
            showConfirm(
                "Aprobar Conductor",
                "¿Estás seguro de que deseas aprobar a este conductor? Se limpiarán los documentos de la base de datos.",
                () => processAction(userId, status),
                { type: "confirm", confirmText: "Aprobar", cancelText: "Volver" }
            );
        }
    };

    const processAction = async (userId: string, status: 'APPROVED' | 'REJECTED', reason: string = "") => {
        try {
            setLoading(true);
            // If approved, we can clean up the storage files to save space as per requirement
            if (status === 'APPROVED' && selectedDriver) {
                const filesToDelete = [
                    selectedDriver.ine_url,
                    selectedDriver.license_url,
                    selectedDriver.insurance_url,
                    selectedDriver.circulation_url,
                    selectedDriver.photo_front_url,
                    selectedDriver.photo_side_url,
                    selectedDriver.owner_auth_url
                ].filter(url => url && url.includes('documents/')).map(url => {
                    const parts = url.split('documents/');
                    return parts[1];
                });

                if (filesToDelete.length > 0) {
                    await supabase.storage.from('documents').remove(filesToDelete);
                }
            }

            const { error } = await supabase
                .from('drivers')
                .update({ 
                    status, 
                    rejection_reason: reason,
                    ...(status === 'APPROVED' ? {
                        ine_url: null, license_url: null, insurance_url: null, 
                        circulation_url: null, photo_front_url: null, photo_side_url: null, 
                        owner_auth_url: null
                    } : {})
                })
                .eq('user_id', userId);

            if (error) throw error;
            
            setSelectedDriver(null); 
            fetchData();
            showAlert("Éxito", status === 'APPROVED' ? "Chofer aprobado y archivos limpiados." : "Chofer rechazado.", "success");
        } catch (err) { 
            console.error(err); 
            showAlert("Error", "Error al procesar la acción.", "warning");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || (profile && profile.role !== "ADMIN")) {
        return <div className="h-screen flex items-center justify-center p-6 bg-gray-50"><Loader2 className="animate-spin text-gray-400" /></div>;
    }

    return (
        <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-[#0f172a] text-white flex flex-col p-6 shadow-2xl relative z-50">
                <div className="flex items-center gap-3 mb-12 px-2">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Car size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">RAYT <span className="text-blue-400">CRM</span></h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">SISTEMA DE CONTROL</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <button 
                        onClick={() => setView('DASHBOARD')}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-sm font-bold ${view === 'DASHBOARD' ? 'bg-white/10 text-white border-l-4 border-blue-500' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <LayoutDashboard size={20} /> Dashboard
                    </button>
                    <button 
                        onClick={() => setView('VERIFICATIONS')}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-sm font-bold ${view === 'VERIFICATIONS' ? 'bg-white/10 text-white border-l-4 border-blue-500' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <ShieldCheck size={20} /> Verificaciones
                        {stats.pending > 0 && <span className="ml-auto bg-red-500 text-[10px] px-2 py-0.5 rounded-full">{stats.pending}</span>}
                    </button>
                    <button 
                        onClick={() => setView('USERS')}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-sm font-bold ${view === 'USERS' ? 'bg-white/10 text-white border-l-4 border-blue-500' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <Users size={20} /> Usuarios
                    </button>
                </nav>

                <div className="pt-6 border-t border-white/10">
                    <div className="p-4 bg-white/5 rounded-2xl mb-4 text-center">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Moderador</p>
                        <p className="text-xs font-bold truncate text-blue-400">{profile?.name}</p>
                    </div>
                    <button onClick={() => signOut()} className="w-full flex items-center gap-3 p-4 rounded-xl text-red-400 hover:bg-red-400/10 transition-all text-sm font-black uppercase tracking-widest"><LogOut size={20} /> Cerrar Sesión</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 shrink-0 shadow-sm relative z-40">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                            {view === 'DASHBOARD' ? 'Resumen Ejecutivo' : view === 'VERIFICATIONS' ? 'Gestión de Credenciales' : 'Buscador de Usuarios'}
                        </h2>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                            {view === 'DASHBOARD' ? 'Estadísticas globales de la plataforma' : view === 'VERIFICATIONS' ? 'Revisión manual de documentación legal' : 'Listado completo de la comunidad RAYT'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                            <input type="text" placeholder="Buscar..." className="bg-gray-50 border border-gray-100 rounded-[20px] pl-12 pr-6 py-3 text-sm w-96 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all outline-none" />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-10 space-y-10">
                    {view === 'DASHBOARD' ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            {/* Dashboard Stats */}
                            <div className="grid grid-cols-4 gap-8">
                                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-blue-500/5 group hover:scale-[1.02] transition-transform">
                                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all"><TrendingUp size={28} /></div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ingresos Totales</p>
                                    <p className="text-3xl font-black text-gray-800 tabular-nums">${stats.totalEarnings}</p>
                                </div>
                                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-blue-500/5 group hover:scale-[1.02] transition-transform">
                                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all"><Activity size={28} /></div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Viajes Totales</p>
                                    <p className="text-3xl font-black text-gray-800">{stats.totalRides}</p>
                                </div>
                                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-blue-500/5 group hover:scale-[1.02] transition-transform">
                                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all"><Users size={28} /></div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Choferes Aprobados</p>
                                    <p className="text-3xl font-black text-gray-800">{stats.approved}</p>
                                </div>
                                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-blue-500/5 group hover:scale-[1.02] transition-transform">
                                    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-600 group-hover:text-white transition-all"><Calendar size={28} /></div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Viajes hoy</p>
                                    <p className="text-3xl font-black text-gray-800">{stats.todayRides}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-10">
                                {/* Recent Activity */}
                                <div className="col-span-2 bg-white rounded-[48px] border border-gray-100 shadow-2xl p-10 flex flex-col">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-3"><Activity className="text-blue-500" /> Actividad Reciente</h3>
                                        <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">Historial Completo</button>
                                    </div>
                                    <div className="space-y-4 flex-1">
                                        {recentRides.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-300 font-bold uppercase tracking-widest text-xs py-20 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                                <Car size={40} className="mb-4 opacity-20" />
                                                Sin actividad hoy
                                            </div>
                                        ) : (
                                            recentRides.map((ride, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-5 bg-gray-50/50 rounded-[28px] group hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer border border-transparent hover:border-blue-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors"><MapPin size={20} /></div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-800">Viaje #{ride.id.slice(0,5)}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{ride.profiles?.name || 'Sistema'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-emerald-600 tabular-nums">$ {ride.final_price}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(ride.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Top Drivers / Sidebar Ranking */}
                                <div className="space-y-10">
                                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl p-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Users size={16} className="text-indigo-500" /> Top Conductores</h3>
                                            <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg uppercase">Ranking Mes</span>
                                        </div>
                                        <div className="space-y-3">
                                            {allUsers.filter(u => u.role === 'DRIVER').slice(0, 3).map((driver, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-indigo-50 transition-colors cursor-pointer group">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'}`}>#{i+1}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-gray-800 truncate group-hover:text-indigo-700">{driver.name}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase">4.9 ⭐</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {allUsers.filter(u => u.role === 'DRIVER').length === 0 && <p className="text-[10px] text-gray-400 text-center py-4">Sin conductores activos</p>}
                                        </div>
                                    </div>

                                    <div className="bg-[#0f172a] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2"><Shield size={16} className="text-blue-400" /> Estado Global</h3>
                                            <div className="space-y-6">
                                                <div className="bg-white/5 p-5 rounded-[24px] border border-white/5">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Aprobación Choferes</p>
                                                        <span className="text-[10px] font-black text-blue-400">{Math.round((stats.approved / (stats.totalDrivers || 1)) * 100)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${(stats.approved / (stats.totalDrivers || 1)) * 100}%` }} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-white/5 p-4 rounded-2xl text-center">
                                                        <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Activos</p>
                                                        <p className="text-lg font-black text-white">{stats.approved}</p>
                                                    </div>
                                                    <div className="bg-white/5 p-4 rounded-2xl text-center border-l-4 border-amber-500">
                                                        <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Pendientes</p>
                                                        <p className="text-lg font-black text-white">{stats.pending}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-blue-500/10 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-700" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : view === 'VERIFICATIONS' ? (
                        <div className="flex gap-8 items-start animate-in fade-in duration-500">
                            {/* Verifications Table */}
                            <div className="flex-1 bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden min-h-[500px]">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                                        <tr>
                                            <th className="px-8 py-6">Conductor</th>
                                            <th className="px-8 py-6">Vehículo</th>
                                            <th className="px-8 py-6 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading ? (
                                            <tr><td colSpan={3} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-300" size={40} /></td></tr>
                                        ) : pendingDrivers.length === 0 ? (
                                            <tr><td colSpan={3} className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">Sin pendientes</td></tr>
                                        ) : (
                                            pendingDrivers.map((driver) => (
                                                <tr key={driver.user_id} 
                                                    onClick={() => setSelectedDriver(driver)}
                                                    className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selectedDriver?.user_id === driver.user_id ? 'bg-blue-50/50' : ''}`}>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 uppercase text-xs">{driver.profiles?.name?.charAt(0)}</div>
                                                            <div>
                                                                <p className="font-bold text-gray-800 text-sm">{driver.profiles?.name}</p>
                                                                <p className="text-[10px] text-gray-400 font-bold">{driver.profiles?.phone}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-xs font-bold text-gray-700">{driver.vehicle_model}</p>
                                                        <span className="text-[9px] font-black bg-gray-100 px-2 py-1 rounded text-gray-500 tracking-widest">{driver.plate}</span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <ChevronRight size={18} className="ml-auto text-gray-300" />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Detail Panel */}
                            {selectedDriver && (
                                <div className="w-[450px] bg-white rounded-[40px] border border-gray-100 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
                                    <div className="p-8 border-b bg-gray-50/50">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-16 h-16 bg-white rounded-3xl shadow-md flex items-center justify-center font-black text-2xl text-gray-300 border border-gray-100 uppercase">{selectedDriver.profiles?.name?.charAt(0)}</div>
                                            <span className="bg-amber-100 text-amber-700 text-[10px] px-3 py-1.5 rounded-full font-black tracking-widest uppercase">EN ESPERA</span>
                                        </div>
                                        <h3 className="text-xl font-black text-gray-800 tracking-tight">{selectedDriver.profiles?.name}</h3>
                                        <div className="mt-4 grid grid-cols-1 gap-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                <Phone size={12} className="text-gray-400" /> {selectedDriver.profiles?.phone}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium truncate">
                                                <FileText size={12} className="text-gray-400" /> {selectedDriver.profiles?.email || 'No registrado'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Vehículo Asociado</h4>
                                            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-5 rounded-[32px]">
                                                <div><p className="text-[9px] font-black text-gray-400 uppercase">Modelo</p><p className="text-xs font-bold">{selectedDriver.vehicle_model} {selectedDriver.vehicle_year}</p></div>
                                                <div><p className="text-[9px] font-black text-gray-400 uppercase">Placa</p><p className="text-xs font-black text-blue-600">{selectedDriver.plate}</p></div>
                                                <div><p className="text-[9px] font-black text-gray-400 uppercase">Color</p><p className="text-xs font-bold">{selectedDriver.vehicle_color}</p></div>
                                                <div><p className="text-[9px] font-black text-gray-400 uppercase">Nº Económico</p><p className="text-xs font-black"># {selectedDriver.economic_number}</p></div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Documentación</h4>
                                            <div className="space-y-3">
                                                {[
                                                    { name: 'INE / Identificación', key: 'ine_url' },
                                                    { name: 'Licencia Chofer', key: 'license_url' },
                                                    { name: 'Seguro Vigente', key: 'insurance_url' },
                                                    { name: 'Tarjeta de Circulación', key: 'circulation_url' }
                                                ].map(doc => (
                                                    <a 
                                                        key={doc.key} 
                                                        href={selectedDriver[doc.key]} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all group ${selectedDriver[doc.key] ? 'bg-white border-blue-100 hover:bg-blue-50' : 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedDriver[doc.key] ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                                                                <FileText size={16} />
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-700">{doc.name}</span>
                                                        </div>
                                                        {selectedDriver[doc.key] ? <Eye size={16} className="text-gray-300 group-hover:text-blue-600" /> : <AlertCircle size={16} className="text-gray-300" />}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Fotos del Taxi</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <a href={selectedDriver.photo_front_url} target="_blank" rel="noreferrer" className="aspect-video bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden hover:border-blue-300 transition-all">
                                                    {selectedDriver.photo_front_url ? <img src={selectedDriver.photo_front_url} alt="Frontal" className="w-full h-full object-cover" /> : <Camera className="text-gray-200" />}
                                                </a>
                                                <a href={selectedDriver.photo_side_url} target="_blank" rel="noreferrer" className="aspect-video bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden hover:border-blue-300 transition-all">
                                                    {selectedDriver.photo_side_url ? <img src={selectedDriver.photo_side_url} alt="Lateral" className="w-full h-full object-cover" /> : <Camera className="text-gray-200" />}
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-gray-50 flex gap-4 border-t border-gray-100">
                                        <button onClick={() => handleAction(selectedDriver.user_id, 'REJECTED')} className="flex-1 py-4 bg-white border border-red-100 text-red-600 rounded-2xl font-black uppercase text-[10px] hover:bg-red-600 hover:text-white transition-all shadow-sm tracking-widest">RECHAZAR</button>
                                        <button onClick={() => handleAction(selectedDriver.user_id, 'APPROVED')} className="flex-[2] py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] hover:bg-blue-600 transition-all shadow-xl tracking-widest">APROBAR</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex gap-10 h-full overflow-hidden">
                            <div className={`bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden flex-1 animate-in fade-in slide-in-from-bottom-5 duration-500 overflow-y-auto`}>
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                                        <tr>
                                            <th className="px-8 py-6">Nombre del Usuario</th>
                                            <th className="px-8 py-6">Contacto</th>
                                            <th className="px-8 py-6 text-center">Rol</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading ? (
                                            <tr><td colSpan={3} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-300" size={40} /></td></tr>
                                        ) : allUsers.length === 0 ? (
                                            <tr><td colSpan={3} className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No hay usuarios</td></tr>
                                        ) : (
                                            allUsers.map((u) => (
                                                <tr key={u.id} 
                                                    onClick={() => setSelectedUser(u)}
                                                    className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'bg-blue-50/50' : ''}`}>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold uppercase text-xs ${u.role === 'DRIVER' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{u.name?.charAt(0)}</div>
                                                            <p className="font-bold text-gray-800 text-sm">{u.name}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm text-gray-700 font-medium">{u.email || 'N/A'}</p>
                                                        <p className="text-xs text-gray-400">{u.phone || 'N/A'}</p>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full tracking-widest uppercase ${u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : u.role === 'DRIVER' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {u.role === 'ADMIN' ? 'ADMIN' : u.role === 'DRIVER' ? 'CONDUCTOR' : 'CLIENTE'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* User Detail Panel */}
                            {selectedUser && (
                                <div className="w-[450px] bg-white rounded-[40px] border border-gray-100 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
                                    <div className="p-8 border-b bg-gray-50/50">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-16 h-16 bg-white rounded-3xl shadow-md flex items-center justify-center font-black text-2xl text-gray-300 border border-gray-100 uppercase">{selectedUser.name?.charAt(0)}</div>
                                            <button onClick={() => setSelectedUser(null)} className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest">Cerrar</button>
                                        </div>
                                        <h3 className="text-xl font-black text-gray-800 tracking-tight">{selectedUser.name}</h3>
                                        <div className="mt-4 flex items-center gap-3">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${selectedUser.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : selectedUser.role === 'DRIVER' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {selectedUser.role}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unido el {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información de Contacto</h4>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                    <Phone size={16} className="text-blue-500" />
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Teléfono móvil</p>
                                                        <p className="text-sm font-bold text-gray-800">{selectedUser.phone || 'No registrado'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                    <FileText size={16} className="text-blue-500" />
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Correo electrónico</p>
                                                        <p className="text-sm font-bold text-gray-800">{selectedUser.email || 'No registrado'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {selectedUser.role === 'DRIVER' && selectedUser.drivers && (
                                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detalles del Vehículo</h4>
                                                {/* En Supabase joins can be arrays or objects */}
                                                {(() => {
                                                    const driverInfo = Array.isArray(selectedUser.drivers) ? selectedUser.drivers[0] : selectedUser.drivers;
                                                    if (!driverInfo) return <p className="text-[10px] text-gray-400 font-bold ml-2">Sin registro técnico</p>;

                                                    return (
                                                        <div className="bg-[#0f172a] p-6 rounded-[32px] text-white space-y-6 relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all duration-700" />
                                                            
                                                            <div className="flex items-center gap-4 relative z-10">
                                                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                                                                    <Car size={24} className="text-blue-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Unidad Profesional</p>
                                                                    <p className="text-xl font-black uppercase tracking-tight leading-none">{driverInfo.vehicle_model || 'PENDIENTE'}</p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 relative z-10 pt-2">
                                                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Placas</p>
                                                                    <p className="text-xs font-black tracking-widest">{driverInfo.plate || 'PENDIENTE'}</p>
                                                                </div>
                                                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Color</p>
                                                                    <p className="text-xs font-black tracking-widest capitalize">{driverInfo.vehicle_color || 'No reg.'}</p>
                                                                </div>
                                                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 col-span-2">
                                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Unidad Nº</p>
                                                                    <p className="text-xs font-black tracking-tighter">ECONÓMICO #{driverInfo.economic_number || '---'}</p>
                                                                </div>
                                                            </div>

                                                            <div className={`mt-2 py-2 text-center rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border ${driverInfo.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                                {driverInfo.status === 'APPROVED' ? 'CONDUCTOR VERIFICADO' : 'PENDIENTE DE VERIFICACIÓN'}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
