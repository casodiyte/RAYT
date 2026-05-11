"use client";

import { useEffect } from "react";

export function PWARegistration() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("Service Worker registrado con éxito:", registration);
                    
                    // Pedir permiso de notificaciones inmediatamente
                    if ("Notification" in window) {
                        Notification.requestPermission().then((permission) => {
                            if (permission === "granted") {
                                console.log("Permiso de notificaciones concedido.");
                            }
                        });
                    }
                })
                .catch((error) => {
                    console.error("Error al registrar el Service Worker:", error);
                });
        }
    }, []);

    return null;
}
