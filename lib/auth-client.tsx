"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ClientUser = {
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
};

type AuthContextValue = {
  user: ClientUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isSignedIn: false,
  isLoaded: false,
  reload: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <AuthContext.Provider value={{ user, isSignedIn: Boolean(user), isLoaded, reload }}>
      {children}
    </AuthContext.Provider>
  );
}

// Compatível com useUser() do @clerk/nextjs
export function useUser() {
  const { user, isSignedIn, isLoaded } = useContext(AuthContext);
  return { user, isSignedIn, isLoaded };
}

// Compatível com useClerk() do @clerk/nextjs — só o subconjunto usado no restante do código
// (session.reload() e signOut()). O cookie de sessão já vem atualizado na resposta das rotas
// de API que o alteram, então reload() aqui só re-sincroniza o estado do client.
export function useClerk() {
  const { reload } = useContext(AuthContext);
  return {
    session: { reload },
    signOut: async (callback?: () => void) => {
      await fetch("/api/auth/logout", { method: "POST" });
      await reload();
      callback?.();
    },
  };
}
