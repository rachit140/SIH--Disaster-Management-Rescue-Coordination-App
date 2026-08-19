import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { Avatar } from "@/src/components/ui";

export function TopBar({ title, onToggle, isDesktop }: { title: string; onToggle: () => void; isDesktop: boolean }) {
  const { c } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");

  const displayTitle = title === "Dashboard" 
    ? `Welcome back, ${user?.name?.split(" ")[0] || "Coordinator"}! 👋` 
    : title;

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
      <Pressable testID="sidebar-toggle" onPress={onToggle} style={styles.iconBtn}>
        <Ionicons name="menu" size={24} color="#123B78" />
      </Pressable>
      <Text style={[styles.title, { color: "#123B78" }]} numberOfLines={1}>{displayTitle}</Text>

      {isDesktop && (
        <View style={[styles.search, { backgroundColor: c.bg, borderColor: c.border }]}>
          <Ionicons name="search" size={17} color={c.textMuted} />
          <TextInput
            testID="global-search"
            value={q}
            onChangeText={setQ}
            placeholder="Search incidents, survivors, resources…"
            placeholderTextColor={c.textMuted}
            style={{ flex: 1, color: c.text, fontSize: 14, paddingVertical: 8 }}
            onSubmitEditing={() => router.push(`/incidents?search=${encodeURIComponent(q)}` as any)}
          />
        </View>
      )}

      <View style={{ flex: isDesktop ? 0 : 1 }} />

      <Pressable testID="topbar-alerts" onPress={() => router.push("/alerts" as any)} style={styles.iconBtn}>
        <Ionicons name="notifications-outline" size={22} color="#123B78" />
        <View style={[styles.dot, { backgroundColor: "#EF3340", alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "900" }}>3</Text>
        </View>
      </Pressable>
      <Pressable testID="topbar-messages" onPress={() => router.push("/messages" as any)} style={styles.iconBtn}>
        <Ionicons name="chatbubble-outline" size={21} color="#123B78" />
        <View style={[styles.blueDot, { backgroundColor: "#1463E8" }]} />
      </Pressable>
      
      <View style={[styles.online, { backgroundColor: "#E6F6EF", borderColor: "#16A66A", borderWidth: 1 }]}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#16A66A" }} />
        <Text style={{ color: "#16A66A", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>Online</Text>
      </View>

      <Pressable testID="topbar-profile" onPress={() => router.push("/profile" as any)}>
        <Avatar name={user?.name || "User"} size={36} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 64, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  title: { fontSize: 18, fontWeight: "900", fontFamily: "System" },
  search: { flex: 1, maxWidth: 400, marginLeft: 16, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
  dot: { position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: 7 },
  blueDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  online: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
});
