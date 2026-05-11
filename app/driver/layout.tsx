"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Car, User, LogOut, ListOrdered } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (profile && profile.role !== "DRIVER") {
                router.push("/client/request-ride"); // Redirect clients
            } else if (profile?.driver?.status !== 'APPROVED' && pathname !== '/driver/verification' && pathname !== '/profile') {
                router.push("/driver/verification");
            }
        }
    }, [user, profile, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex bg-gray-50 h-screen w-full items-center justify-center text-gray-400">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    if (!user || (profile && profile.role !== "DRIVER")) return null;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <main className="flex-1 pb-20">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-20 px-6 z-50 rounded-t-2xl shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                <Link
                    href="/driver/requests"
                    className={`flex flex-col items-center gap-1 ${pathname.includes('/driver/request') ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <img 
                        src="/car-logo.png" 
                        alt="Solicitudes" 
                        className={`w-6 h-auto ${pathname.includes('/driver/request') ? "" : "grayscale opacity-50"}`} 
                    />
                    <span className="text-xs font-semibold">Solicitudes</span>
                </Link>

                <Link
                    href="/driver/rides"
                    className={`flex flex-col items-center gap-1 ${pathname === '/driver/rides' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <ListOrdered size={24} className={pathname === '/driver/rides' ? "fill-black" : ""} />
                    <span className="text-xs font-semibold">Mis Viajes</span>
                </Link>

                <Link
                    href="/profile"
                    className={`flex flex-col items-center gap-1 ${pathname === '/profile' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <User size={24} className={pathname === '/profile' ? "fill-black" : ""} />
                    <span className="text-xs font-semibold">Perfil</span>
                </Link>

                <button
                    onClick={() => signOut()}
                    className="flex flex-col items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
                >
                    <LogOut size={24} />
                    <span className="text-xs font-semibold">Salir</span>
                </button>
            </nav>
        </div>
    );
}
