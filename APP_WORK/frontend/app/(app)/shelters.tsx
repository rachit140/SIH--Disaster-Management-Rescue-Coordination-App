import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { Card, StatusBadge } from "@/src/components/ui";
import { ProgressBar } from "@/src/components/charts";
import { LeafletMap } from "@/src/components/LeafletMap";
import { Meta } from "./survivors";

export default function Shelters() {
  const { c, mode } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1000;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => { try { const r = await api.shelters(); if (alive) setItems(r); } catch {} if (alive) setLoading(false); })();
    return () => { alive = false; };
  }, []));

  const markers = items.map((s) => ({ lat: s.latitude, lng: s.longitude, color: c.purple, r: 9, title: s.name, sub: `${s.occupancy}/${s.capacity} occupied` }));
  if (loading) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={c.blue} size="large" /></View>;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 16 }} testID="shelters-screen" showsVerticalScrollIndicator={false}>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>Shelters</Text>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <LeafletMap markers={markers} dark={mode === "dark"} height={isDesktop ? 300 : 240} center={[22.9, 79.5]} zoom={isDesktop ? 5 : 4} />
      </Card>
      {items.map((s) => {
        const available = s.capacity - s.occupancy;
        return (
          <Card key={s.id} testID={`shelter-${s.id}`}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>{s.name}</Text>
              <StatusBadge label={s.status || "Open"} />
            </View>
            <Meta icon="location-outline" text={`${s.latitude?.toFixed(2)}, ${s.longitude?.toFixed(2)}`} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>Capacity <Text style={{ color: c.text, fontWeight: "800" }}>{s.capacity}</Text></Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>Occupied <Text style={{ color: c.text, fontWeight: "800" }}>{s.occupancy}</Text></Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>Available <Text style={{ color: c.green, fontWeight: "800" }}>{available}</Text></Text>
            </View>
            <View style={{ marginTop: 6 }}><ProgressBar value={s.occupancy} max={s.capacity} color={available < s.capacity * 0.15 ? c.red : c.blue} /></View>
            <View style={{ flexDirection: "row", gap: 14, marginTop: 12 }}>
              <Facility ok={s.medical} icon="medkit-outline" label="Medical" />
              <Facility ok={s.food} icon="fast-food-outline" label="Food" />
              <Facility ok={s.water} icon="water-outline" label="Water" />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

function Facility({ ok, icon, label }: { ok: boolean; icon: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Ionicons name={(ok ? icon : "close-circle-outline") as any} size={15} color={ok ? c.green : c.textMuted} />
      <Text style={{ color: ok ? c.text : c.textMuted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({});
