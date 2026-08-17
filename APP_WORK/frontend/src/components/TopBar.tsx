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

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
      <Pressable testID="sidebar-toggle" onPress={onToggle} style={styles.iconBtn}>
        <Ionicons name="menu" size={24} color={c.text} />
      </Pressable>
      <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{title}</Text>

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
        <Ionicons name="notifications-outline" size={22} color={c.text} />
        <View style={[styles.dot, { backgroundColor: c.red }]} />
      </Pressable>
      <Pressable testID="topbar-messages" onPress={() => router.push("/messages" as any)} style={styles.iconBtn}>
        <Ionicons name="chatbubble-outline" size={21} color={c.text} />
        <View style={[styles.dot, { backgroundColor: c.blue }]} />
      </Pressable>
      <View style={[styles.online, { backgroundColor: c.greenSoft }]}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.green }} />
        <Text style={{ color: c.green, fontSize: 12, fontWeight: "700" }}>Online</Text>
      </View>
      <Pressable testID="topbar-profile" onPress={() => router.push("/profile" as any)}>
        <Avatar name={user?.name || "User"} size={36} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 62, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  title: { fontSize: 18, fontWeight: "800" },
  search: { flex: 1, maxWidth: 460, marginLeft: 16, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
  dot: { position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 4 },
  online: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
});
