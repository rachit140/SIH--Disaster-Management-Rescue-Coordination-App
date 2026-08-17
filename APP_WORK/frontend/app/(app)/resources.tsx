import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { Card, StatusBadge } from "@/src/components/ui";
import { ProgressBar } from "@/src/components/charts";
import { ChipRow, Meta } from "./survivors";

const CATS = ["All", "Medical", "Food", "Water", "Shelter", "Equipment", "Vehicles", "Generators", "Boats"];
const CAT_ICON: Record<string, string> = { Medical: "medkit", Food: "fast-food", Water: "water", Shelter: "home", Equipment: "construct", Vehicles: "car", Generators: "flash", Boats: "boat" };

export default function Resources() {
  const { c } = useTheme();
  const [cat, setCat] = useState("All");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setItems(await api.resources(cat)); } catch {}
    setLoading(false);
  }, [cat]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} testID="resources-screen" showsVerticalScrollIndicator={false}>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>Resources</Text>
        <ChipRow items={CATS} value={cat} onChange={setCat} />
        {loading ? <ActivityIndicator color={c.blue} style={{ marginTop: 30 }} /> : items.map((r) => {
          const remaining = r.available - r.allocated;
          const col = r.status === "Critical" ? c.red : r.status === "Low Stock" ? c.orange : c.green;
          return (
            <Card key={r.id} testID={`resource-${r.id}`}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={(CAT_ICON[r.category] || "cube") as any} size={20} color={c.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>{r.name}</Text>
                    <StatusBadge label={r.status} />
                  </View>
                  <Meta icon="location-outline" text={`${r.location} · Updated ${r.last_updated}`} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>Available <Text style={{ color: c.text, fontWeight: "800" }}>{remaining.toLocaleString()}</Text></Text>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>Allocated <Text style={{ color: c.text, fontWeight: "800" }}>{r.allocated.toLocaleString()}</Text> / {r.available.toLocaleString()}</Text>
                  </View>
                  <View style={{ marginTop: 6 }}><ProgressBar value={r.allocated} max={r.available} color={col} /></View>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {["Request", "Allocate", "Transfer", "Update Stock"].map((a, i) => (
                  <Pressable key={a} testID={`res-${a.replace(" ", "-").toLowerCase()}-${r.id}`} style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 36, paddingHorizontal: 12, borderRadius: 9, backgroundColor: i === 0 ? c.blueSoft : c.surface, borderWidth: i === 0 ? 0 : 1, borderColor: c.border }}>
                    <Text style={{ color: i === 0 ? c.blue : c.text, fontWeight: "700", fontSize: 12 }}>{a}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
