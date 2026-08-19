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

const KPI_META: Record<string, { label: string; icon: string; bg: string; trendText: (val: any, trend: string) => string }> = {
  active_incidents: { 
    label: "Active Incidents", 
    icon: "alert-circle", 
    bg: "#EF3340",
    trendText: (v, t) => `↑ ${v} from yesterday`
  },
  people_affected: { 
    label: "People Affected", 
    icon: "people", 
    bg: "#FF8A00",
    trendText: (v, t) => `↑ ${v} from yesterday`
  },
  volunteers_on_field: { 
    label: "Volunteers On Field", 
    icon: "hand-left", 
    bg: "#16A66A",
    trendText: (v, t) => `↑ ${v} from yesterday`
  },
  rescues_completed: { 
    label: "Rescues Completed", 
    icon: "checkmark-done-circle", 
    bg: "#1463E8",
    trendText: (v, t) => `↑ ${v} from yesterday`
  },
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

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}><ActivityIndicator color={c.blue} size="large" /></View>;
  }

  const kpis = data?.kpis || {};
  const recent = data?.recent_incidents || [];
  const mapMarkers = markers ? buildMarkers(c, markers) : [];
  const kpiCols = isDesktop ? "23.5%" : width >= 640 ? "48%" : "100%";

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
        <Text style={{ color: "#123B78", fontSize: 24, fontWeight: "900" }}>{greeting}, {user?.name || "Arjun Sharma"} 👋</Text>
        <Text style={{ color: c.textMuted, fontSize: 15, marginTop: 4 }}>Here&apos;s what&apos;s happening across your response network today.</Text>
      </View>

      {/* KPIs (Mockup style color block cards) */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        {Object.entries(KPI_META).map(([id, meta]) => {
          const k = kpis[id] || { value: 0, change: 0, trend: "up" };
          return (
            <Card key={id} testID={`kpi-${id}`} style={{ flexBasis: kpiCols as any, flexGrow: 1, backgroundColor: meta.bg, borderColor: "transparent", padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>{meta.label}</Text>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={meta.icon as any} size={15} color="#FFFFFF" />
                </View>
              </View>
              <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "900", marginTop: 10 }}>{Number(k.value).toLocaleString()}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, backgroundColor: "rgba(0,0,0,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" }}>
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{meta.trendText(k.change, k.trend)}</Text>
              </View>
            </Card>
          );
        })}
      </View>

      {/* Map + Recent */}
      <View style={{ flexDirection: isDesktop ? "row" : "column", gap: 16 }}>
        <Card style={{ flex: isDesktop ? 2 : undefined, padding: 0, overflow: "hidden" }}>
          <View style={styles.cardHead}>
            <Text style={{ color: "#123B78", fontSize: 16, fontWeight: "900" }}>Live Incident Overview</Text>
            <Pressable testID="open-live-map" onPress={() => router.push("/live-map")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ color: "#1463E8", fontSize: 13, fontWeight: "700" }}>Full map</Text>
              <Ionicons name="expand-outline" size={15} color="#1463E8" />
            </Pressable>
          </View>
          <LeafletMap markers={mapMarkers} dark={mode === "dark"} height={isDesktop ? 400 : 300} center={[22.9, 79.5]} zoom={isDesktop ? 5 : 4} />
          <View style={[styles.legend, { borderTopColor: c.border }]}>
            <Legend color="#EF3340" label="High" />
            <Legend color="#FF8A00" label="Medium" />
            <Legend color="#16A66A" label="Low" />
            <Legend color="#1463E8" label="Teams" />
            <Legend color="#7C4DFF" label="Shelters" />
          </View>
        </Card>

        <Card style={{ flex: isDesktop ? 1.2 : undefined, padding: 0 }}>
          <View style={styles.cardHead}>
            <Text style={{ color: "#123B78", fontSize: 16, fontWeight: "900" }}>Recent Incidents</Text>
            <Pressable onPress={() => router.push("/incidents")}>
              <Text style={{ color: "#1463E8", fontSize: 13, fontWeight: "700" }}>View all</Text>
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

      {/* Bottom Summary Bar (mockup 03 bottom row) */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
        {[
          { label: "Survivors Registered", val: "1,245", icon: "people-outline", col: "#1463E8" },
          { label: "Volunteers", val: "1,056", icon: "walk-outline", col: "#16A66A" },
          { label: "Resources Available", val: "156", icon: "cube-outline", col: "#FF8A00" },
          { label: "Requests Submitted", val: "32", icon: "document-text-outline", col: "#7C4DFF" },
          { label: "Active Alerts", val: "8", icon: "notifications-outline", col: "#EF3340" },
        ].map((item, idx) => (
          <Card key={idx} style={{ flexBasis: isDesktop ? "18%" : "46%", flexGrow: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: item.col + "16", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={item.icon as any} size={18} color={item.col} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.2 }} numberOfLines={1}>{item.label}</Text>
              <Text style={{ color: "#123B78", fontSize: 16, fontWeight: "900", marginTop: 2 }}>{item.val}</Text>
            </View>
          </Card>
        ))}
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
