import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { Card, StatusBadge, Button, Input, SelectMenu } from "@/src/components/ui";
import { Meta } from "./survivors";

export default function Requests() {
  const { c } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ resource_type: "Drinking Water", quantity: "", location: "", priority: "High", required_by: "", notes: "" });

  const load = useCallback(async () => { try { setItems(await api.requests()); } catch {} setLoading(false); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    if (!form.location || !form.quantity) return;
    await api.createRequest({ ...form, quantity: Number(form.quantity) || 1 });
    setModal(false);
    setForm({ resource_type: "Drinking Water", quantity: "", location: "", priority: "High", required_by: "", notes: "" });
    load();
  };
  const advance = async (r: any) => {
    const flow: Record<string, string> = { Pending: "Approved", Approved: "In Transit", "In Transit": "Delivered" };
    const next = flow[r.status];
    if (next) { await api.updateRequest(r.id, next); load(); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} testID="requests-screen" showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>Resource Requests</Text>
          <View style={{ maxWidth: 200 }}><Button testID="new-request" title="New Request" icon="add" onPress={() => setModal(true)} full={false} /></View>
        </View>

        {loading ? <ActivityIndicator color={c.blue} style={{ marginTop: 30 }} /> : items.map((r) => (
          <Card key={r.id} testID={`request-${r.id}`}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>{r.quantity.toLocaleString()} × {r.resource_type}</Text>
              <StatusBadge label={r.status} />
            </View>
            <View style={{ gap: 4, marginTop: 8 }}>
              <Meta icon="location-outline" text={r.location} />
              <Meta icon="flag-outline" text={`Priority: ${r.priority}${r.required_by ? ` · By ${r.required_by}` : ""}`} />
              <Meta icon="person-outline" text={r.requester} />
              {!!r.notes && <Meta icon="document-text-outline" text={r.notes} />}
            </View>
            {["Pending", "Approved", "In Transit"].includes(r.status) && (
              <Pressable testID={`advance-${r.id}`} onPress={() => advance(r)} style={{ marginTop: 12, height: 40, borderRadius: 10, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                <Ionicons name="arrow-forward-circle-outline" size={17} color={c.blue} />
                <Text style={{ color: c.blue, fontWeight: "700", fontSize: 13 }}>Advance to {r.status === "Pending" ? "Approved" : r.status === "Approved" ? "In Transit" : "Delivered"}</Text>
              </Pressable>
            )}
          </Card>
        ))}
      </ScrollView>

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <View style={[styles.overlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: c.card }]}>
            <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={{ color: c.text, fontSize: 20, fontWeight: "900" }}>New Resource Request</Text>
              <SelectMenu label="Resource Type" value={form.resource_type} options={["Drinking Water", "Food Packets", "First Aid Kits", "Family Tents", "Generators", "Ambulances", "Rescue Boats"]} onChange={(v: string) => setForm({ ...form, resource_type: v })} />
              <Input label="Quantity" testID="rq-qty" value={form.quantity} onChangeText={(v: string) => setForm({ ...form, quantity: v })} placeholder="e.g. 500" keyboardType="number-pad" />
              <Input label="Location" testID="rq-location" value={form.location} onChangeText={(v: string) => setForm({ ...form, location: v })} placeholder="Delivery location" autoCapitalize="words" />
              <SelectMenu label="Priority" value={form.priority} options={["Low", "Medium", "High", "Critical"]} onChange={(v: string) => setForm({ ...form, priority: v })} />
              <Input label="Required By" testID="rq-by" value={form.required_by} onChangeText={(v: string) => setForm({ ...form, required_by: v })} placeholder="e.g. Today 6 PM" autoCapitalize="none" />
              <Input label="Additional Notes" testID="rq-notes" value={form.notes} onChangeText={(v: string) => setForm({ ...form, notes: v })} placeholder="Optional" autoCapitalize="none" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}><Button title="Cancel" variant="outline" onPress={() => setModal(false)} /></View>
                <View style={{ flex: 1 }}><Button testID="rq-submit" title="Submit" onPress={submit} /></View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  sheet: { width: "100%", maxWidth: 460, maxHeight: "88%", borderRadius: 16, padding: 20 },
});
