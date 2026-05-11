"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Car, ListOrdered, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (profile && profile.role !== "CLIENT") {
                router.push("/driver/requests"); // Redirect drivers
            }
        }
    }, [user, profile, loading, router]);

    if (loading) {
        return (
            <div className="flex bg-gray-50 h-screen w-full items-center justify-center text-gray-400">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    if (!user || (profile && profile.role !== "CLIENT")) return null;

    return (
        <div className="min-h-screen bg-gray-100 pb-20">
            {children}

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-20 px-4 pb-2 z-50">
                <Link
                    href="/client/request-ride"
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname === "/client/request-ride"
                        ? "text-black"
                        : "text-gray-400 hover:text-black"
                        }`}
                >
                    <img 
                        src="/car-logo.png" 
                        alt="Viajar" 
                        className={`w-6 h-auto ${pathname === "/client/request-ride" ? "" : "grayscale opacity-50"}`} 
                    />
                    <span className="text-[10px] font-bold">Viajar</span>
                </Link>

                <Link
                    href="/client/rides"
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname === "/client/rides"
                        ? "text-black"
                        : "text-gray-400 hover:text-black"
                        }`}
                >
                    <ListOrdered size={24} />
                    <span className="text-[10px] font-bold">Mis Viajes</span>
                </Link>

                <Link
                    href="/profile"
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname === "/profile"
                        ? "text-black"
                        : "text-gray-400 hover:text-black"
                        }`}
                >
                    <User size={24} className={pathname === "/profile" ? "fill-black" : ""} />
                    <span className="text-[10px] font-bold">Perfil</span>
                </Link>
            </nav>
        </div>
    );
}
