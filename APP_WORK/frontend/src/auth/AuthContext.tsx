import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { storage } from "@/src/utils/storage";
import { api, setToken } from "@/src/api";

if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

const TOKEN_KEY = "sahaysetu.token";
const AUTH_URL = "https://auth.emergentagent.com/";

export type User = {
  user_id: string;
  email: string;
  name: string;
  role: string | null;
  verified: boolean;
  picture: string;
  provider: string;
};

type Ctx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role?: string) => Promise<any>;
  verifyOtp: (email: string, code: string) => Promise<User>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (email: string, code: string, pw: string) => Promise<any>;
  govLogin: (govId: string) => Promise<User>;
  googleLogin: () => Promise<void>;
  setRole: (role: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

async function persist(token: string, user: User) {
  setToken(token);
  await storage.secureSet(TOKEN_KEY, token);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const handledSids = useRef<Set<string>>(new Set());

  const finishSession = async (token: string) => {
    setToken(token);
    await storage.secureSet(TOKEN_KEY, token);
    const u = await api.me();
    setUser(u);
    return u;
  };

  useEffect(() => {
    (async () => {
      // Web: handle Google OAuth callback (session_id in hash or query) FIRST.
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const raw = window.location.hash + " " + window.location.search;
        const m = raw.match(/session_id=([^&#\s]+)/);
        if (m && !handledSids.current.has(m[1])) {
          handledSids.current.add(m[1]);
          try {
            const r = await api.googleSession(decodeURIComponent(m[1]));
            await persist(r.session_token, r.user);
            setUser(r.user);
            // strip session_id, keep the rest
            window.history.replaceState(window.history.state, "", window.location.pathname);
            setLoading(false);
            return;
          } catch {
            // fall through to token check
          }
        }
      }
      const token = await storage.secureGet<string>(TOKEN_KEY, "");
      if (token) {
        setToken(token);
        try {
          const u = await api.me();
          setUser(u);
        } catch {
          setToken(null);
          await storage.secureRemove(TOKEN_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.login(email, password);
    await persist(r.access_token, r.user);
    setUser(r.user);
    return r.user as User;
  };

  const register = async (name: string, email: string, password: string, role?: string) =>
    api.register({ name, email, password, role });

  const verifyOtp = async (email: string, code: string) => {
    const r = await api.verifyOtp(email, code);
    await persist(r.access_token, r.user);
    setUser(r.user);
    return r.user as User;
  };

  const govLogin = async (govId: string) => {
    const r = await api.govLogin(govId);
    await persist(r.access_token, r.user);
    setUser(r.user);
    return r.user as User;
  };

  const googleLogin = async () => {
    const redirect = Platform.OS === "web" ? window.location.origin + "/" : Linking.createURL("");
    const url = `${AUTH_URL}?redirect=${encodeURIComponent(redirect)}`;
    if (Platform.OS === "web") {
      window.location.href = url;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(url, redirect);
    let cbUrl = (result as any)?.url as string | undefined;
    if (!cbUrl) cbUrl = (await Linking.getInitialURL()) || undefined;
    if (cbUrl) {
      const m = cbUrl.match(/session_id=([^&#]+)/);
      if (m) {
        const r = await api.googleSession(decodeURIComponent(m[1]));
        await persist(r.session_token, r.user);
        setUser(r.user);
      }
    }
  };

  const setRoleFn = async (role: string) => {
    const u = await api.setRole(role);
    setUser(u);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    setToken(null);
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyOtp,
        forgotPassword: api.forgotPassword,
        resetPassword: api.resetPassword,
        govLogin,
        googleLogin,
        setRole: setRoleFn,
        logout,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
};
