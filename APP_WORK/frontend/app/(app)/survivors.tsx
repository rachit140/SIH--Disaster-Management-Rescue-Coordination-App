import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { Card, StatCard, StatusBadge, Button, Input, SelectMenu } from "@/src/components/ui";

const STATUS = ["All", "Pending", "Rescued", "Missing", "Safe"];
const PRIORITY = ["All", "Critical", "High", "Medium", "Low"];

export default function Survivors() {
  const { c } = useTheme();
  const [data, setData] = useState<any>({ items: [], counts: {} });
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ name: "", age: "", location: "", emergency_type: "Flood", priority: "High", contact: "" });

  const load = useCallback(async () => {
    try { setData(await api.survivors({ status, priority, search })); } catch {}
    setLoading(false);
  }, [status, priority, search]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    if (!form.name || !form.location) return;
    await api.addSurvivor({ ...form, age: Number(form.age) || 0 });
    setModal(false);
    setForm({ name: "", age: "", location: "", emergency_type: "Flood", priority: "High", contact: "" });
    load();
  };

  const counts = data.counts || {};
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} testID="survivors-screen" showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>Survivors</Text>
          <View style={{ maxWidth: 180 }}>
            <Button testID="add-survivor" title="Add Survivor" icon="add" onPress={() => setModal(true)} full={false} />
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <StatCard value={counts.total || 0} label="Total Survivors" icon="people" color={c.blue} />
          <StatCard value={counts.pending || 0} label="Pending Assistance" icon="time" color={c.orange} />
          <StatCard value={counts.rescued || 0} label="Rescued" icon="checkmark-done" color={c.green} />
          <StatCard value={counts.missing || 0} label="Missing" icon="help-buoy" color={c.red} />
          <StatCard value={counts.safe || 0} label="Safe" icon="shield-checkmark" color={c.purple} />
        </View>

        <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="search" size={18} color={c.textMuted} />
          <TextInput testID="survivor-search" value={search} onChangeText={setSearch} onSubmitEditing={load} placeholder="Search survivors by name or location…" placeholderTextColor={c.textMuted} style={{ flex: 1, color: c.text, paddingVertical: 10 }} />
        </View>
        <ChipRow items={STATUS} value={status} onChange={setStatus} />
        <ChipRow items={PRIORITY} value={priority} onChange={setPriority} />

        {loading ? <ActivityIndicator color={c.blue} style={{ marginTop: 30 }} /> : data.items.map((s: any) => (
          <Card key={s.id} testID={`survivor-${s.id}`}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: c.blue, fontWeight: "800" }}>{s.name.split(" ").map((x: string) => x[0]).slice(0, 2).join("")}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 180, gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>{s.name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>· {s.age} yrs</Text>
                  <StatusBadge label={s.priority} />
                </View>
                <Meta icon="location-outline" text={s.location} />
                <Meta icon="alert-circle-outline" text={`${s.emergency_type}${s.assigned_team ? ` · ${s.assigned_team}` : ""}`} />
                <Meta icon="call-outline" text={s.contact || "No contact"} />
              </View>
              <StatusBadge label={s.status} />
            </View>
          </Card>
        ))}
      </ScrollView>

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <View style={[styles.overlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: c.card }]}>
            <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={{ color: c.text, fontSize: 20, fontWeight: "900" }}>Add Survivor</Text>
              <Input label="Name" testID="sv-name" value={form.name} onChangeText={(v: string) => setForm({ ...form, name: v })} placeholder="Full name" autoCapitalize="words" />
              <Input label="Age" testID="sv-age" value={form.age} onChangeText={(v: string) => setForm({ ...form, age: v })} placeholder="Age" keyboardType="number-pad" />
              <Input label="Location" testID="sv-location" value={form.location} onChangeText={(v: string) => setForm({ ...form, location: v })} placeholder="City, State" autoCapitalize="words" />
              <SelectMenu label="Emergency Type" value={form.emergency_type} options={["Flood", "Earthquake", "Fire", "Landslide", "Cyclone", "Accident"]} onChange={(v: string) => setForm({ ...form, emergency_type: v })} />
              <SelectMenu label="Priority" value={form.priority} options={["Critical", "High", "Medium", "Low"]} onChange={(v: string) => setForm({ ...form, priority: v })} />
              <Input label="Contact" testID="sv-contact" value={form.contact} onChangeText={(v: string) => setForm({ ...form, contact: v })} placeholder="+91…" keyboardType="phone-pad" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}><Button title="Cancel" variant="outline" onPress={() => setModal(false)} /></View>
                <View style={{ flex: 1 }}><Button testID="sv-save" title="Save" onPress={submit} /></View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function ChipRow({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  const { c } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {items.map((s) => {
        const active = value === s;
        return (
          <Pressable key={s} testID={`chip-${s}`} onPress={() => onChange(s)} style={{ flexShrink: 0, height: 36, paddingHorizontal: 15, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: active ? c.blue : c.surface, borderWidth: 1, borderColor: active ? c.blue : c.border }}>
            <Text style={{ color: active ? "#fff" : c.textMuted, fontSize: 13, fontWeight: "700" }}>{s}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Meta({ icon, text }: { icon: string; text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Ionicons name={icon as any} size={13} color={c.textMuted} />
      <Text style={{ color: c.textMuted, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 48, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  sheet: { width: "100%", maxWidth: 460, maxHeight: "88%", borderRadius: 16, padding: 20 },
});
