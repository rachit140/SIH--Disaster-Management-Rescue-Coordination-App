import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { LeafletMap } from "@/src/components/LeafletMap";
import { buildMarkers } from "@/src/lib/incidentMeta";
import { useResponsive } from "@/src/hooks/useResponsive";

const LAYERS: { key: string; label: string; colorKey: string; icon: string }[] = [
  { key: "incidents", label: "Incidents", colorKey: "red", icon: "alert-circle" },
  { key: "teams", label: "Rescue Teams", colorKey: "blue", icon: "shield-checkmark" },
  { key: "resources", label: "Resources", colorKey: "orange", icon: "cube" },
  { key: "shelters", label: "Shelters", colorKey: "purple", icon: "home" },
  { key: "hospitals", label: "Hospitals", colorKey: "green", icon: "medkit" },
];

export default function LiveMap() {
  const { c, mode } = useTheme();
  const { isDesktop } = useResponsive(900);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState<Record<string, boolean>>({ incidents: true, teams: true, resources: true, shelters: true, hospitals: true });

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try { const m = await api.mapMarkers(); if (alive) setData(m); } catch {}
        if (alive) setLoading(false);
      })();
      return () => { alive = false; };
    }, []),
  );

  const colorFor = (k: string) => (k === "red" ? c.red : k === "blue" ? c.blue : k === "orange" ? c.orange : k === "purple" ? c.purple : c.green);
  const markers = data ? buildMarkers(c, data, show) : [];

  const Filters = (
    <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={{ color: c.text, fontWeight: "800", fontSize: 14, marginBottom: 6 }}>Map Layers</Text>
      {LAYERS.map((l) => {
        const on = show[l.key];
        const count = data?.[l.key]?.length || 0;
        return (
          <Pressable key={l.key} testID={`layer-${l.key}`} onPress={() => setShow((s) => ({ ...s, [l.key]: !s[l.key] }))} style={styles.layerRow}>
            <Ionicons name={on ? "checkbox" : "square-outline"} size={20} color={on ? colorFor(l.colorKey) : c.textMuted} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colorFor(l.colorKey) }} />
            <Text style={{ color: c.text, fontSize: 14, flex: 1 }}>{l.label}</Text>
            <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "700" }}>{count}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (loading) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={c.blue} size="large" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} testID="live-map-screen">
      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ width: 260, padding: 16 }}>{Filters}</View>
          <View style={{ flex: 1 }}>
            <LeafletMap markers={markers} dark={mode === "dark"} height="100%" center={[22.9, 79.5]} zoom={5} />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={{ borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: c.border }}>
            <LeafletMap markers={markers} dark={mode === "dark"} height={360} center={[22.9, 79.5]} zoom={4} />
          </View>
          {Filters}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  layerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
});
