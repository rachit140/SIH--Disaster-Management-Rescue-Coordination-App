import { ActivityIndicator, View } from "react-native";
import { Redirect, Slot } from "expo-router";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { AppShell } from "@/src/components/AppShell";

export default function AppLayout() {
  const { c } = useTheme();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={c.blue} size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (!user.role) return <Redirect href="/role-selection" />;

  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}
