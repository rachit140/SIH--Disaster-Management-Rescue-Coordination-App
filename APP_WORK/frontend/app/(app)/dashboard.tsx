import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { api } from "@/src/api";
import { Card, SeverityPill } from "@/src/components/ui";
import { LeafletMap } from "@/src/components/LeafletMap";
import { buildMarkers, sevColor, typeIcon } from "@/src/lib/incidentMeta";
import { useResponsive } from "@/src/hooks/useResponsive";

const KPI_META: Record<string, { label: string; icon: string; key: string }> = {
  active_incidents: { label: "Active Incidents", icon: "alert-circle", key: "red" },
  people_affected: { label: "People Affected", icon: "people", key: "orange" },
  volunteers_on_field: { label: "Volunteers On Field", icon: "hand-left", key: "green" },
  rescues_completed: { label: "Rescues Completed", icon: "checkmark-done-circle", key: "blue" },
};

export default function Dashboard() {
  const { c, mode } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { isDesktop, width } = useResponsive(1000);
  const [data, setData] = useState<any>(null);
  const [markers, setMarkers] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const [d, m] = await Promise.all([api.dashboard(), api.mapMarkers()]);
          if (alive) { setData(d); setMarkers(m); }
        } catch {}
        if (alive) setLoading(false);
      })();
      return () => { alive = false; };
    }, []),
  );

  const kpiColor = (k: string) => (k === "red" ? c.red : k === "orange" ? c.orange : k === "green" ? c.green : c.blue);
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}><ActivityIndicator color={c.blue} size="large" /></View>;
  }

  const kpis = data?.kpis || {};
  const recent = data?.recent_incidents || [];
  const mapMarkers = markers ? buildMarkers(c, markers) : [];
  const kpiCols = isDesktop ? "23%" : width >= 640 ? "48%" : "100%";

  if (user?.role === "ADMIN") {
    return (
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false} testID="admin-dashboard-screen">
        <View style={{ gap: 4 }}>
          <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>Current Crisis</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
            <Text style={{ color: c.red, fontSize: 28, fontWeight: "900" }}>🔴 FLOOD - HIGH</Text>
          </View>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: "600", marginTop: 4 }}>Affected: 14,200 people</Text>
        </View>

        {/* Mockup Stat Cards */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <Card testID="stat-missing" style={{ flexBasis: isDesktop ? "30%" : "100%", flexGrow: 1, padding: 20, alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: "700" }}>Missing</Text>
            <Text style={{ color: c.text, fontSize: 36, fontWeight: "900" }}>82</Text>
          </Card>

          <Card testID="stat-camps" style={{ flexBasis: isDesktop ? "30%" : "100%", flexGrow: 1, padding: 20, alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: "700" }}>Camps</Text>
            <Text style={{ color: c.text, fontSize: 36, fontWeight: "900" }}>14</Text>
          </Card>

          <Card testID="stat-reports" style={{ flexBasis: isDesktop ? "30%" : "100%", flexGrow: 1, padding: 20, alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: "700" }}>Reports</Text>
            <Text style={{ color: c.text, fontSize: 36, fontWeight: "900" }}>231</Text>
          </Card>
        </View>

        {/* Live Map (Disaster Map) */}
        <View style={{ gap: 10 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: "850" }}>Live map</Text>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <View style={{ backgroundColor: c.border, padding: 12, borderBottomWidth: 1, borderBottomColor: c.divider }}>
              <Text style={{ color: c.text, fontSize: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>DISASTER MAP</Text>
            </View>
            <LeafletMap markers={mapMarkers} dark={mode === "dark"} height={isDesktop ? 480 : 320} center={[22.9, 79.5]} zoom={isDesktop ? 5 : 4} />
          </Card>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 18 }} showsVerticalScrollIndicator={false} testID="dashboard-screen">
      <View>
        <Text style={{ color: c.text, fontSize: 24, fontWeight: "900" }}>{greeting}, {user?.name?.split(" ")[0] || "there"} 👋</Text>
        <Text style={{ color: c.textMuted, fontSize: 15, marginTop: 4 }}>Here&apos;s what&apos;s happening across your response network today.</Text>
      </View>

      {/* KPIs */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        {Object.entries(KPI_META).map(([id, meta]) => {
          const k = kpis[id] || { value: 0, change: 0, trend: "up" };
          const col = kpiColor(meta.key);
          return (
            <Card key={id} testID={`kpi-${id}`} style={{ flexBasis: kpiCols as any, flexGrow: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: col + "1F", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={meta.icon as any} size={22} color={col} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Ionicons name={k.trend === "up" ? "trending-up" : "trending-down"} size={15} color={c.green} />
                  <Text style={{ color: c.green, fontSize: 13, fontWeight: "700" }}>{k.change}%</Text>
                </View>
              </View>
              <Text style={{ color: c.text, fontSize: 30, fontWeight: "900", marginTop: 12 }}>{Number(k.value).toLocaleString()}</Text>
              <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>{meta.label}</Text>
            </Card>
          );
        })}
      </View>

      {/* Map + Recent */}
      <View style={{ flexDirection: isDesktop ? "row" : "column", gap: 16 }}>
        <Card style={{ flex: isDesktop ? 2 : undefined, padding: 0, overflow: "hidden" }}>
          <View style={styles.cardHead}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>Live Incident Overview</Text>
            <Pressable testID="open-live-map" onPress={() => router.push("/live-map")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ color: c.blue, fontSize: 13, fontWeight: "600" }}>Full map</Text>
              <Ionicons name="expand-outline" size={15} color={c.blue} />
            </Pressable>
          </View>
          <LeafletMap markers={mapMarkers} dark={mode === "dark"} height={isDesktop ? 420 : 300} center={[22.9, 79.5]} zoom={isDesktop ? 5 : 4} />
          <View style={[styles.legend, { borderTopColor: c.border }]}>
            <Legend color={c.red} label="High" />
            <Legend color={c.orange} label="Medium" />
            <Legend color={c.green} label="Low" />
            <Legend color={c.blue} label="Teams" />
            <Legend color={c.purple} label="Shelters" />
          </View>
        </Card>

        <Card style={{ flex: isDesktop ? 1 : undefined, padding: 0 }}>
          <View style={styles.cardHead}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>Recent Incidents</Text>
            <Pressable onPress={() => router.push("/incidents")}>
              <Text style={{ color: c.blue, fontSize: 13, fontWeight: "600" }}>View all</Text>
            </Pressable>
          </View>
          <View>
            {recent.map((inc: any, idx: number) => (
              <Pressable
                key={inc.id}
                testID={`recent-${inc.id}`}
                onPress={() => router.push(`/incident/${inc.id}`)}
                style={[styles.incRow, { borderTopColor: c.divider, borderTopWidth: idx === 0 ? 0 : 1 }]}
              >
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: sevColor(c, inc.severity) + "1F", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={typeIcon(inc.type) as any} size={20} color={sevColor(c, inc.severity)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>{inc.title}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{inc.location} • {inc.time}</Text>
                </View>
                <SeverityPill level={inc.severity} />
              </Pressable>
            ))}
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: color }} />
      <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 16, padding: 14, borderTopWidth: 1 },
  incRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
});
