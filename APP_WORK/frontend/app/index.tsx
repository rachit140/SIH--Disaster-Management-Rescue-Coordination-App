import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { Logo } from "@/src/components/ui";

export default function Splash() {
  const { c, mode } = useTheme();
  const { user, loading } = useAuth();
  const [minTime, setMinTime] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    const t = setTimeout(() => setMinTime(true), 1400);
    return () => clearTimeout(t);
  }, [fade]);

  if (!loading && minTime) {
    if (!user) return <Redirect href="/login" />;
    if (!user.role) return <Redirect href="/role-selection" />;
    return <Redirect href="/dashboard" />;
  }

  return (
    <View style={[styles.root, { backgroundColor: c.navy }]}>
      <StatusBar style="light" />
      <Animated.View style={{ opacity: fade, alignItems: "center", gap: 18 }}>
        <Logo size={64} light />
        <Text style={styles.subtitle}>Intelligent Disaster Response & Rescue Coordination Platform</Text>
        <Text style={styles.tagline}>Connect. Coordinate. Respond. Save Lives.</Text>
      </Animated.View>
      <View style={styles.footer}>
        <Text style={styles.init}>Initializing secure response network…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 15, textAlign: "center", maxWidth: 340, marginTop: 8 },
  tagline: { color: "#FF8A00", fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  footer: { position: "absolute", bottom: 60, alignItems: "center" },
  init: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
});
