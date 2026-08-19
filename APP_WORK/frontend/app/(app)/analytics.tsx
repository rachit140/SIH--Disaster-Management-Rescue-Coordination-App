import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { Card } from "@/src/components/ui";
import { BarChart, LineChart, DonutChart, ProgressBar } from "@/src/components/charts";
import { ChipRow } from "./survivors";
import { useResponsive } from "@/src/hooks/useResponsive";

const RANGES = ["today", "7d", "30d", "custom"];
const RANGE_LABEL: Record<string, string> = { today: "Today", "7d": "7 Days", "30d": "30 Days", custom: "Custom" };

export default function Analytics() {
  const { c } = useTheme();
  const { isDesktop } = useResponsive(1000);
  const [range, setRange] = useState("7d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.analytics(range === "custom" ? "30d" : range)); } catch {}
    setLoading(false);
  }, [range]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const palette = [c.blue, c.orange, c.green, c.red, c.purple, c.navy];
  const half = isDesktop ? { flexBasis: "47%" as any, flexGrow: 1 } : { width: "100%" as any };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} testID="analytics-screen" showsVerticalScrollIndicator={false}>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>Analytics</Text>
        <ChipRow items={RANGES.map((r) => RANGE_LABEL[r])} value={RANGE_LABEL[range]} onChange={(label) => setRange(RANGES.find((r) => RANGE_LABEL[r] === label) || "7d")} />

        {loading || !data ? <ActivityIndicator color={c.blue} style={{ marginTop: 40 }} /> : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <Mini label="Rescue Completion" value={`${data.rescue_completion_rate}%`} color={c.green} />
              <Mini label="People Affected" value={Number(data.people_affected).toLocaleString()} color={c.orange} />
              <Mini label="Active Severity" value={data.severity_distribution.reduce((s: number, x: any) => s + x.value, 0)} color={c.red} />
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              <Card style={half}>
                <Text style={[styles.h, { color: c.text }]}>Incidents Over Time</Text>
                <View style={{ marginTop: 12 }}><BarChart data={data.incidents_over_time} color={c.blue} /></View>
              </Card>
              <Card style={half}>
                <Text style={[styles.h, { color: c.text }]}>Avg Response Time (min)</Text>
                <View style={{ marginTop: 12 }}><LineChart data={data.response_time} color={c.green} /></View>
              </Card>
              <Card style={half}>
                <Text style={[styles.h, { color: c.text }]}>Incident Severity</Text>
                <View style={{ marginTop: 12 }}><DonutChart data={data.severity_distribution} colors={[c.red, c.orange, c.green]} /></View>
              </Card>
              <Card style={half}>
                <Text style={[styles.h, { color: c.text }]}>Volunteer Distribution</Text>
                <View style={{ marginTop: 12 }}><DonutChart data={data.volunteer_distribution} colors={palette} /></View>
              </Card>
              <Card style={half}>
                <Text style={[styles.h, { color: c.text }]}>Regional Response (people affected)</Text>
                <View style={{ marginTop: 12 }}><BarChart data={data.regional_response} color={c.purple} /></View>
              </Card>
              <Card style={half}>
                <Text style={[styles.h, { color: c.text }]}>Resource Utilization</Text>
                <View style={{ marginTop: 12, gap: 12 }}>
                  {data.resource_utilization.map((r: any) => (
                    <View key={r.label}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ color: c.text, fontSize: 13, fontWeight: "600" }}>{r.label}</Text>
                        <Text style={{ color: c.textMuted, fontSize: 12 }}>{r.allocated}/{r.available}</Text>
                      </View>
                      <ProgressBar value={r.allocated} max={r.available} color={c.blue} />
                    </View>
                  ))}
                </View>
              </Card>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Mini({ label, value, color }: { label: string; value: any; color: string }) {
  const { c } = useTheme();
  return (
    <Card style={{ flexBasis: 150, flexGrow: 1, minWidth: 130 }}>
      <Text style={{ color, fontSize: 26, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({ h: { fontSize: 15, fontWeight: "800" } });
