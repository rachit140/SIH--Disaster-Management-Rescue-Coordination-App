import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { ChipRow } from "./survivors";

const TABS = ["All", "Teams", "Volunteers", "Coordinators", "Alerts"];
const TAB_KIND: Record<string, string> = { Teams: "team", Volunteers: "volunteer", Coordinators: "coordinator", Alerts: "alert" };

export default function Messages() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [tab, setTab] = useState("All");
  const [convos, setConvos] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => { try { const r = await api.conversations(); if (alive) { setConvos(r); if (isDesktop && r[0]) openConvo(r[0]); } } catch {} if (alive) setLoading(false); })();
    return () => { alive = false; };
  }, []));

  const openConvo = async (cv: any) => {
    setSelected(cv);
    try { setMsgs(await api.conversationMessages(cv.id)); } catch {}
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 60);
  };
  const send = async () => {
    const v = text.trim();
    if (!v || !selected) return;
    const priority = /help|urgent|sos|critical/i.test(v) ? "high" : "normal";
    const m = await api.sendMessage(selected.id, v, priority);
    setMsgs((p) => [...p, m]); setText("");
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  };

  const filtered = tab === "All" ? convos : convos.filter((x) => x.kind === TAB_KIND[tab]);

  const List = (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingBottom: 8 }}><ChipRow items={TABS} value={tab} onChange={setTab} /></View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator color={c.blue} style={{ marginTop: 30 }} /> : filtered.map((cv) => {
          const active = selected?.id === cv.id;
          return (
            <Pressable key={cv.id} testID={`convo-${cv.id}`} onPress={() => openConvo(cv)} style={[styles.convo, { borderBottomColor: c.divider, backgroundColor: active ? c.activeBg : "transparent" }]}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={cv.kind === "team" ? "shield" : cv.kind === "volunteer" ? "person" : cv.kind === "alert" ? "notifications" : "people"} size={20} color={c.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: c.text, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>{cv.name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 11 }}>{new Date(cv.last_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                  <Text style={{ color: c.textMuted, fontSize: 13, flex: 1 }} numberOfLines={1}>{cv.last}</Text>
                  {cv.unread > 0 && <View style={{ backgroundColor: c.red, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{cv.unread}</Text></View>}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const Thread = selected ? (
    <View style={{ flex: 1 }}>
      <View style={[styles.threadHead, { borderBottomColor: c.border }]}>
        {!isDesktop && <Pressable testID="thread-back" onPress={() => setSelected(null)}><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable>}
        <Text style={{ color: c.text, fontWeight: "800", fontSize: 16 }}>{selected.name}</Text>
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 10 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        {msgs.map((m) => {
          const mine = m.sender === "me";
          const crit = m.priority === "critical" || m.priority === "high";
          return (
            <View key={m.id} testID={`msg-${m.id}`} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", backgroundColor: mine ? c.blue : c.card, borderWidth: mine ? 0 : 1, borderColor: c.border, borderRadius: 14, padding: 11 }}>
              {!mine && <Text style={{ color: c.blue, fontSize: 11, fontWeight: "800", marginBottom: 2 }}>{m.author}</Text>}
              {crit && <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 }}><Ionicons name="alert-circle" size={13} color={mine ? "#fff" : c.red} /><Text style={{ color: mine ? "#fff" : c.red, fontSize: 10, fontWeight: "800" }}>PRIORITY</Text></View>}
              <Text style={{ color: mine ? "#fff" : c.text, fontSize: 14, lineHeight: 19 }}>{m.text}</Text>
              <Text style={{ color: mine ? "rgba(255,255,255,0.8)" : c.textMuted, fontSize: 10, marginTop: 4, alignSelf: "flex-end" }}>{m.time}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.composer, { borderTopColor: c.border, backgroundColor: c.surface }]}>
        <Pressable testID="msg-attach"><Ionicons name="attach" size={22} color={c.textMuted} /></Pressable>
        <Pressable testID="msg-location"><Ionicons name="location-outline" size={20} color={c.textMuted} /></Pressable>
        <TextInput testID="msg-input" value={text} onChangeText={setText} placeholder="Type a message…" placeholderTextColor={c.textMuted} style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 20, paddingHorizontal: 14, minHeight: 42, color: c.text, borderWidth: 1, borderColor: c.border }} onSubmitEditing={send} />
        <Pressable testID="msg-send" onPress={send} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.blue, alignItems: "center", justifyContent: "center" }}><Ionicons name="send" size={18} color="#fff" /></Pressable>
      </View>
    </View>
  ) : (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ color: c.textMuted }}>Select a conversation</Text></View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, flexDirection: "row" }} testID="messages-screen">
      {isDesktop ? (
        <>
          <View style={{ width: 340, borderRightWidth: 1, borderRightColor: c.border }}>{List}</View>
          <View style={{ flex: 1 }}>{Thread}</View>
        </>
      ) : selected ? Thread : List}
    </View>
  );
}

const styles = StyleSheet.create({
  convo: { flexDirection: "row", gap: 12, alignItems: "center", padding: 14, borderBottomWidth: 1 },
  threadHead: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1 },
  composer: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderTopWidth: 1 },
});
