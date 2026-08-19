import { useWindowDimensions } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";

export function useResponsive(breakpoint = 900) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  // Citizen and volunteer always use the mobile view (app shell).
  // Only ADMIN has responsive desktop view enabled (if screen width matches).
  const isDesktop = user?.role === "ADMIN" && width >= breakpoint;

  return { isDesktop, width };
}
