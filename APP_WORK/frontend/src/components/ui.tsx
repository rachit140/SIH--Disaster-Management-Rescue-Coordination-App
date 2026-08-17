import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { statusColor, statusSoft } from "@/src/lib/status";

// ---- Brand logo (bridge = connection / support) ----
export function Logo({ size = 40, showText = true, subtitle = false, light = false }: { size?: number; showText?: boolean; subtitle?: boolean; light?: boolean }) {
  const { c } = useTheme();
  const textColor = light ? "#FFFFFF" : c.text;
  const subColor = light ? "rgba(255,255,255,0.8)" : c.textMuted;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: c.navy, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name="bridge" size={size * 0.6} color="#FFFFFF" />
      </View>
      {showText && (
        <View>
          <Text style={{ color: textColor, fontSize: size * 0.5, fontWeight: "900", letterSpacing: 0.5 }}>SAHAYSETU</Text>
          {subtitle && <Text style={{ color: subColor, fontSize: 11, marginTop: 2 }}>Disaster Response & Rescue Coordination</Text>}
        </View>
      )}
    </View>
  );
}

export function Button({ title, onPress, variant = "primary", icon, loading, testID, full = true, color }: any) {
  const { c } = useTheme();
  const bg = variant === "primary" ? c.blue : variant === "danger" ? c.red : variant === "outline" ? "transparent" : c.blueSoft;
  const fg = variant === "outline" ? c.text : variant === "soft" ? c.blue : "#FFFFFF";
  return (
    <Pressable
      testID={testID}
      onPress={loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: color || bg, borderColor: variant === "outline" ? c.border : "transparent", borderWidth: variant === "outline" ? 1 : 0, opacity: pressed ? 0.85 : 1, width: full ? "100%" : undefined },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={{ color: fg, fontWeight: "700", fontSize: 15 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, icon, testID, autoCapitalize = "none", right }: any) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      {label && <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>{label}</Text>}
      <View style={[styles.inputWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}>
        {icon && <Ionicons name={icon} size={18} color={c.textMuted} />}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[styles.input, { color: c.text }]}
        />
        {right}
      </View>
    </View>
  );
}

export function SelectMenu({ label, value, options, onChange }: any) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      {label && <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>{label}</Text>}
      <Pressable testID={`select-${label}`} onPress={() => setOpen((v) => !v)} style={{ minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.inputBg, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14 }}>
        <Text style={{ color: c.text, fontSize: 15 }}>{value}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} />
      </Pressable>
      {open && (
        <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10, overflow: "hidden" }}>
          {options.map((opt: string) => (
            <Pressable key={opt} testID={`option-${opt}`} onPress={() => { onChange(opt); setOpen(false); }} style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.divider }}>
              <Text style={{ color: value === opt ? c.blue : c.text, fontSize: 15, fontWeight: value === opt ? "700" : "400" }}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function Card({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle; testID?: string }) {
  const { c } = useTheme();
  return <View testID={testID} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}

export function SeverityPill({ level }: { level: string }) {
  const { c } = useTheme();
  const map: Record<string, [string, string]> = {
    High: [c.red, c.redSoft],
    Medium: [c.orange, c.orangeSoft],
    Low: [c.green, c.greenSoft],
    Resolved: [c.textMuted, c.divider],
    Active: [c.blue, c.blueSoft],
  };
  const [fg, bg] = map[level] || [c.textMuted, c.divider];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>{level.toUpperCase()}</Text>
    </View>
  );
}

export function Avatar({ name, size = 36, uri }: { name: string; size?: number; uri?: string }) {
  const { c } = useTheme();
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: c.blue, fontWeight: "800", fontSize: size * 0.4 }}>{initials || "U"}</Text>
    </View>
  );
}

export function ComingSoon({ title, icon = "construct-outline" }: { title: string; icon?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 14 }}>
      <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as any} size={34} color={c.blue} />
      </View>
      <Text style={{ color: c.text, fontSize: 20, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: c.textMuted, fontSize: 14, textAlign: "center", maxWidth: 320 }}>
        This module is part of SAHAYSETU and will be built out in a follow-up. Navigation and layout are ready.
      </Text>
    </View>
  );
}

export function StatusBadge({ label }: { label: string }) {
  const { c } = useTheme();
  const fg = statusColor(c, label);
  const bg = statusSoft(c, label);
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: "800", letterSpacing: 0.4 }}>{(label || "").toUpperCase()}</Text>
    </View>
  );
}

export function StatCard({ value, label, icon, color }: { value: any; label: string; icon: string; color: string }) {
  const { c } = useTheme();
  return (
    <Card style={{ flexBasis: 150, flexGrow: 1, minWidth: 130 }}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: color + "1F", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={{ color: c.text, fontSize: 24, fontWeight: "900", marginTop: 10 }}>{typeof value === "number" ? value.toLocaleString() : value}</Text>
      <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 50, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18 },
  inputWrap: { minHeight: 50, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 18 },
});
