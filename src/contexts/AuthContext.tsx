import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Session, User } from "@supabase/supabase-js";

// Your custom Profile type (from your 'profiles' table)
interface Profile {
  id: string;
  full_name: string;
  role: "patient" | "doctor";
  specialization?: string;
  date_of_birth?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null; // Your custom profile data
  loading: boolean;
  signOut: () => Promise<void>;
  signUp: (formData: any) => Promise<void>;
  signIn: (formData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: false,
  signOut: async () => {},
  signUp: async () => {},
  signIn: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // Start loading

  useEffect(() => {
    // This async function checks the initial auth state on page load
    const checkUserOnLoad = async () => {
      setLoading(true);
      try {
        console.log("AuthContext: Attempting to get session...");
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log("AuthContext: Session received!", session);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          console.log("AuthContext: User found, fetching profile...");
          // --- ROBUST FETCH START ---
          try {
            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", currentUser.id)
              .single();

            if (error) {
              console.error("Error fetching profile on load:", error.message);
              setProfile(null);
            } else {
              console.log("AuthContext: Profile received!", data);
              setProfile(data as Profile);
            }
          } catch (e: any) {
            console.error("CRITICAL: Crashed while fetching profile on load!", e.message);
            setProfile(null);
          }
          // --- ROBUST FETCH END ---
        } else {
          console.log("AuthContext: No user session found.");
        }
      } catch (e: any) {
        console.error("Error in auth getSession:", e.message);
      } finally {
        console.log("AuthContext: Setting loading to false.");
        setLoading(false);
      }
    };

    // Run the initial check
    checkUserOnLoad();

    // 4. Listen for auth state *changes*
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext: Auth state changed!", event);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // --- ROBUST FETCH START ---
          try {
            console.log("AuthContext: Fetching profile inside listener...");
            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", currentUser.id)
              .single();
            
            if (error) {
              console.error("Error fetching profile on auth change:", error.message);
              setProfile(null);
            } else {
              console.log("AuthContext: Profile received inside listener.", data);
              setProfile(data as Profile);
            }
          } catch (e: any) {
            console.error("CRITICAL: Crashed while fetching profile in listener!", e.message);
            setProfile(null);
          }
          // --- ROBUST FETCH END ---
        } else {
          // User just signed OUT
          setProfile(null);
          console.log("AuthContext: User signed out.");
        }
      }
    );

    // Cleanup listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- Auth Functions (no change) ---
  const signUp = async (formData: any) => {
    const { email, password, ...rest } = formData;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: rest.full_name,
          role: rest.role,
          ...rest,
        },
      },
    });
    if (error) throw error;
  };

  const signIn = async (formData: any) => {
    const { email, password } = formData;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}