import {
  api,
  refreshSession,
  setAccessToken,
  setSessionExpiredHandler,
} from "@/api/client";
import type { LoginResponse, RegisterPayload, User } from "@/api/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  // vrai pendant la restauration de la session au chargement de l'application
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // au rechargement de la page, l'access token (en mémoire) est perdu :
  // on en redemande un grâce au cookie de refresh
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    refreshSession()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const startSession = useCallback((data: LoginResponse) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      startSession(data);
    },
    [startSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const { data } = await api.post<LoginResponse>("/auth/register", payload);
      startSession(data);
    },
    [startSession],
  );

  // invalide le refresh token côté serveur et supprime le cookie ;
  // même si l'API ne répond pas, l'utilisateur est déconnecté localement
  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === "admin",
        loading,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
