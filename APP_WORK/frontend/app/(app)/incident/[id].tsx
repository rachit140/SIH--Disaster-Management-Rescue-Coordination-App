import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { Card, SeverityPill } from "@/src/components/ui";
import { LeafletMap } from "@/src/components/LeafletMap";
import { sevColor, typeIcon } from "@/src/lib/incidentMeta";
import { useResponsive } from "@/src/hooks/useResponsive";

const TABS = ["Overview", "Updates", "Resources", "Teams", "Reports"];

export default function IncidentDetail() {
  const { c, mode } = useTheme();
  const router = useRouter();
  const { isDesktop } = useResponsive(1000);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [inc, setInc] = useState<any>(null);
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.incident(String(id));
      setInc(r);
    } catch {}
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const action = async (label: string, message: string) => {
    try {
      const r = await api.addIncidentUpdate(String(id), message);
      setInc(r);
    } catch {}
  };
  const markResolved = async () => {
    try { setInc(await api.updateIncidentStatus(String(id), "Resolved")); } catch {}
  };
  const addNote = async () => {
    if (!note.trim()) return;
    try { setInc(await api.addIncidentUpdate(String(id), note.trim())); setNote(""); } catch {}
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={c.blue} size="large" /></View>;
  if (!inc) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}><Text style={{ color: c.textMuted }}>Incident not found.</Text></View>;

  const col = sevColor(c, inc.severity);
  const stats = [
    { label: "People Affected", value: inc.people_affected, icon: "people", color: c.orange },
    { label: "Rescued", value: inc.rescued, icon: "checkmark-done", color: c.green },
    { label: "Volunteers", value: inc.volunteers, icon: "hand-left", color: c.blue },
    { label: "Teams Deployed", value: inc.teams_deployed, icon: "shield-checkmark", color: c.red },
    { label: "Resources Used", value: inc.resources_used, icon: "cube", color: c.purple },
  ];

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false} testID="incident-detail">
      <Pressable testID="incident-back" onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name="arrow-back" size={20} color={c.textMuted} />
        <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: "600" }}>Back to Incidents</Text>
      </Pressable>

      {/* Header */}
      <Card>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
          <View style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: col + "1F", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={typeIcon(inc.type) as any} size={28} color={col} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>{inc.title}</Text>
              <SeverityPill level={inc.status === "Resolved" ? "Resolved" : `${inc.severity} Priority`.split(" ")[0]} />
            </View>
            <View style={{ flexDirection: "row", gap: 18, flexWrap: "wrap" }}>
              <Info icon="location-outline" text={`${inc.location}, ${inc.region}`} />
              <Info icon="time-outline" text={`${inc.time} Today`} />
              <Info icon="pulse-outline" text={inc.status} />
            </View>
          </View>
        </View>
      </Card>

      {/* Action buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        <ActionBtn testID="act-update" icon="create-outline" label="Update Status" onPress={() => action("update", "Status reviewed by coordinator")} />
        <ActionBtn testID="act-deploy" icon="shield-checkmark-outline" label="Deploy Team" onPress={() => action("deploy", "Additional rescue team deployed")} />
        <ActionBtn testID="act-resources" icon="cube-outline" label="Request Resources" onPress={() => action("resources", "Resource resupply requested")} />
        <ActionBtn testID="act-alert" icon="megaphone-outline" label="Send Alert" onPress={() => action("alert", "Public safety alert issued")} />
        <ActionBtn testID="act-resolve" icon="checkmark-circle-outline" label="Mark Resolved" danger onPress={markResolved} />
      </ScrollView>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            testID={`tab-${t}`}
            onPress={() => setTab(t)}
            style={{ flexShrink: 0, height: 38, paddingHorizontal: 16, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tab === t ? c.blue : c.surface, borderWidth: 1, borderColor: tab === t ? c.blue : c.border }}
          >
            <Text style={{ color: tab === t ? "#fff" : c.textMuted, fontWeight: "700", fontSize: 13 }}>{t}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === "Overview" && (
        <View style={{ gap: 16, flexDirection: isDesktop ? "row" : "column" }}>
          <View style={{ flex: isDesktop ? 1 : undefined, gap: 16 }}>
            <Card>
              <Text style={[styles.h, { color: c.text }]}>Description</Text>
              <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8 }}>{inc.description}</Text>
            </Card>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {stats.map((s) => (
                <Card key={s.label} style={{ flexBasis: "47%", flexGrow: 1 }}>
                  <Ionicons name={s.icon as any} size={20} color={s.color} />
                  <Text style={{ color: c.text, fontSize: 24, fontWeight: "900", marginTop: 8 }}>{Number(s.value).toLocaleString()}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>{s.label}</Text>
                </Card>
              ))}
            </View>
          </View>
          <View style={{ flex: isDesktop ? 1 : undefined, gap: 16 }}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <Text style={[styles.h, { color: c.text, padding: 16, paddingBottom: 8 }]}>Live Location</Text>
              <LeafletMap markers={[{ lat: inc.latitude, lng: inc.longitude, color: col, r: 12, title: inc.title, sub: inc.location }]} center={[inc.latitude, inc.longitude]} zoom={11} dark={mode === "dark"} height={300} />
            </Card>
            <Card>
              <Text style={[styles.h, { color: c.text }]}>Current Status</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: inc.status === "Resolved" ? c.green : col }} />
                <Text style={{ color: c.text, fontSize: 15, fontWeight: "700" }}>{inc.status}</Text>
              </View>
            </Card>
          </View>
        </View>
      )}

      {tab === "Updates" && (
        <Card>
          <Text style={[styles.h, { color: c.text }]}>Timeline</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TextInput testID="update-input" value={note} onChangeText={setNote} placeholder="Add a situation update…" placeholderTextColor={c.textMuted} style={{ flex: 1, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, borderRadius: 10, color: c.text, paddingHorizontal: 12, minHeight: 44 }} />
            <Pressable testID="update-send" onPress={addNote} style={{ width: 48, borderRadius: 10, backgroundColor: c.blue, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
          <View style={{ marginTop: 16, gap: 14 }}>
            {[...(inc.updates || [])].reverse().map((u: any, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ alignItems: "center" }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.blue, marginTop: 4 }} />
                  {i < inc.updates.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: c.border, marginTop: 2 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 6 }}>
                  <Text style={{ color: c.text, fontSize: 14, fontWeight: "600" }}>{u.message}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{u.author} • {u.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}

      {(tab === "Resources" || tab === "Teams" || tab === "Reports") && (
        <Card>
          <View style={{ alignItems: "center", padding: 20, gap: 10 }}>
            <Ionicons name={tab === "Resources" ? "cube-outline" : tab === "Teams" ? "shield-checkmark-outline" : "document-text-outline"} size={34} color={c.blue} />
            <Text style={{ color: c.text, fontWeight: "800", fontSize: 16 }}>{tab}</Text>
            <Text style={{ color: c.textMuted, fontSize: 13, textAlign: "center" }}>
              {tab === "Resources" ? `${inc.resources_used} resource units allocated to this incident.` : tab === "Teams" ? `${inc.teams_deployed} rescue team(s) currently deployed.` : "Detailed reporting for this incident will appear here."}
            </Text>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

function Info({ icon, text }: { icon: string; text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Ionicons name={icon as any} size={15} color={c.textMuted} />
      <Text style={{ color: c.textMuted, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, danger, testID }: any) {
  const { c } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={{ flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 7, height: 42, paddingHorizontal: 16, borderRadius: 10, backgroundColor: danger ? c.red : c.blueSoft }}>
      <Ionicons name={icon} size={17} color={danger ? "#fff" : c.blue} />
      <Text style={{ color: danger ? "#fff" : c.blue, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({ h: { fontSize: 16, fontWeight: "800" } });
