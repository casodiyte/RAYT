"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface DriverInfo {
    status: "PENDING" | "APPROVED" | "REJECTED" | null;
    plate: string | null;
    economic_number: string | null;
    vehicle_model: string | null;
    vehicle_year: string | null;
    vehicle_color: string | null;
    is_concessionaire: boolean;
    rejection_reason: string | null;
    ine_url?: string | null;
    license_url?: string | null;
    insurance_url?: string | null;
    circulation_url?: string | null;
}

interface UserProfile {
    id: string;
    name: string;
    phone: string | null;
    role: "CLIENT" | "DRIVER" | "ADMIN";
    driver?: DriverInfo;
}

interface AuthContextType {
    user: any | null;
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
    signIn: (email: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (profileError) {
                if (profileError.code === 'PGRST116') {
                    await supabase.auth.signOut();
                    setUser(null);
                    setSession(null);
                    return;
                }
                console.error("Error fetching profile:", profileError);
            } else {
                let fullProfile = profileData as UserProfile;
                
                // If Driver, fetch driver details/status
                if (fullProfile.role === "DRIVER") {
                    const { data: driverData, error: driverError } = await supabase
                        .from("drivers")
                        .select("*")
                        .eq("user_id", userId)
                        .single();
                    
                    if (!driverError && driverData) {
                        fullProfile.driver = driverData as DriverInfo;
                    } else if (driverError && driverError.code === 'PGRST116') {
                        // Create initial driver record if missing
                        const { data: newDriver } = await supabase
                            .from("drivers")
                            .insert({ user_id: userId })
                            .select()
                            .single();
                        if (newDriver) fullProfile.driver = newDriver as DriverInfo;
                    }
                }
                
                setProfile(fullProfile);
            }
        } catch (err) {
            console.error("Unexpected error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    const signIn = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
            }
        });
        return { error };
    };

    const signOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
