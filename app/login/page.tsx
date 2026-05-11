"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Mail, Lock, User, Phone, ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"CLIENT" | "DRIVER">("CLIENT");
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name,
                            phone,
                            role,
                        },
                    },
                });

                if (authError) throw authError;

                if (authData.session) {
                    if (role === "CLIENT") router.push("/client/request-ride");
                    else router.push("/driver/requests");
                } else if (authData.user) {
                    setError("¡Cuenta creada! Por favor revisa tu correo para confirmar la verificación.");
                    setLoading(false);
                    return;
                }
            } else {
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (authError) throw authError;

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", authData.user.id)
                    .single();

                if (profile?.role === "ADMIN") router.push("/admin/verifications");
                else if (profile?.role === "CLIENT") router.push("/client/request-ride");
                else if (profile?.role === "DRIVER") router.push("/driver/requests");
                else router.push("/");
            }
        } catch (err: any) {
            console.error(err);
            if (err.message === "Failed to fetch" || err.message?.includes("supabaseUrl")) {
                setError("Error de conexión. Revisa tu red.");
            } else if (err.status === 400 || err.message?.includes("Invalid login credentials")) {
                setError("Credenciales incorrectas. Verifica tus datos.");
            } else {
                setError(err.message || "Error de autenticación.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col font-sans selection:bg-[#FFC107] selection:text-black">
            {/* Header / Brand */}
            <div className="relative h-[25vh] flex items-center justify-center overflow-hidden">
                <Link href="/" className="absolute top-8 left-8 z-20 text-white hover:text-[#FFC107] transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div className="absolute inset-0 bg-gradient-to-b from-[#FFC107]/20 to-black opacity-50" />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 flex flex-col items-center"
                >
                    <Link href="/" className="bg-white p-3 rounded-2xl shadow-2xl mb-4 border-2 border-[#FFC107]">
                        <img src="/car-logo.png" alt="Logo" className="w-10 h-auto" />
                    </Link>
                    <h1 className="text-2xl font-black text-white tracking-tighter">
                        TaxiBid<span className="text-[#FFC107]">.</span>
                    </h1>
                </motion.div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-[#F7F7F7] rounded-t-[50px] shadow-[0_-20px_50px_rgba(0,0,0,0.3)] px-8 pt-10 pb-10 flex flex-col">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-black text-black leading-none">
                        {isSignUp ? "ÚNETE AHORA" : "HOLA DE NUEVO"}
                    </h2>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                        {isSignUp ? "Comienza a viajar o conducir" : "Ingresa tus credenciales"}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6 flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isSignUp ? "signup" : "login"}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                        >
                            {isSignUp && (
                                <>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                            <User size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Nombre Completo"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-[#FFC107] focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                            <Phone size={18} />
                                        </div>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="Número de Teléfono"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-[#FFC107] focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    placeholder="Correo Electrónico"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-[#FFC107] focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-[#FFC107] focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            {isSignUp && (
                                <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setRole("CLIENT")}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            role === "CLIENT" ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-white/50"
                                        )}
                                    >
                                        Pasajero
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole("DRIVER")}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            role === "DRIVER" ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-white/50"
                                        )}
                                    >
                                        Conductor
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-red-100"
                        >
                            <AlertCircle size={16} />
                            {error}
                        </motion.div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center items-center rounded-[24px] bg-black py-5 text-lg font-black text-white hover:bg-[#FFC107] hover:text-black transition-all duration-500 shadow-xl disabled:opacity-70 overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2 uppercase tracking-tighter">
                                {loading ? <Loader2 className="animate-spin" /> : (
                                    <>
                                        {isSignUp ? "Registrarme" : "Entrar"}
                                        <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform duration-500" />
                                    </>
                                )}
                            </span>
                            <div className="absolute inset-0 bg-[#FFC107] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        </button>
                    </div>
                </form>

                <div className="mt-10 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                    >
                        {isSignUp
                            ? "¿Ya tienes una cuenta? Iniciar Sesión"
                            : "¿No tienes una cuenta? Crear Cuenta"}
                    </button>
                </div>
            </div>
        </div>
    );
}

