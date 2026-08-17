import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { Card, Button } from "@/src/components/ui";

export default function Settings() {
  const { c, mode, setMode } = useTheme();
  const { logout } = useAuth();
  const [notif, setNotif] = useState(true);
  const [offline, setOffline] = useState(true);
  const [sound, setSound] = useState(false);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 720, width: "100%", alignSelf: "center" }} testID="settings-screen">
      <Card>
        <Text style={[styles.h, { color: c.text }]}>Appearance</Text>
        <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4 }}>Choose how SAHAYSETU looks. Light mode is optimised for projectors and bright rooms.</Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          {(["light", "dark"] as const).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                testID={`theme-${m}`}
                onPress={() => setMode(m)}
                style={[styles.themeCard, { borderColor: active ? c.blue : c.border, backgroundColor: m === "light" ? "#FFFFFF" : "#0D1420" }]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Ionicons name={m === "light" ? "sunny" : "moon"} size={20} color={m === "light" ? "#FF8A00" : "#1463E8"} />
                  {active && <Ionicons name="checkmark-circle" size={20} color={c.blue} />}
                </View>
                <Text style={{ color: m === "light" ? "#172033" : "#E8EEF7", fontWeight: "800", marginTop: 20, textTransform: "capitalize" }}>{m} Mode</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={[styles.h, { color: c.text }]}>Notifications & Sync</Text>
        <Row label="Push notifications" desc="Critical incident alerts" value={notif} onChange={setNotif} c={c} />
        <Row label="Offline data sync" desc="Cache data for offline access" value={offline} onChange={setOffline} c={c} />
        <Row label="Alert sounds" desc="Play a sound for high-priority alerts" value={sound} onChange={setSound} c={c} last />
      </Card>

      <Button testID="settings-logout" title="Sign Out" onPress={logout} variant="danger" icon="log-out-outline" />
    </ScrollView>
  );
}

function Row({ label, desc, value, onChange, c, last }: any) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.divider }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 15, fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.blue, false: c.border }} thumbColor="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 17, fontWeight: "800" },
  themeCard: { flex: 1, borderRadius: 14, borderWidth: 2, padding: 16, minHeight: 96 },
});
