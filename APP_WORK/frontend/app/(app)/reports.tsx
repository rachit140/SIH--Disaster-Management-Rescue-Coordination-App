import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { Card } from "@/src/components/ui";

export default function Reports() {
  const { c } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => { try { const r = await api.reports(); if (alive) setItems(r); } catch {} if (alive) setLoading(false); })();
    return () => { alive = false; };
  }, []));

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} testID="reports-screen" showsVerticalScrollIndicator={false}>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>Reports</Text>
        <Text style={{ color: c.textMuted, fontSize: 14 }}>Generate, view and export operational reports.</Text>
        {loading ? <ActivityIndicator color={c.blue} style={{ marginTop: 30 }} /> : items.map((r) => (
          <Card key={r.id} testID={`report-${r.id}`}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={r.icon as any} size={22} color={c.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>{r.title}</Text>
                <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>{r.desc}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>{r.count.toLocaleString()} records · Updated {r.updated}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {[["View", "eye-outline"], ["Download", "download-outline"], ["Export PDF", "document-outline"], ["Export CSV", "grid-outline"]].map(([label, icon], i) => (
                <Pressable key={label} testID={`report-${label.replace(" ", "-").toLowerCase()}-${r.id}`} onPress={() => flash(`${label}: ${r.title} ready`)} style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 36, paddingHorizontal: 12, borderRadius: 9, backgroundColor: i === 0 ? c.blueSoft : c.surface, borderWidth: i === 0 ? 0 : 1, borderColor: c.border }}>
                  <Ionicons name={icon as any} size={14} color={i === 0 ? c.blue : c.text} />
                  <Text style={{ color: i === 0 ? c.blue : c.text, fontWeight: "700", fontSize: 12 }}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ))}
      </ScrollView>
      {!!toast && (
        <View style={[styles.toast, { backgroundColor: c.green }]} testID="report-toast">
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700" }}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { position: "absolute", bottom: 24, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
});
