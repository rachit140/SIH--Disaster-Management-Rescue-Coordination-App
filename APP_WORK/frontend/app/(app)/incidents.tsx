import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { Card, SeverityPill } from "@/src/components/ui";
import { sevColor, typeIcon } from "@/src/lib/incidentMeta";

const SEVERITIES = ["All", "High", "Medium", "Low"];
const STATUSES = ["All", "Active", "Resolved"];

export default function Incidents() {
  const { c } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ search?: string }>();
  const [search, setSearch] = useState(String(params.search || ""));
  const [severity, setSeverity] = useState("All");
  const [status, setStatus] = useState("All");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.incidents({ severity, status, search });
      setItems(r);
    } catch {}
    setLoading(false);
  }, [severity, status, search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Sticky header: search + chips */}
      <View style={{ padding: 20, paddingBottom: 12, gap: 12 }}>
        <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="search" size={18} color={c.textMuted} />
          <TextInput
            testID="incident-search"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            placeholder="Search incidents by title, location or region…"
            placeholderTextColor={c.textMuted}
            style={{ flex: 1, color: c.text, fontSize: 15, paddingVertical: 10 }}
          />
          {!!search && (
            <Pressable onPress={() => { setSearch(""); setTimeout(load, 0); }}>
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {SEVERITIES.map((s) => (
            <Chip key={s} label={s} active={severity === s} onPress={() => setSeverity(s)} />
          ))}
          <View style={{ width: 1, backgroundColor: c.border, marginHorizontal: 4 }} />
          {STATUSES.map((s) => (
            <Chip key={s} label={s} active={status === s} onPress={() => setStatus(s)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 12 }} showsVerticalScrollIndicator={false} testID="incidents-list">
        {loading ? (
          <ActivityIndicator color={c.blue} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 40 }}>No incidents match your filters.</Text>
        ) : (
          items.map((inc) => (
            <Pressable key={inc.id} testID={`incident-${inc.id}`} onPress={() => router.push(`/incident/${inc.id}`)}>
              <Card>
                <View style={{ flexDirection: "row", gap: 14 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: sevColor(c, inc.severity) + "1F", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={typeIcon(inc.type) as any} size={24} color={sevColor(c, inc.severity)} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: "800", flex: 1 }} numberOfLines={1}>{inc.title}</Text>
                      <SeverityPill level={inc.status === "Resolved" ? "Resolved" : inc.severity} />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name="location-outline" size={14} color={c.textMuted} />
                      <Text style={{ color: c.textMuted, fontSize: 13 }}>{inc.location}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
                      <Meta icon="people-outline" text={`${inc.people_affected} affected`} />
                      <Meta icon="checkmark-done-outline" text={`${inc.rescued} rescued`} />
                      <Meta icon="time-outline" text={inc.time} />
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      testID={`chip-${label}`}
      onPress={onPress}
      style={{ flexShrink: 0, height: 36, paddingHorizontal: 16, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: active ? c.blue : c.surface, borderWidth: 1, borderColor: active ? c.blue : c.border }}
    >
      <Text style={{ color: active ? "#fff" : c.textMuted, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: string; text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name={icon as any} size={13} color={c.textMuted} />
      <Text style={{ color: c.textMuted, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 48, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
});
