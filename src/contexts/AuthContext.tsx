import { createContext, useContext } from 'react';

interface AuthContextType {
  user: null;
  profile: null;
  loading: boolean;
  signUp: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: false,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{
      user: null,
      profile: null,
      loading: false,
      signUp: async () => {},
      signIn: async () => {},
      signOut: async () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
