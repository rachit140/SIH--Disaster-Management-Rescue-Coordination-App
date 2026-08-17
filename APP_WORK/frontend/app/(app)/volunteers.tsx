import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { Card, StatCard, StatusBadge } from "@/src/components/ui";
import { Meta } from "./survivors";

export default function Volunteers() {
  const { c } = useTheme();
  const [data, setData] = useState<any>({ items: [], counts: {} });
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => { try { const r = await api.volunteers(); if (alive) setData(r); } catch {} if (alive) setLoading(false); })();
    return () => { alive = false; };
  }, []));

  const k = data.counts || {};
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} testID="volunteers-screen" showsVerticalScrollIndicator={false}>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>Volunteers</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <StatCard value={k.total || 0} label="Total Volunteers" icon="people" color={c.blue} />
          <StatCard value={k.on_field || 0} label="On Field" icon="walk" color={c.green} />
          <StatCard value={k.available || 0} label="Available" icon="checkmark-circle" color={c.purple} />
          <StatCard value={k.assigned || 0} label="Assigned" icon="clipboard" color={c.orange} />
          <StatCard value={k.offline || 0} label="Offline" icon="power" color={c.textMuted} />
        </View>

        {loading ? <ActivityIndicator color={c.blue} style={{ marginTop: 30 }} /> : data.items.map((v: any) => (
          <Card key={v.id} testID={`volunteer-${v.id}`}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.greenSoft, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: c.green, fontWeight: "800" }}>{v.name.split(" ").map((x: string) => x[0]).slice(0, 2).join("")}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>{v.name}</Text>
                  <Text style={{ color: c.blue, fontSize: 13, fontWeight: "700" }}>{v.role}</Text>
                  <StatusBadge label={v.status} />
                </View>
                <Meta icon="location-outline" text={v.location} />
                <Meta icon="briefcase-outline" text={v.current_assignment || "No active assignment"} />
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                  {(v.skills || []).map((s: string) => (
                    <View key={s} style={{ backgroundColor: c.divider, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: "600" }}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <ActBtn testID={`assign-${v.id}`} icon="person-add-outline" label="Assign" primary />
              <ActBtn testID={`contact-${v.id}`} icon="call-outline" label="Contact" />
              <ActBtn testID={`track-${v.id}`} icon="navigate-outline" label="Track" />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

function ActBtn({ icon, label, primary, testID }: any) {
  const { c } = useTheme();
  return (
    <Pressable testID={testID} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 10, backgroundColor: primary ? c.blue : c.surface, borderWidth: primary ? 0 : 1, borderColor: c.border }}>
      <Ionicons name={icon} size={16} color={primary ? "#fff" : c.text} />
      <Text style={{ color: primary ? "#fff" : c.text, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({});
