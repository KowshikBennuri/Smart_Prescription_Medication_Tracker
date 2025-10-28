import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Session, User } from "@supabase/supabase-js";

// --- (Helper function for timeout) ---
const timeout = (ms: number, message: string) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });
};

// --- (Profile Type - Ensure this matches across your app) ---
interface Profile {
  id: string;
  full_name: string;
  role: "patient" | "doctor";
  specialization?: string;
  date_of_birth?: string;
  ongoing_medications?: string;
  medical_history?: { complication: string; description: string }[];
}

// --- MODIFIED: Added refreshProfile ---
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signUp: (formData: any) => Promise<void>;
  signIn: (formData: any) => Promise<void>;
  refreshProfile: () => Promise<void>; // <-- Included
}

// --- MODIFIED: Added refreshProfile default ---
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: false,
  signOut: async () => {},
  signUp: async () => {},
  signIn: async () => {},
  refreshProfile: async () => {}, // <-- Included
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // --- MODIFIED: refreshProfile now accepts an optional user ---
  const refreshProfile = async (userToRefresh: User | null = user) => {
    // Use the passed-in user, or fall back to the state variable
    if (!userToRefresh) {
      console.log("refreshProfile: No user provided or found in state, skipping.");
      return;
    }
    try {
      console.log("AuthContext: Manually refreshing profile for user:", userToRefresh.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userToRefresh.id) // Use the correct user ID
        .single();
      
      if (error) {
        console.error("Error refreshing profile:", error.message);
      } else {
        console.log("AuthContext: Profile refreshed!", data);
        setProfile(data as Profile);
      }
    } catch (e: any) {
      console.error("CRITICAL: Crashed while refreshing profile!", e.message);
    }
  };
  // --- END MODIFICATION ---

  useEffect(() => {
    const checkUserOnLoad = async () => {
      setLoading(true);
      try {
        console.log("AuthContext: Attempting to get session (5s timeout)...");
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeout(5000, "Session check timed out.")
        ]) as { data: { session: Session | null } };
        
        console.log("AuthContext: Session received!", session);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser); // Set state here

        if (currentUser) {
          // Fetch profile directly on initial load
          await refreshProfile(currentUser); // Pass the user directly
        } else {
          console.log("AuthContext: No user session found.");
        }
      } catch (e: any) {
        console.error("Error in auth getSession:", e.message);
        if (e.message.includes("timed out")) {
          console.warn("AuthContext: Session check timed out. Forcing sign out...");
          await supabase.auth.signOut();
        }
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        console.log("AuthContext: Setting loading to false.");
        setLoading(false);
      }
    };

    checkUserOnLoad();

    // --- MODIFIED: onAuthStateChange now passes currentUser to refreshProfile ---
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext: Auth state changed!", event);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser); // Update state

        if (currentUser) {
          // Pass the freshly determined currentUser directly
          await refreshProfile(currentUser); 
        } else {
          setProfile(null);
          console.log("AuthContext: User signed out.");
        }
      }
    );
    // --- END MODIFICATION ---

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // Only run on mount

  // --- (signUp, signIn functions are unchanged) ---
  const signUp = async (formData: any) => {
    const { email, password, ...rest } = formData;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
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

  // --- (signOut function is unchanged) ---
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // State will clear via onAuthStateChange
  };

  // --- MODIFIED: Added refreshProfile to value ---
  const value = {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile, // <-- Included
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