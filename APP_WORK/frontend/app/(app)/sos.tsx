import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { Card } from "@/src/components/ui";

const CONTACTS = [
  { label: "National Emergency", number: "112", icon: "call", color: "#EF3340" },
  { label: "Disaster Management (NDMA)", number: "1078", icon: "megaphone", color: "#FF8A00" },
  { label: "Ambulance", number: "108", icon: "medkit", color: "#16A66A" },
  { label: "Fire Services", number: "101", icon: "flame", color: "#EF3340" },
  { label: "Police", number: "100", icon: "shield", color: "#1463E8" },
];

export default function Sos() {
  const { c } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 720, width: "100%", alignSelf: "center" }} testID="sos-screen">
      <View style={[styles.hero, { backgroundColor: c.red }]}>
        <Ionicons name="alert-circle" size={40} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 8 }}>Emergency SOS</Text>
        <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, textAlign: "center", marginTop: 4 }}>
          Reach emergency services and response coordinators instantly.
        </Text>
      </View>

      <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>Emergency Contacts</Text>
      {CONTACTS.map((ct) => (
        <Card key={ct.number} testID={`sos-${ct.number}`}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: ct.color + "1F", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={ct.icon as any} size={22} color={ct.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: "700" }}>{ct.label}</Text>
              <Text style={{ color: c.textMuted, fontSize: 13 }}>Dial {ct.number}</Text>
            </View>
            <View style={{ backgroundColor: ct.color, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>{ct.number}</Text>
            </View>
          </View>
        </Card>
      ))}

      <Card>
        <Text style={{ color: c.text, fontWeight: "800", fontSize: 15 }}>Help & Support</Text>
        <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 6, lineHeight: 20 }}>
          For platform assistance, contact your regional coordinator or the SAHAYSETU control room. In a life-threatening emergency, always call 112 first.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 16, padding: 24, alignItems: "center" },
});
