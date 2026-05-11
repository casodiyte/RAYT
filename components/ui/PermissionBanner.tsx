"use client";

import { useState, useEffect } from "react";
import { MapPin, Bell, ChevronRight, X } from "lucide-react";
import { useModal } from "@/context/ModalContext";

export function PermissionBanner() {
    const [showLocation, setShowLocation] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [visible, setVisible] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const { showAlert } = useModal();

    useEffect(() => {
        const checkPermissions = async () => {
            // Check Location
            if ("geolocation" in navigator) {
                const res = await navigator.permissions.query({ name: "geolocation" as any });
                if (res.state === "prompt") setShowLocation(true);
            }
            
            // Check Notifications
            if ("Notification" in window) {
                if (Notification.permission === "default") setShowNotifications(true);
            }
        };

        checkPermissions();
        // Delay appearance for better UX
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    const requestLocation = () => {
        if (!("geolocation" in navigator)) {
            showAlert("Error", "Tu navegador no soporta geolocalización.", "warning");
            return;
        }

        setRequesting(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setShowLocation(false);
                setRequesting(false);
            },
            (error) => {
                setRequesting(false);
                if (error.code === error.PERMISSION_DENIED) {
                    showAlert("GPS Desactivado", "Has denegado el acceso a la ubicación. Por favor, actívalo en la configuración de tu navegador para continuar.", "warning");
                }
                setShowLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const requestNotifications = () => {
        if (!("Notification" in window)) {
            showAlert("Error", "Tu navegador no soporta notificaciones.", "warning");
            return;
        }

        setRequesting(true);
        Notification.requestPermission().then((permission) => {
            setRequesting(false);
            if (permission === "granted") {
                setShowNotifications(false);
            } else {
                showAlert("Aviso", "Has denegado las notificaciones. Puedes activarlas luego en la configuración.", "info");
                setShowNotifications(false);
            }
        });
    };

    if (!visible || (!showLocation && !showNotifications)) return null;

    return (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-black text-white p-6 rounded-[32px] shadow-2xl border border-white/10 relative overflow-hidden group">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC107]/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#FFC107]/20 transition-all" />
                
                <button 
                   onClick={() => setVisible(false)}
                   className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="space-y-6 relative z-10">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-white leading-tight">Configurar RAYT</h3>
                        <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">Para una experiencia premium, activa los permisos:</p>
                    </div>

                    <div className="space-y-4">
                        {showLocation && (
                            <button 
                                onClick={requestLocation}
                                className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group/btn"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-[#FFC107]/10 flex items-center justify-center text-[#FFC107]">
                                        {requesting ? <div className="w-5 h-5 border-2 border-[#FFC107] border-t-transparent rounded-full animate-spin" /> : <MapPin size={22} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tighter">Ubicación GPS</p>
                                        <p className="text-[10px] text-gray-500">Para encontrarte más rápido</p>
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-600 group-hover/btn:text-white transition-colors" size={20} />
                            </button>
                        )}

                        {showNotifications && (
                            <button 
                                onClick={requestNotifications}
                                className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group/btn"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-[#FFC107]/10 flex items-center justify-center text-[#FFC107]">
                                        <Bell size={22} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tighter">Notificaciones</p>
                                        <p className="text-[10px] text-gray-500">Recibe avisos de tus viajes</p>
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-600 group-hover/btn:text-white transition-colors" size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
