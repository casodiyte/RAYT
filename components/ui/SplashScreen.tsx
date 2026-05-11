"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen({ finishLoading }: { finishLoading: () => void }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timeout = setTimeout(() => finishLoading(), 3000);
        return () => clearTimeout(timeout);
    }, [finishLoading]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden"
            >
                {/* Background pulse decoration */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0.15 }}
                    transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        repeatType: "reverse" 
                    }}
                    className="absolute w-96 h-96 bg-[#FFC107] rounded-full blur-[100px]"
                />

                <div className="relative z-10 flex flex-col items-center">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="bg-white p-6 rounded-[40px] shadow-2xl mb-8 border-4 border-[#FFC107]"
                    >
                        <img 
                            src="/car-logo.png" 
                            alt="TaxiBid Logo" 
                            className="w-24 h-auto animate-pulse" 
                        />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="text-4xl font-black text-white tracking-tighter"
                    >
                        TaxiBid<span className="text-[#FFC107]">.</span>
                    </motion.h1>

                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 1, duration: 1.5, ease: "easeInOut" }}
                        className="w-32 h-1 bg-[#FFC107] mt-4 rounded-full origin-left"
                    />
                    
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2, duration: 0.8 }}
                        className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-6"
                    >
                        Tu viaje, tu precio
                    </motion.p>
                </div>

                {/* Bottom decorative lines */}
                <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{ 
                                opacity: [0.2, 1, 0.2],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{ 
                                duration: 1, 
                                repeat: Infinity, 
                                delay: i * 0.2 
                            }}
                            className="w-1.5 h-1.5 bg-[#FFC107] rounded-full"
                        />
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
