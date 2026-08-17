import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { api } from "@/src/api";
import { Card, Button, Avatar, Input } from "@/src/components/ui";

const ACTIVITY = [
  { icon: "checkmark-done", text: "Marked incident INC-1000 status updated", time: "10 min ago" },
  { icon: "shield-checkmark", text: "Deployed NDRF Team Alpha to Sector 3", time: "1 hour ago" },
  { icon: "cube", text: "Approved water resupply request REQ-5001", time: "2 hours ago" },
  { icon: "document-text", text: "Submitted Daily Situation Report", time: "Yesterday" },
];

export default function Profile() {
  const { c } = useTheme();
  const { logout } = useAuth();
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => { try { const r = await api.getProfile(); setP(r); setForm(r); } catch {} setLoading(false); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    const r = await api.updateProfile({ name: form.name, phone: form.phone, organization: form.organization, location: form.location });
    setP({ ...p, ...r, phone: form.phone, organization: form.organization, location: form.location });
    setModal(false);
  };

  if (loading || !p) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={c.blue} size="large" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 760, width: "100%", alignSelf: "center" }} testID="profile-screen" showsVerticalScrollIndicator={false}>
        <Card>
          <View style={{ alignItems: "center", gap: 12 }}>
            <Avatar name={p.name || "User"} size={84} />
            <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>{p.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.green }} />
              <Text style={{ color: c.textMuted, fontSize: 14, textTransform: "capitalize" }}>{(p.role || "member").replace("_", " ")} · Online</Text>
            </View>
            <View style={{ maxWidth: 200, width: "100%" }}><Button testID="edit-profile" title="Edit Profile" icon="create-outline" variant="soft" onPress={() => { setForm(p); setModal(true); }} /></View>
          </View>
        </Card>

        <Card>
          <Field icon="mail-outline" label="Email" value={p.email} c={c} />
          <Field icon="call-outline" label="Phone" value={p.phone || "Not set"} c={c} />
          <Field icon="business-outline" label="Organization" value={p.organization} c={c} />
          <Field icon="location-outline" label="Location" value={p.location} c={c} />
          <Field icon="calendar-outline" label="Joined" value={p.joined} c={c} />
          <Field icon="shield-checkmark-outline" label="Emergency Permissions" value="Full access · Deploy, Approve, Broadcast" c={c} last />
        </Card>

        <Card>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: "800", marginBottom: 6 }}>Activity History</Text>
          {ACTIVITY.map((a, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10, borderBottomWidth: i === ACTIVITY.length - 1 ? 0 : 1, borderBottomColor: c.divider }}>
              <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={a.icon as any} size={16} color={c.blue} />
              </View>
              <Text style={{ color: c.text, fontSize: 14, flex: 1 }}>{a.text}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{a.time}</Text>
            </View>
          ))}
        </Card>

        <Button testID="profile-logout" title="Sign Out" onPress={logout} variant="danger" icon="log-out-outline" />
      </ScrollView>

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <View style={[styles.overlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: c.card }]}>
            <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={{ color: c.text, fontSize: 20, fontWeight: "900" }}>Edit Profile</Text>
              <Input label="Name" testID="ep-name" value={form.name} onChangeText={(v: string) => setForm({ ...form, name: v })} autoCapitalize="words" />
              <Input label="Phone" testID="ep-phone" value={form.phone} onChangeText={(v: string) => setForm({ ...form, phone: v })} keyboardType="phone-pad" placeholder="+91…" />
              <Input label="Organization" testID="ep-org" value={form.organization} onChangeText={(v: string) => setForm({ ...form, organization: v })} autoCapitalize="words" />
              <Input label="Location" testID="ep-location" value={form.location} onChangeText={(v: string) => setForm({ ...form, location: v })} autoCapitalize="words" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}><Button title="Cancel" variant="outline" onPress={() => setModal(false)} /></View>
                <View style={{ flex: 1 }}><Button testID="ep-save" title="Save" onPress={save} /></View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ icon, label, value, c, last }: any) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.divider }}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={18} color={c.blue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.textMuted, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: c.text, fontSize: 15, fontWeight: "600", marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  sheet: { width: "100%", maxWidth: 440, maxHeight: "88%", borderRadius: 16, padding: 20 },
});
