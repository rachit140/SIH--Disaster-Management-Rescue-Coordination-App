import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { Card, StatusBadge } from "@/src/components/ui";
import { statusColor } from "@/src/lib/status";
import { Meta } from "./survivors";

const PRIO_ICON: Record<string, string> = { Critical: "alert-circle", High: "warning", Warning: "alert", Information: "information-circle" };

export default function Alerts() {
  const { c } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => { try { setItems(await api.alerts()); } catch {} setLoading(false); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (a: any, status: string) => { await api.updateAlert(a.id, status); load(); };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} testID="alerts-screen" showsVerticalScrollIndicator={false}>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>Alerts</Text>
        {loading ? <ActivityIndicator color={c.blue} style={{ marginTop: 30 }} /> : items.map((a) => {
          const col = a.priority === "Information" ? c.blue : statusColor(c, a.priority);
          return (
            <Card key={a.id} testID={`alert-${a.id}`} style={{ borderLeftWidth: 4, borderLeftColor: col }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <Ionicons name={(PRIO_ICON[a.priority] || "notifications") as any} size={22} color={col} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <Text style={{ color: c.text, fontSize: 16, fontWeight: "800", flex: 1 }}>{a.title}</Text>
                    <StatusBadge label={a.status} />
                  </View>
                  <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 6, lineHeight: 19 }}>{a.description}</Text>
                  <View style={{ gap: 3, marginTop: 8 }}>
                    <Meta icon="location-outline" text={`${a.area} · ${a.region}`} />
                    <Meta icon="time-outline" text={`${a.time} · Source: ${a.source}`} />
                    <Meta icon="flag-outline" text={`${a.priority} priority`} />
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {a.status !== "Acknowledged" && a.status !== "Resolved" && <AlertBtn testID={`ack-${a.id}`} icon="checkmark-outline" label="Acknowledge" onPress={() => act(a, "Acknowledged")} />}
                <AlertBtn testID={`broadcast-${a.id}`} icon="megaphone-outline" label="Broadcast" onPress={() => act(a, a.status === "Resolved" ? a.status : "Active")} />
                {a.status !== "Resolved" && <AlertBtn testID={`resolve-${a.id}`} icon="checkmark-done-outline" label="Resolve" primary onPress={() => act(a, "Resolved")} />}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

function AlertBtn({ icon, label, onPress, primary, testID }: any) {
  const { c } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 9, backgroundColor: primary ? c.blue : c.surface, borderWidth: primary ? 0 : 1, borderColor: c.border }}>
      <Ionicons name={icon} size={15} color={primary ? "#fff" : c.text} />
      <Text style={{ color: primary ? "#fff" : c.text, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({});
