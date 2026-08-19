import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { Card, StatusBadge } from "@/src/components/ui";
import { LeafletMap } from "@/src/components/LeafletMap";
import { Meta } from "./survivors";
import { useResponsive } from "@/src/hooks/useResponsive";

export default function Teams() {
  const { c, mode } = useTheme();
  const { isDesktop } = useResponsive(1000);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => { try { const r = await api.teams(); if (alive) setTeams(r); } catch {} if (alive) setLoading(false); })();
    return () => { alive = false; };
  }, []));

  const markers = teams.map((t) => ({ lat: t.latitude, lng: t.longitude, color: t.team_status === "DEPLOYED" ? c.red : t.team_status === "RETURNING" ? c.orange : t.team_status === "OFFLINE" ? c.textMuted : c.green, r: 9, title: t.name, sub: `${t.team_status} · ${t.members} members` }));

  if (loading) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={c.blue} size="large" /></View>;

  const list = (
    <View style={{ gap: 14, flex: 1 }}>
      {teams.map((t) => (
        <Card key={t.id} testID={`team-${t.id}`}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>{t.name}</Text>
            <StatusBadge label={t.team_status} />
          </View>
          <View style={{ gap: 4, marginTop: 8 }}>
            <Meta icon="person-outline" text={`Lead: ${t.leader}`} />
            <Meta icon="people-outline" text={`${t.members} members`} />
            <Meta icon="location-outline" text={`${t.latitude?.toFixed(2)}, ${t.longitude?.toFixed(2)}`} />
            <Meta icon="flag-outline" text={t.current_mission} />
          </View>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {(t.resources || []).map((r: string) => (
              <View key={r} style={{ backgroundColor: c.blueSoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 }}>
                <Text style={{ color: c.blue, fontSize: 11, fontWeight: "700" }}>{r}</Text>
              </View>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 16 }} testID="teams-screen" showsVerticalScrollIndicator={false}>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>Rescue Teams</Text>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14 }}>
          <Ionicons name="navigate" size={18} color={c.blue} />
          <Text style={{ color: c.text, fontWeight: "800" }}>Team Tracking</Text>
        </View>
        <LeafletMap markers={markers} dark={mode === "dark"} height={isDesktop ? 340 : 260} center={[22.9, 79.5]} zoom={isDesktop ? 5 : 4} />
      </Card>
      {list}
    </ScrollView>
  );
}

const styles = StyleSheet.create({});
