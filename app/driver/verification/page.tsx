"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
    Loader2, 
    CheckCircle, 
    ShieldCheck, 
    FileText, 
    Car, 
    Camera, 
    AlertCircle,
    ChevronRight,
    ChevronLeft,
    Upload
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotification } from "@/context/NotificationContext";

type Step = 1 | 2 | 3 | 4 | 5;

export default function VerificationPage() {
    const { user, profile, refreshProfile } = useAuth();
    const { showNotification } = useNotification();
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<Record<string, File>>({});
    
    // Form fields
    const [formData, setFormData] = useState({
        plate: "",
        economic_number: "",
        vehicle_model: "",
        vehicle_year: "",
        vehicle_color: "",
        is_concessionaire: true,
        owner_name: ""
    });

    useEffect(() => {
        if (profile?.driver?.status === 'APPROVED') {
            router.push('/driver/requests');
        }
        if (profile?.driver && !formData.plate && !formData.vehicle_model) {
            setFormData(prev => ({
                ...prev,
                plate: profile?.driver?.plate || "",
                economic_number: profile?.driver?.economic_number || "",
                vehicle_model: profile?.driver?.vehicle_model || "",
                vehicle_year: profile?.driver?.vehicle_year || "",
                vehicle_color: profile?.driver?.vehicle_color || "",
                is_concessionaire: profile?.driver?.is_concessionaire ?? true,
            }));
        }
    }, [profile, router]);

    const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFiles(prev => ({ ...prev, [key]: e.target.files![0] }));
        }
    };

    const uploadFile = async (key: string, file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${key}_${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
            .from('documents')
            .upload(fileName, file, { upsert: true });
        
        if (error) throw error;
        // Get public URL
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
        return publicUrl;
    };

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const urls: Record<string, string> = {};
            
            // Upload all selected files
            for (const [key, file] of Object.entries(files)) {
                urls[`${key}_url`] = await uploadFile(key, file);
            }

            const { error } = await supabase
                .from('drivers')
                .upsert({
                    user_id: user.id,
                    ...formData,
                    ...urls,
                    status: 'PENDING'
                }, { onConflict: 'user_id' });

            if (error) throw error;
            
            await refreshProfile();
            showNotification("¡Documentación enviada! Tu cuenta está en proceso de revisión.", "success");
            router.push('/driver/requests');
        } catch (err) {
            console.error(err);
            showNotification("Error al enviar la verificación.", "error");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(s => (s < 5 ? (s + 1) as Step : s));
    const prevStep = () => setStep(s => (s > 1 ? (s - 1) as Step : s));

    if (profile?.driver?.status === 'PENDING' && profile?.driver?.ine_url) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white animate-in fade-in zoom-in duration-700">
                <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-xl shadow-blue-500/20">
                    <Clock size={40} className="text-blue-600" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-gray-800">Cuenta en Revisión</h1>
                <p className="text-gray-500 mt-4 text-sm font-medium">
                    Estamos validando tu documentación.
                </p>
                <div className="mt-8 flex flex-col gap-4 w-full max-w-xs">
                    <button onClick={() => router.push('/profile')} className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 shadow-sm">Ver Perfil</button>
                    <button onClick={() => router.push('/')} className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">Regresar al Inicio</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans">
            {/* Header */}
            <header className="bg-[#0f172a] text-white p-10 pt-16 rounded-b-[50px] shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-black uppercase tracking-tight mb-1">Activar Cuenta</h1>
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Chofer Profesional • Paso {step} de 5</p>
                    
                    {/* Progress Bar */}
                    <div className="flex gap-2 mt-8">
                        {[1,2,3,4,5].map(s => (
                            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-white/10'}`} />
                        ))}
                    </div>
                </div>
                <div className="absolute top-[-20%] right-[-10%] w-60 h-60 bg-blue-500/10 rounded-full blur-[100px]" />
            </header>

            <div className="px-6 -mt-8 relative z-20">
                <div className="bg-white rounded-[40px] shadow-2xl p-10 space-y-10 border border-gray-100">
                    
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex items-center gap-4 text-blue-600">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm"><ShieldCheck size={28} /></div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight">Identidad Legal</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Documentos Oficiales Mexicanos</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">INE / Identificación Oficial (Frente)</label>
                                    <div className="relative group">
                                        <input type="file" className="hidden" id="ine" accept="image/*,application/pdf" onChange={(e) => handleFileChange('ine', e)} />
                                        <label htmlFor="ine" className={`cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-10 transition-all ${files.ine ? 'bg-emerald-50 border-emerald-200 shadow-xl shadow-emerald-500/5' : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/5'}`}>
                                            {files.ine ? <CheckCircle className="text-emerald-500 mb-3" size={32} /> : <Upload className="text-gray-300 mb-3 group-hover:text-blue-500 group-hover:scale-110 transition-transform" size={32} />}
                                            <span className={`text-xs font-black uppercase tracking-tight ${files.ine ? 'text-emerald-600' : 'text-gray-500'}`}>{files.ine ? files.ine.name : 'Subir o Escanear INE'}</span>
                                            {!files.ine && <span className="text-[9px] text-gray-400 font-bold uppercase mt-2">Formatos: JPG, PNG, PDF</span>}
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Licencia Vigente Tipo A</label>
                                    <div className="relative group">
                                        <input type="file" className="hidden" id="license" accept="image/*,application/pdf" onChange={(e) => handleFileChange('license', e)} />
                                        <label htmlFor="license" className={`cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-10 transition-all ${files.license ? 'bg-emerald-50 border-emerald-200 shadow-xl shadow-emerald-500/5' : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/5'}`}>
                                            {files.license ? <CheckCircle className="text-emerald-500 mb-3" size={32} /> : <Upload className="text-gray-300 mb-3 group-hover:text-blue-500 group-hover:scale-110 transition-transform" size={32} />}
                                            <span className={`text-xs font-black uppercase tracking-tight ${files.license ? 'text-emerald-600' : 'text-gray-500'}`}>{files.license ? files.license.name : 'Adjuntar Licencia'}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex items-center gap-4 text-blue-600">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm"><FileText size={28} /></div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight">Datos Generales</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Información de Concesión</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nº Económico del Taxi</label>
                                    <input type="text" value={formData.economic_number} onChange={e => setFormData({...formData, economic_number: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-5 text-sm font-black focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" placeholder="ej: 045" />
                                </div>
                                <div className="pt-4 p-6 bg-blue-50 rounded-[32px] border border-blue-100 italic text-[10px] text-blue-600 font-medium">
                                    Los datos de Placas, Modelo y Color se solicitarán en el siguiente paso de inspección visual.
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex items-center gap-4 text-blue-600">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm"><FileText size={28} /></div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight">Legalidad</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Documentación del Seguro</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Seguro Vigente</label>
                                    <div className="relative group">
                                        <input type="file" className="hidden" id="insurance" accept="image/*,application/pdf" onChange={(e) => handleFileChange('insurance', e)} />
                                        <label htmlFor="insurance" className={`cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-10 transition-all ${files.insurance ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
                                            {files.insurance ? <CheckCircle className="text-emerald-500 mb-2" /> : <Upload className="text-gray-300 mb-2" />}
                                            <span className="text-xs font-black uppercase tracking-tight text-gray-500">{files.insurance ? files.insurance.name : 'Subir Seguro'}</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Tarjeta de Circulación</label>
                                    <div className="relative group">
                                        <input type="file" className="hidden" id="circulation" accept="image/*,application/pdf" onChange={(e) => handleFileChange('circulation', e)} />
                                        <label htmlFor="circulation" className={`cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-10 transition-all ${files.circulation ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
                                            {files.circulation ? <CheckCircle className="text-emerald-500 mb-2" /> : <Upload className="text-gray-300 mb-2" />}
                                            <span className="text-xs font-black uppercase tracking-tight text-gray-500">{files.circulation ? files.circulation.name : 'Subir Tarjeta'}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex items-center gap-4 text-blue-600">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm"><Camera size={28} /></div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight">Registro del Taxi</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Detalles y Fotos de la Unidad</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Modelo (ej: Aveo 2022)</label>
                                        <input 
                                            type="text" 
                                            placeholder="Aveo 2022" 
                                            value={formData.vehicle_model}
                                            onChange={(e) => setFormData({...formData, vehicle_model: e.target.value})}
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:border-blue-400 focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Placas</label>
                                        <input 
                                            type="text" 
                                            placeholder="GHA-123-A" 
                                            value={formData.plate}
                                            onChange={(e) => setFormData({...formData, plate: e.target.value})}
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:border-blue-400 focus:bg-white outline-none transition-all uppercase"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Color Predominante</label>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                        {[
                                            { name: 'Blanco', color: '#FFFFFF' },
                                            { name: 'Azul', color: '#1e40af' },
                                            { name: 'Rojo', color: '#b91c1c' },
                                            { name: 'Amarillo', color: '#facc15' },
                                            { name: 'Plata', color: '#94a3b8' },
                                            { name: 'Otro', color: 'linear-gradient(45deg, #f06, #4a90e2, #7ed321)' }
                                        ].map(c => {
                                            const isSelected = formData.vehicle_color === c.name || (c.name === 'Otro' && !['Blanco', 'Azul', 'Rojo', 'Amarillo', 'Plata'].includes(formData.vehicle_color));
                                            return (
                                                <button 
                                                    key={c.name}
                                                    type="button"
                                                    onClick={() => setFormData({...formData, vehicle_color: c.name === 'Otro' ? '' : c.name})}
                                                    className="flex flex-col items-center gap-2 group outline-none"
                                                >
                                                    <div className={`w-10 h-10 rounded-full border-4 transition-all duration-300 flex items-center justify-center shadow-lg ${isSelected ? 'border-blue-500 scale-110 shadow-blue-500/20' : 'border-white hover:scale-105'}`} style={{ background: c.color }}>
                                                        {isSelected && <div className="w-3 h-3 bg-white rounded-full shadow-lg" />}
                                                    </div>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${isSelected ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{c.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {(formData.vehicle_color === '' || !['Blanco', 'Azul', 'Rojo', 'Amarillo', 'Plata'].includes(formData.vehicle_color)) && (
                                        <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                                            <input 
                                                type="text" 
                                                placeholder="Escribe el color de tu unidad..." 
                                                value={formData.vehicle_color}
                                                onChange={(e) => setFormData({...formData, vehicle_color: e.target.value})}
                                                className="w-full bg-gray-50 border-2 border-blue-100 rounded-2xl py-4 px-6 text-xs font-bold focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Foto Frontal (Placa visible)</label>
                                    <div className="relative group">
                                        <input type="file" className="hidden" id="photo_front" accept="image/*" onChange={(e) => handleFileChange('photo_front', e)} />
                                        <label htmlFor="photo_front" className={`aspect-square cursor-pointer border-2 border-dashed rounded-[36px] flex flex-col items-center justify-center transition-all ${files.photo_front ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200 hover:bg-white hover:shadow-xl'}`}>
                                            {files.photo_front ? <CheckCircle className="text-emerald-500" /> : <Camera className="text-gray-300 mb-2" />}
                                            <span className="text-[9px] font-black uppercase text-gray-400 mt-2">{files.photo_front ? 'Lista' : 'Capturar'}</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Foto Lateral (Coche entero)</label>
                                    <div className="relative group">
                                        <input type="file" className="hidden" id="photo_side" accept="image/*" onChange={(e) => handleFileChange('photo_side', e)} />
                                        <label htmlFor="photo_side" className={`aspect-square cursor-pointer border-2 border-dashed rounded-[36px] flex flex-col items-center justify-center transition-all ${files.photo_side ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200 hover:bg-white hover:shadow-xl'}`}>
                                            {files.photo_side ? <CheckCircle className="text-emerald-500" /> : <Camera className="text-gray-300 mb-2" />}
                                            <span className="text-[9px] font-black uppercase text-gray-400 mt-2">{files.photo_side ? 'Lista' : 'Capturar'}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex items-center gap-4 text-blue-600">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm"><Users size={28} className="" /></div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight">Concesión</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">¿Eres el dueño del taxi?</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <label className="flex items-center gap-4 p-6 bg-gray-50 rounded-[32px] cursor-pointer border-2 border-transparent hover:border-blue-200 transition-all shadow-sm group">
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${formData.is_concessionaire ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                        {formData.is_concessionaire && <CheckCircle className="text-white" size={20} />}
                                    </div>
                                    <input type="checkbox" checked={formData.is_concessionaire} onChange={e => setFormData({...formData, is_concessionaire: e.target.checked})} className="hidden" />
                                    <span className="text-sm font-black uppercase tracking-tight text-gray-800">Soy el concesionario del vehículo</span>
                                </label>

                                {!formData.is_concessionaire && (
                                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nombre Completo del Dueño</label>
                                            <input type="text" value={formData.owner_name} onChange={e => setFormData({...formData, owner_name: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-black focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" placeholder="Nombre completo" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Autorización Firmada + INE Dueño</label>
                                            <div className="relative group">
                                                <input type="file" className="hidden" id="owner_auth" accept="image/*,application/pdf" onChange={(e) => handleFileChange('owner_auth', e)} />
                                                <label htmlFor="owner_auth" className={`cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-8 transition-all ${files.owner_auth ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                                    {files.owner_auth ? <CheckCircle className="text-emerald-500 mb-2" /> : <Upload className="text-amber-500 mb-2" />}
                                                    <span className="text-[11px] font-black uppercase tracking-tight text-gray-600">{files.owner_auth ? files.owner_auth.name : 'Subir Autorización'}</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-6">
                        {step > 1 && (
                            <button onClick={prevStep} className="flex-1 bg-gray-100 text-gray-800 py-5 rounded-[28px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-gray-200 transition-all shadow-sm"><ChevronLeft size={18} /> ATRÁS</button>
                        )}
                        
                        {step < 5 ? (
                            <button onClick={nextStep} className="flex-[2] bg-black text-white py-5 rounded-[28px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-xl">SIGUIENTE <ChevronRight size={18} /></button>
                        ) : (
                            <button onClick={handleSubmit} disabled={loading} className="flex-[2] bg-blue-600 text-white py-5 rounded-[28px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-2xl shadow-blue-500/30">
                                {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} /> ENVIAR SOLICITUD</>}
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

// Mini Icon for Step 5
function Users({ size, className }: { size: number, className: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    )
}

function Clock({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
    )
}
