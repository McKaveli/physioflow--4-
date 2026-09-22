import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // send/receive httpOnly auth cookies
  headers: { "Content-Type": "application/json" },
});

export interface ApiErrorShape {
  error: string;
  fields?: Record<string, string[] | undefined>;
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    if (data?.error) return data.error;
    if (err.code === "ERR_NETWORK") return "We couldn't reach the server. Please check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// Transparent access-token refresh: on a 401 from any authenticated call (except auth endpoints
// themselves), attempt one silent refresh before giving up and forcing a re-login.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.startsWith("/auth/");

    if (error.response?.status === 401 && !isAuthRoute && !original._retry) {
      original._retry = true;
      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = api.post("/auth/refresh").then(() => undefined).finally(() => {
            isRefreshing = false;
          });
        }
        await refreshPromise;
        return api(original);
      } catch {
        // fall through to reject — the caller (or route guard) handles redirect to login
      }
    }
    return Promise.reject(error);
  }
);
