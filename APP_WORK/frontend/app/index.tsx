import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

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
    if (!user) return <Redirect href="/landing" />;
    if (!user.role) return <Redirect href="/role-selection" />;
    return <Redirect href="/dashboard" />;
  }

  return (
    <View style={[styles.root, { backgroundColor: "#FFFFFF" }]}>
      <StatusBar style="dark" />
      
      <Animated.View style={{ opacity: fade, alignItems: "center", gap: 12, width: "100%", paddingHorizontal: 20 }}>
        {/* Top Brand Logo */}
        <Logo size={90} showText={false} />
        
        <Text style={[styles.brandTitle, { color: "#123B78" }]}>SAHAYSETU</Text>
        <Text style={[styles.brandSubtitle, { color: "#667085" }]}>
          INTELLIGENT DISASTER RESPONSE &{"\n"}RESCUE COORDINATION PLATFORM
        </Text>

        {/* Highlight tagline */}
        <View style={styles.taglineBox}>
          <Text style={[styles.taglineText, { color: "#123B78" }]}>Connect. </Text>
          <Text style={[styles.taglineText, { color: "#16A66A" }]}>Coordinate. </Text>
          <Text style={[styles.taglineText, { color: "#FF8A00" }]}>Respond. </Text>
          <Text style={[styles.taglineText, { color: "#EF3340" }]}>Save Lives.</Text>
        </View>

        {/* Central visual statement card */}
        <View style={[styles.illustrationCard, { borderColor: "#E4E9F2", backgroundColor: "#F7F9FC" }]}>
          <Ionicons name="boat-outline" size={48} color="#FF8A00" />
          <Text style={styles.promoHeading}>One Platform.</Text>
          <Text style={[styles.promoSubheading, { color: "#16A66A" }]}>Every Response.</Text>
          <Text style={[styles.promoTagline, { color: "#EF3340" }]}>Every Life Matters.</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <ActivityIndicator color="#1463E8" size="small" style={{ marginBottom: 12 }} />
        <Text style={[styles.init, { color: "#667085" }]}>Initializing secure response network…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  brandTitle: { fontSize: 36, fontWeight: "900", letterSpacing: 1, marginTop: 10, fontFamily: "System" },
  brandSubtitle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textAlign: "center", lineHeight: 16, textTransform: "uppercase" },
  taglineBox: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 14, marginBottom: 8 },
  taglineText: { fontSize: 15, fontWeight: "900" },
  illustrationCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 8,
  },
  promoHeading: { fontSize: 20, fontWeight: "900", color: "#123B78" },
  promoSubheading: { fontSize: 18, fontWeight: "800" },
  promoTagline: { fontSize: 18, fontWeight: "850" },
  footer: { position: "absolute", bottom: 50, alignItems: "center" },
  init: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5 },
});
