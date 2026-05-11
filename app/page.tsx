"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Star, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import SplashScreen from "@/components/ui/SplashScreen";

export default function Home() {
    const [loading, setLoading] = useState(true);

    if (loading) {
        return <SplashScreen finishLoading={() => setLoading(false)} />;
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-between bg-[#F7F7F7] font-sans selection:bg-[#FFC107] selection:text-black">
            {/* Top Section with Image/Pattern */}
            <div className="relative w-full h-[45vh] bg-black overflow-hidden rounded-b-[60px] shadow-2xl">
                <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1760&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                >
                    <div className="bg-white p-5 rounded-[32px] shadow-2xl mb-6 border-2 border-[#FFC107]">
                        <img src="/car-logo.png" alt="TaxiBid Logo" className="w-16 h-auto" />
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter">
                        TaxiBid<span className="text-[#FFC107]">.</span>
                    </h1>
                    <p className="text-[#FFC107] text-[10px] font-black uppercase tracking-[0.4em] mt-2">
                        Premium Mobility
                    </p>
                </motion.div>
            </div>

            {/* Content Section */}
            <div className="flex-1 w-full max-w-md px-8 py-10 flex flex-col justify-between">
                <div className="space-y-8">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="space-y-2"
                    >
                        <h2 className="text-3xl font-black text-black leading-none">
                            TÚ PONES EL PRECIO.
                        </h2>
                        <p className="text-gray-500 font-medium text-sm">
                            Olvídate de las tarifas dinámicas. Negocia directamente con conductores certificados.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { icon: <Zap size={20} />, label: "Rápido" },
                            { icon: <ShieldCheck size={20} />, label: "Seguro" },
                            { icon: <Star size={20} />, label: "VIP" }
                        ].map((item, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + (i * 0.1), duration: 0.5 }}
                                className="flex flex-col items-center gap-2 p-4 bg-white rounded-3xl shadow-sm border border-gray-100"
                            >
                                <div className="text-[#FFC107]">{item.icon}</div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-black">{item.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="pt-10"
                >
                    <Link
                        href="/login"
                        className="group relative flex items-center justify-center w-full bg-black text-white py-5 rounded-[24px] font-black text-lg hover:bg-[#FFC107] hover:text-black transition-all duration-500 shadow-xl overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            COMENZAR AHORA
                            <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-500" />
                        </span>
                        <div className="absolute inset-0 bg-[#FFC107] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    </Link>
                    
                    <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-6">
                        TaxiBid v1.0.2 • Premium Experience
                    </p>
                </motion.div>
            </div>
        </div>
    );
}

