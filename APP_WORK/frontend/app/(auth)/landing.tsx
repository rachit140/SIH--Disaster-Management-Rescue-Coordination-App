import React from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme/ThemeContext";
import { Logo, Button, Card } from "@/src/components/ui";

export default function Landing() {
  const { c } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 900;

  const navigateToAuth = (screen: "login" | "register") => {
    router.push(`/(auth)/${screen}`);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Navbar */}
        <View style={[styles.navbar, { paddingTop: Math.max(insets.top, 16) }]}>
          <Logo size={36} subtitle={isDesktop} />
          <View style={styles.navActions}>
            <Pressable
              testID="landing-signin"
              onPress={() => navigateToAuth("login")}
              style={({ pressed }) => [
                styles.navLink,
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Text style={[styles.navLinkText, { color: c.blue }]}>Sign In</Text>
            </Pressable>
            <Button
              testID="landing-register-top"
              title="Create Account"
              onPress={() => navigateToAuth("register")}
              full={false}
              variant="primary"
            />
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[c.navy, "#1A4E9E", c.blue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderRadius: 24 }]}
          >
            <View style={styles.heroBadge}>
              <Ionicons name="pulse-outline" size={14} color="#FFF" />
              <Text style={styles.heroBadgeText}>OFFLINE-FIRST RESCUE COORDINATION</Text>
            </View>
            <Text style={styles.heroTitle}>
              Connect. Coordinate. Respond.{"\n"}Save Lives.
            </Text>
            <Text style={styles.heroDesc}>
              SAHAYSETU connects survivors, ground volunteers, and command centers using peer-to-peer mesh synchronization, operating even when cellular towers and internet networks fail.
            </Text>
            <View style={styles.heroActions}>
              <Button
                testID="hero-get-started"
                title="Get Started Now"
                onPress={() => navigateToAuth("register")}
                full={false}
                color="#FF8A00"
              />
              <Pressable
                onPress={() => navigateToAuth("login")}
                style={({ pressed }) => [
                  styles.heroOutlineBtn,
                  { opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <Text style={styles.heroOutlineText}>Sign In to Network</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* Core Pathways Section */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Choose Your Pathway</Text>
          <Text style={[styles.sectionSubtitle, { color: c.textMuted }]}>
            Tailored interfaces for public emergency support and professional responders.
          </Text>
        </View>

        <View style={[styles.pathwaysGrid, { flexDirection: isDesktop ? "row" : "column" }]}>
          {/* Pathway 1: Citizen */}
          <Card style={[styles.pathwayCard, { flex: 1 }]}>
            <View style={[styles.pathwayIconContainer, { backgroundColor: c.orangeSoft }]}>
              <Ionicons name="people-outline" size={28} color={c.orange} />
            </View>
            <Text style={[styles.pathwayTitle, { color: c.text }]}>Citizen Track</Text>
            <Text style={[styles.pathwayDesc, { color: c.textMuted }]}>
              For individuals affected by disasters, seeking support, or needing to report local emergencies.
            </Text>
            <View style={styles.bulletList}>
              {[
                { icon: "alert-circle", label: "Instant Offline SOS alerts" },
                { icon: "location", label: "Pinpoint shelter and medical locations" },
                { icon: "document-text", label: "Request food, water, and emergency aid" },
              ].map((item, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Ionicons name={item.icon as any} size={16} color={c.orange} />
                  <Text style={[styles.bulletText, { color: c.text }]}>{item.label}</Text>
                </View>
              ))}
            </View>
            <Button
              testID="landing-citizen-cta"
              title="Access as Citizen"
              onPress={() => navigateToAuth("register")}
              variant="outline"
              color={c.orange}
            />
          </Card>

          {/* Pathway 2: Rescue Agency */}
          <Card style={[styles.pathwayCard, { flex: 1 }]}>
            <View style={[styles.pathwayIconContainer, { backgroundColor: c.blueSoft }]}>
              <Ionicons name="shield-checkmark-outline" size={28} color={c.blue} />
            </View>
            <Text style={[styles.pathwayTitle, { color: c.text }]}>Rescue Agency Track</Text>
            <Text style={[styles.pathwayDesc, { color: c.textMuted }]}>
              For government authorities, emergency medical services, and registered volunteer coordinators.
            </Text>
            <View style={styles.bulletList}>
              {[
                { icon: "git-network", label: "Live command-center GIS map" },
                { icon: "hand-left", label: "Volunteer and team dispatch" },
                { icon: "analytics", label: "Real-time logistics and analytics" },
              ].map((item, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Ionicons name={item.icon as any} size={16} color={c.blue} />
                  <Text style={[styles.bulletText, { color: c.text }]}>{item.label}</Text>
                </View>
              ))}
            </View>
            <Button
              testID="landing-rescue-cta"
              title="Access as Responder"
              onPress={() => navigateToAuth("register")}
              variant="primary"
            />
          </Card>
        </View>

        {/* Feature Highlights Grid */}
        <View style={styles.featuresSection}>
          <Text style={[styles.featuresHeader, { color: c.text }]}>Built For Extreme Situations</Text>
          <View style={styles.featuresGrid}>
            {[
              {
                icon: "cloud-offline-outline",
                title: "P2P Mesh Network",
                desc: "Automatically routes SOS messages through nearby devices using Bluetooth until internet access is reached.",
                color: c.green,
                bg: c.greenSoft
              },
              {
                icon: "shield-outline",
                title: "Verified Credentials",
                desc: "Verification protocols for official responders to ensure coordinated resource allocation and prevent spoofing.",
                color: c.purple,
                bg: c.blueSoft
              },
              {
                icon: "map-outline",
                title: "Dynamic Visualizations",
                desc: "Geospatial markers cluster emergency incidents to prioritize rescue missions based on severity.",
                color: c.red,
                bg: c.redSoft
              }
            ].map((feat, idx) => (
              <View key={idx} style={[styles.featureCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={[styles.featureIconBox, { backgroundColor: feat.bg }]}>
                  <Ionicons name={feat.icon as any} size={22} color={feat.color} />
                </View>
                <Text style={[styles.featureCardTitle, { color: c.text }]}>{feat.title}</Text>
                <Text style={[styles.featureCardDesc, { color: c.textMuted }]}>{feat.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: c.border }]}>
          <Text style={[styles.footerText, { color: c.textMuted }]}>
            SAHAYSETU • Connected. Coordinated. Resilient. Save Lives.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: 60 },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  navActions: { flexDirection: "row", alignItems: "center", gap: 18 },
  navLink: { paddingVertical: 8, paddingHorizontal: 4 },
  navLinkText: { fontSize: 15, fontWeight: "700" },
  heroSection: { paddingHorizontal: 24, paddingVertical: 16 },
  heroCard: {
    padding: 36,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 6,
  },
  heroBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  heroTitle: { color: "#FFF", fontSize: 32, fontWeight: "900", lineHeight: 40 },
  heroDesc: { color: "rgba(255,255,255,0.85)", fontSize: 16, lineHeight: 24, maxWidth: 640 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16, marginTop: 8 },
  heroOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 12,
    paddingHorizontal: 18,
    height: 50,
  },
  heroOutlineText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  sectionHead: { paddingHorizontal: 24, marginTop: 32, marginBottom: 16, gap: 4 },
  sectionTitle: { fontSize: 24, fontWeight: "900" },
  sectionSubtitle: { fontSize: 15, lineHeight: 20 },
  pathwaysGrid: { paddingHorizontal: 24, gap: 20 },
  pathwayCard: { padding: 24, gap: 16 },
  pathwayIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pathwayTitle: { fontSize: 20, fontWeight: "800" },
  pathwayDesc: { fontSize: 14, lineHeight: 20 },
  bulletList: { gap: 12, marginVertical: 8 },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bulletText: { fontSize: 14, fontWeight: "600" },
  featuresSection: { paddingHorizontal: 24, marginTop: 44, gap: 20 },
  featuresHeader: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  featureCard: {
    flexBasis: 250,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureCardTitle: { fontSize: 16, fontWeight: "800" },
  featureCardDesc: { fontSize: 13, lineHeight: 18 },
  footer: {
    marginTop: 60,
    marginHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    alignItems: "center",
  },
  footerText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
});
