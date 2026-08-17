import React from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme/ThemeContext";
import { Logo } from "@/src/components/ui";

// Split-screen auth scaffold: brand visual on the left (desktop), form on the right.
export function AuthScaffold({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 900;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {isDesktop && (
        <LinearGradient colors={[c.navy, "#1A4E9E", c.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.left}>
          <Logo size={44} light />
          <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
            <Text style={styles.h1}>Connect. Coordinate.{"\n"}Respond. Save Lives.</Text>
            <Text style={styles.p}>
              One platform to manage incidents, mobilise volunteers and rescue teams, and coordinate relief — in real time, even offline.
            </Text>
            <View style={{ gap: 14, marginTop: 10 }}>
              {[
                ["pulse-outline", "Live incident command & mapping"],
                ["people-outline", "Volunteer & rescue team coordination"],
                ["cube-outline", "Resource, shelter & relief tracking"],
              ].map(([icon, label]) => (
                <View key={label} style={styles.feature}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={icon as any} size={18} color="#fff" />
                  </View>
                  <Text style={styles.featureText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={styles.footer}>One Platform. Every Response. Every Life Matters.</Text>
        </LinearGradient>
      )}

      <View style={styles.right}>
        <ScrollView
          contentContainerStyle={[styles.formArea, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: "100%", maxWidth: 420, gap: 18 }}>
            {!isDesktop && (
              <View style={{ alignItems: "center", marginBottom: 6 }}>
                <Logo size={44} subtitle />
              </View>
            )}
            {children}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  left: { width: "44%", maxWidth: 560, padding: 44, justifyContent: "space-between" },
  h1: { color: "#fff", fontSize: 34, fontWeight: "900", lineHeight: 42 },
  p: { color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 22, maxWidth: 420 },
  feature: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  featureText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  footer: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  right: { flex: 1 },
  formArea: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
});
