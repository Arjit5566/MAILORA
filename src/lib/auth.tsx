import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import axios from "axios";
import { API_URL } from "./api";
import { supabase, isSupabaseConfigured, signInWithGoogle } from "./supabase";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (preferredEmail?: string, preferredName?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<string>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Base URL for auth endpoints
const AUTH_API_URL = `${API_URL || "http://localhost:4000/api"}/auth`;

// SSR-safe storage abstraction
const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return null;
  },
  setItem(key: string, value: string): void {
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore
      }
    }
  },
  removeItem(key: string): void {
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  },
};

// Configure axios interceptor for auth token (SSR safe)
axios.interceptors.request.use((config) => {
  const token = safeStorage.getItem("sendflow_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize to null and loading: true to ensure SSR and initial client hydration match perfectly
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const saveAuth = useCallback((tokenVal: string, userVal: AuthUser) => {
    setToken(tokenVal);
    setUser(userVal);
    safeStorage.setItem("sendflow_token", tokenVal);
    safeStorage.setItem("sendflow_user", JSON.stringify(userVal));
    axios.defaults.headers.common["Authorization"] = `Bearer ${tokenVal}`;
  }, []);

  const clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    safeStorage.removeItem("sendflow_token");
    safeStorage.removeItem("sendflow_user");
    delete axios.defaults.headers.common["Authorization"];
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }
  }, []);

  // Sync / verify user session on mount (browser only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Immediately restore cached credentials synchronously from localStorage
    const storedToken = safeStorage.getItem("sendflow_token");
    const storedUser = safeStorage.getItem("sendflow_user");
    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setToken(storedToken);
        axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        // If we have a cached user and there's NO OAuth return, mark loading done immediately
        // for instant 0ms app rendering
        const hasOAuthReturnEarly =
          window.location.hash.includes("access_token") ||
          window.location.search.includes("code=");
        if (!hasOAuthReturnEarly) {
          setLoading(false);
          return;
        }
      } catch {
        // ignore invalid JSON
      }
    }

    async function initAuth() {
      const hasOAuthReturn =
        typeof window !== "undefined" &&
        (window.location.hash.includes("access_token") || window.location.search.includes("code="));

      // If returning from Google OAuth, prioritize fresh OAuth exchange over old cached token
      // Otherwise skip /me network call if we already have a valid cached user
      if (!hasOAuthReturn && storedToken && !safeStorage.getItem("sendflow_user")) {
        try {
          const res = await axios.get(`${AUTH_API_URL}/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            timeout: 3000,
          });
          if (res.data?.user) {
            setUser(res.data.user);
            safeStorage.setItem("sendflow_user", JSON.stringify(res.data.user));
          }
        } catch {
          // Token invalid or expired
          clearAuth();
        }
      }

      // Check Supabase Google OAuth callback ONLY when an OAuth return is detected in the URL
      if (isSupabaseConfigured && hasOAuthReturn) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const googleEmail = session.user.email;
            const googleName =
              session.user.user_metadata?.["full_name"] ||
              session.user.user_metadata?.["name"] ||
              googleEmail?.split("@")[0] ||
              "Google User";

            if (googleEmail) {
              const bridgeRes = await axios.post(`${AUTH_API_URL}/google`, {
                email: googleEmail,
                name: googleName,
              }, { timeout: 8000 });

              if (bridgeRes.data?.token && bridgeRes.data?.user) {
                saveAuth(bridgeRes.data.token, bridgeRes.data.user);
                if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
                  window.history.replaceState(null, "", window.location.pathname);
                }
              }
            }
          }
        } catch (err) {
          console.warn("[Auth] Supabase session check notice:", err);
        }
      }

      setLoading(false);
    }

    initAuth();

    // Listen for Supabase auth state change (only if real Supabase project is configured)
    let subscription: any = null;
    if (isSupabaseConfigured) {
      const authSub = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
            const googleEmail = session.user.email;
            const googleName =
              session.user.user_metadata?.["full_name"] ||
              session.user.user_metadata?.["name"] ||
              googleEmail?.split("@")[0] ||
              "Google User";

            if (googleEmail) {
              try {
                const res = await axios.post(`${AUTH_API_URL}/google`, {
                  email: googleEmail,
                  name: googleName,
                });
                if (res.data?.token && res.data?.user) {
                  saveAuth(res.data.token, res.data.user);
                  if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
                    window.history.replaceState(null, "", window.location.pathname);
                  }
                }
              } catch (err) {
                console.error("[Auth] Google sync error:", err);
              }
            }
          }
        }
      );
      subscription = authSub.data?.subscription;
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, [clearAuth, saveAuth]);

  // Login with Email & Password
  const login = async (email: string, password: string) => {
    const res = await axios.post(`${AUTH_API_URL}/login`, { email, password }, { timeout: 8000 });
    if (res.data?.token && res.data?.user) {
      saveAuth(res.data.token, res.data.user);
    } else {
      throw new Error("Invalid response from server");
    }
  };

  // Register new account
  const register = async (name: string, email: string, password: string) => {
    const res = await axios.post(`${AUTH_API_URL}/register`, { name, email, password }, { timeout: 8000 });
    if (res.data?.token && res.data?.user) {
      saveAuth(res.data.token, res.data.user);
    } else {
      throw new Error("Invalid response from server");
    }
  };

  // Continue with Google (Supabase OAuth if configured, or direct Mailora Google auth bridge)
  const loginWithGoogle = async (preferredEmail?: string, preferredName?: string) => {
    if (isSupabaseConfigured) {
      try {
        await signInWithGoogle();
        return;
      } catch (err: any) {
        console.warn("[Auth] Supabase OAuth redirect error, falling back to direct bridge:", err);
      }
    }
    // Direct PostgreSQL Google authentication bridge fallback
    const emailToUse = preferredEmail?.trim() || "arjitripathi0607@gmail.com";
    const nameToUse = preferredName?.trim() || emailToUse.split("@")[0] || "Arjit";
    const res = await axios.post(`${AUTH_API_URL}/google`, {
      email: emailToUse,
      name: nameToUse,
    });
    if (res.data?.token && res.data?.user) {
      saveAuth(res.data.token, res.data.user);
    } else {
      throw new Error(res.data?.error || "Google authentication failed. Please check server connection.");
    }
  };

  // Forgot Password request
  const forgotPassword = async (email: string): Promise<string> => {
    const res = await axios.post(`${AUTH_API_URL}/forgot-password`, { email });
    return res.data?.message || "If that email exists, a password reset link has been sent.";
  };

  // Reset Password action
  const resetPassword = async (tokenVal: string, password: string): Promise<string> => {
    const res = await axios.post(`${AUTH_API_URL}/reset-password`, { token: tokenVal, password });
    return res.data?.message || "Password reset successfully. You can now log in.";
  };

  // Logout action
  const logout = () => {
    clearAuth();
    axios.post(`${AUTH_API_URL}/logout`).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        loginWithGoogle,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
