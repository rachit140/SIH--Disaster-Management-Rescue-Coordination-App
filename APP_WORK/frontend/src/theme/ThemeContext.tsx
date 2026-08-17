import React, { createContext, useContext, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";
import { dark, light, Palette } from "./tokens";

type ThemeCtx = { c: Palette; mode: "light" | "dark"; toggle: () => void; setMode: (m: "light" | "dark") => void };
const Ctx = createContext<ThemeCtx | null>(null);
const KEY = "sahaysetu.theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string>(KEY, "light");
      if (saved === "dark") setModeState("dark");
    })();
  }, []);

  const setMode = (m: "light" | "dark") => {
    setModeState(m);
    storage.setItem(KEY, m);
  };
  const toggle = () => setMode(mode === "light" ? "dark" : "light");

  const c = mode === "light" ? light : dark;
  return <Ctx.Provider value={{ c, mode, toggle, setMode }}>{children}</Ctx.Provider>;
}

export const useTheme = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
};
