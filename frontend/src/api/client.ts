import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
});

// ajoute le token JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// token expiré ou compte désactivé : on renvoie vers la page de connexion
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLogin = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== "/signin") {
        window.location.href = "/signin";
      }
    }
    return Promise.reject(error);
  },
);

// message lisible à partir d'une erreur de l'API
// (NestJS renvoie { message: string | string[] })
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Impossible de joindre le serveur. Le backend est-il démarré ?";
    }
    const message = (error.response.data as { message?: string | string[] })
      ?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
  }
  return "Une erreur est survenue";
}

export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
