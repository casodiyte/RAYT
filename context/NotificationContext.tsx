"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "success" | "error" | "info" | "loading";

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType) => void;
    hideNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const hideNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const showNotification = useCallback((message: string, type: NotificationType = "info") => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, message, type }]);

        if (type !== "loading") {
            setTimeout(() => {
                hideNotification(id);
            }, 4000);
        }
    }, [hideNotification]);

    return (
        <NotificationContext.Provider value={{ showNotification, hideNotification }}>
            {children}
            <div className="fixed bottom-20 left-0 right-0 z-[100] pointer-events-none flex flex-col items-center gap-2 px-4">
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        className={cn(
                            "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border min-w-[280px] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300",
                            n.type === "success" && "bg-green-50 border-green-200 text-green-800",
                            n.type === "error" && "bg-red-50 border-red-200 text-red-800",
                            n.type === "info" && "bg-gray-900 border-gray-800 text-white",
                            n.type === "loading" && "bg-white border-gray-200 text-gray-900"
                        )}
                    >
                        {n.type === "success" && <CheckCircle className="text-green-500 shrink-0" size={20} />}
                        {n.type === "error" && <AlertCircle className="text-red-500 shrink-0" size={20} />}
                        {n.type === "info" && <Info className="text-blue-400 shrink-0" size={20} />}
                        {n.type === "loading" && <Loader2 className="animate-spin text-gray-400 shrink-0" size={20} />}
                        
                        <p className="text-sm font-medium flex-1">{n.message}</p>
                        
                        <button 
                            onClick={() => hideNotification(n.id)}
                            className="p-1 hover:bg-black/5 rounded-full shrink-0"
                        >
                            <X size={16} className="opacity-50" />
                        </button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
};
