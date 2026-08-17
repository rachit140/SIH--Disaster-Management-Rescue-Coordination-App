import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/src/auth/AuthContext";

export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (!loading && user && user.role) return <Redirect href="/dashboard" />;
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
