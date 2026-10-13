import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { LoginResponse } from "./types";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
  // envoie le cookie httpOnly qui contient le refresh token
  withCredentials: true,
});

// l'access token (durée courte) reste en mémoire et n'est jamais écrit dans
// localStorage : un script injecté (XSS) ne peut pas le récupérer durablement
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// appelé quand la session ne peut plus être renouvelée
let onSessionExpired: () => void = () => {};

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

// demande une nouvelle paire de tokens à partir du cookie de refresh.
// une seule requête à la fois : si plusieurs appels reçoivent un 401 en même
// temps, ils attendent tous le même renouvellement
let refreshing: Promise<LoginResponse> | null = null;

export function refreshSession(): Promise<LoginResponse> {
  refreshing ??= api
    .post<LoginResponse>("/auth/refresh")
    .then(({ data }) => {
      setAccessToken(data.accessToken);
      return data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// ajoute le token JWT à chaque requête
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// access token expiré : on le renouvelle puis on rejoue la requête une fois.
// si le renouvellement échoue (session expirée, compte désactivé), on déconnecte
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthRoute = config?.url?.startsWith("/auth/");

    if (error.response?.status !== 401 || !config || isAuthRoute) {
      return Promise.reject(error);
    }

    if (!config._retry) {
      config._retry = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        // on passe à la déconnexion
      }
    }

    setAccessToken(null);
    onSessionExpired();
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
