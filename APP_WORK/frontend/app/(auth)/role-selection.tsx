import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { Button, Logo } from "@/src/components/ui";

const ROLES = [
  { key: "coordinator", label: "Coordinator", desc: "Command incidents & oversee response", icon: "git-network-outline", color: "#1463E8" },
  { key: "rescue_team", label: "Rescue Team", desc: "Execute field rescue operations", icon: "shield-checkmark-outline", color: "#EF3340" },
  { key: "volunteer", label: "Volunteer", desc: "Support relief on the ground", icon: "hand-left-outline", color: "#16A66A" },
  { key: "survivor", label: "Survivor / Citizen", desc: "Request help & report incidents", icon: "person-outline", color: "#FF8A00" },
  { key: "official", label: "Government Official", desc: "Monitor & authorise resources", icon: "business-outline", color: "#7C4DFF" },
];

export default function RoleSelection() {
  const { c } = useTheme();
  const router = useRouter();
  const { setRole, logout, user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(user?.role || null);
  const [loading, setLoading] = useState(false);
  const cols = width >= 900 ? 3 : width >= 600 ? 2 : 1;

  const confirm = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await setRole(selected);
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 28, alignItems: "center" }} showsVerticalScrollIndicator={false}>
        <View style={{ width: "100%", maxWidth: 900, gap: 20 }}>
          <Logo size={40} />
          <View style={{ gap: 6 }}>
            <Text style={{ color: c.text, fontSize: 26, fontWeight: "900" }}>Select Your Role</Text>
            <Text style={{ color: c.textMuted, fontSize: 15 }}>This tailors your dashboard and permissions.</Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
            {ROLES.map((r) => {
              const active = selected === r.key;
              return (
                <Pressable
                  key={r.key}
                  testID={`role-${r.key}`}
                  onPress={() => setSelected(r.key)}
                  style={[
                    styles.card,
                    { flexBasis: cols === 1 ? "100%" : cols === 2 ? "47%" : "31%", flexGrow: 1, backgroundColor: c.card, borderColor: active ? r.color : c.border, borderWidth: active ? 2 : 1 },
                  ]}
                >
                  <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: r.color + "22", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={r.icon as any} size={24} color={r.color} />
                  </View>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: "800", marginTop: 12 }}>{r.label}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4 }}>{r.desc}</Text>
                  {active && <Ionicons name="checkmark-circle" size={22} color={r.color} style={{ position: "absolute", top: 14, right: 14 }} />}
                </Pressable>
              );
            })}
          </View>

          <View style={{ maxWidth: 320, marginTop: 8 }}>
            <Button testID="role-confirm" title="Continue to Dashboard" onPress={confirm} loading={loading} />
          </View>
          <Pressable testID="role-logout" onPress={logout}>
            <Text style={{ color: c.textMuted, fontSize: 14 }}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 18, minHeight: 130 },
});
