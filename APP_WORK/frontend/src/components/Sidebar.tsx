import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { CITIZEN_NAV, AGENCY_NAV } from "@/src/lib/nav";
import { Logo, Avatar } from "@/src/components/ui";

export function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { c } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const width = collapsed ? 76 : 264;

  const go = (route: string) => {
    router.push(route as any);
    onNavigate?.();
  };

  const navSections = user?.role === "CITIZEN" ? CITIZEN_NAV : AGENCY_NAV;

  return (
    <View style={[styles.wrap, { width, backgroundColor: c.sidebarBg, borderRightColor: c.border }]}>
      <View style={[styles.logoRow, { justifyContent: collapsed ? "center" : "flex-start" }]}>
        <Logo size={36} showText={!collapsed} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
        {navSections.map((section) => (
          <View key={section.title} style={{ marginTop: 14 }}>
            {!collapsed && <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{section.title}</Text>}
            {section.items.map((item) => {
              const active = pathname === item.route || pathname.startsWith(item.route + "/");
              return (
                <Pressable
                  key={item.route}
                  testID={`nav-${item.route.replace("/", "")}`}
                  onPress={() => go(item.route)}
                  style={[
                    styles.item,
                    { justifyContent: collapsed ? "center" : "flex-start" },
                    active && { backgroundColor: c.activeBg },
                  ]}
                >
                  {active && !collapsed && <View style={[styles.activeBar, { backgroundColor: c.blue }]} />}
                  <Ionicons name={item.icon as any} size={20} color={active ? c.blue : c.textMuted} />
                  {!collapsed && (
                    <Text style={[styles.itemLabel, { color: active ? c.blue : c.text, fontWeight: active ? "700" : "500" }]}>
                      {item.label}
                    </Text>
                  )}
                  {!collapsed && item.badge ? (
                    <View style={[styles.badge, { backgroundColor: c.red }]}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <Pressable
        testID="nav-sos"
        onPress={() => go("/sos")}
        style={[styles.sos, { backgroundColor: c.redSoft, justifyContent: collapsed ? "center" : "flex-start" }]}
      >
        <Ionicons name="alert-circle" size={20} color={c.red} />
        {!collapsed && <Text style={{ color: c.red, fontWeight: "800" }}>Emergency SOS</Text>}
      </Pressable>

      <Pressable testID="nav-profile" onPress={() => go("/profile")} style={[styles.profile, { borderTopColor: c.border, justifyContent: collapsed ? "center" : "flex-start" }]}>
        <Avatar name={user?.name || "User"} size={38} />
        {!collapsed && (
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>{user?.name || "User"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.green }} />
              <Text style={{ color: c.textMuted, fontSize: 12, textTransform: "capitalize" }}>{user?.role || "Member"}</Text>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRightWidth: 1, height: "100%", paddingHorizontal: 12, paddingTop: 18 },
  logoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingBottom: 6 },
  sectionTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 6, marginLeft: 12 },
  item: { minHeight: 44, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, marginBottom: 2 },
  activeBar: { position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  itemLabel: { fontSize: 14, flex: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  sos: { minHeight: 46, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, marginVertical: 8 },
  profile: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 6 },
});
