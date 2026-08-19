import React, { useState, useEffect, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth/AuthContext";
import { Card, Button, Input, SelectMenu, StatusBadge } from "@/src/components/ui";
import { ProgressBar } from "@/src/components/charts";

interface ResourceRequest {
  id: string;
  camp_id: string;
  camp_name: string;
  resource_category: string;
  resource_name: string;
  quantity_required: number;
  unit: string;
  quantity_fulfilled: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  required_by: string;
  description?: string;
  status: "OPEN" | "VOLUNTEER_RESPONDED" | "IN_FULFILLMENT" | "FULFILLED";
}

export default function CommunityRequests() {
  const { c } = useTheme();
  const { user } = useAuth();

  const [list, setList] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<ResourceRequest | null>(null);
  
  // Volunteer response form state
  const [formOpen, setFormOpen] = useState(false);
  const [formQtyOffered, setFormQtyOffered] = useState("");
  const [formDeliveryTime, setFormDeliveryTime] = useState("");
  const [formMethod, setFormMethod] = useState("Delivery");
  const [formRemarks, setFormRemarks] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await api.resourceRequests();
      // Citizens can only view active, unfulfilled open requests
      const active = (data || []).filter((r: any) => 
        ["OPEN", "VOLUNTEER_RESPONDED", "IN_FULFILLMENT"].includes(r.status) &&
        r.quantity_fulfilled < r.quantity_required
      );
      setList(active);
    } catch (err) {
      console.warn("Failed fetching community requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchRequests();
  }, []));

  const handleHelpSubmit = async () => {
    if (!selectedReq || !formQtyOffered || !formDeliveryTime) return;
    try {
      const payload = {
        quantity_offered: Number(formQtyOffered),
        expected_delivery_time: formDeliveryTime,
        delivery_method: formMethod,
        remarks: formRemarks
      };
      await api.submitVolunteerOffer(selectedReq.id, payload);
      
      setFormQtyOffered("");
      setFormDeliveryTime("");
      setFormMethod("Delivery");
      setFormRemarks("");
      setFormOpen(false);
      setSelectedReq(null);
      fetchRequests();
    } catch (err) {
      console.warn("Failed submitting volunteer offer:", err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return c.red;
      case "HIGH": return c.orange;
      case "MEDIUM": return c.blue;
      default: return c.textMuted;
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.scrollContent} testID="community-requests-screen" showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: c.text }]}>Help Relief Camps</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>
            Review resources requested by nearby shelters and offer help to fulfill them.
          </Text>
        </View>
      </View>

      {/* Requests Queue */}
      {loading ? (
        <ActivityIndicator size="large" color={c.blue} />
      ) : (
        <View style={{ gap: 14 }}>
          {list.map((item) => {
            const remaining = item.quantity_required - item.quantity_fulfilled;
            return (
              <Card key={item.id} testID={`community-request-${item.id}`}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="alert-circle" size={16} color={getPriorityColor(item.priority)} />
                      <Text style={{ color: getPriorityColor(item.priority), fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>
                        {item.priority} NEED
                      </Text>
                    </View>
                    <Text style={{ color: c.text, fontSize: 16, fontWeight: "800", marginTop: 4 }}>{item.resource_name} ({item.resource_category})</Text>
                    <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>📍 Camp: {item.camp_name}</Text>
                  </View>
                </View>

                <View style={{ gap: 4, marginTop: 10 }}>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>Required By: <Text style={{ color: c.text, fontWeight: "700" }}>{item.required_by || "Immediate"}</Text></Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>Remaining: <Text style={{ color: c.orange, fontWeight: "700" }}>{remaining} {item.unit}</Text> (Total: {item.quantity_required})</Text>
                </View>

                {item.description ? (
                  <Text style={{ color: c.text, fontSize: 13, marginVertical: 8, fontStyle: "italic" }}>
                    "{item.description}"
                  </Text>
                ) : null}

                <View style={{ marginTop: 6 }}>
                  <ProgressBar value={item.quantity_fulfilled} max={item.quantity_required} color={c.green} />
                </View>

                <View style={{ marginTop: 12 }}>
                  <Button
                    title="I Can Help"
                    icon="heart"
                    onPress={() => { setSelectedReq(item); setFormOpen(true); }}
                  />
                </View>
              </Card>
            );
          })}

          {list.length === 0 && (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="happy-outline" size={36} color={c.green} />
              <Text style={{ color: c.textMuted, marginTop: 10, fontSize: 14 }}>All camp requirements are currently fulfilled!</Text>
            </View>
          )}
        </View>
      )}

      {/* Volunteer response form modal */}
      <Modal visible={formOpen} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Offer Support</Text>
              <Pressable onPress={() => setFormOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.text} />
              </Pressable>
            </View>

            {selectedReq && (
              <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
                <View style={{ padding: 10, backgroundColor: c.inputBg, borderRadius: 8 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{selectedReq.resource_name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>Camp: {selectedReq.camp_name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>Remaining Target: {selectedReq.quantity_required - selectedReq.quantity_fulfilled} {selectedReq.unit}</Text>
                </View>

                <Input
                  label={`Quantity You Can Provide (in ${selectedReq.unit})`}
                  value={formQtyOffered}
                  onChangeText={setFormQtyOffered}
                  placeholder={`Max: ${selectedReq.quantity_required - selectedReq.quantity_fulfilled}`}
                  icon="calculator-outline"
                  keyboardType="numeric"
                />

                <Input
                  label="Expected Delivery Date & Time"
                  value={formDeliveryTime}
                  onChangeText={setFormDeliveryTime}
                  placeholder="e.g. Today, 5 PM"
                  icon="time-outline"
                />

                <SelectMenu
                  label="Delivery Preference"
                  value={formMethod}
                  options={["Delivery", "Pickup"]}
                  onChange={setFormMethod}
                />

                <Input
                  label="Additional Remarks (Optional)"
                  value={formRemarks}
                  onChangeText={setFormRemarks}
                  placeholder="e.g. Packing details, vehicle details"
                  icon="document-text-outline"
                />
              </ScrollView>
            )}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" onPress={() => setFormOpen(false)} variant="outline" />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Submit Support Offer" onPress={handleHelpSubmit} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, gap: 18, paddingBottom: 60 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { fontSize: 14, marginTop: 2 },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox: { width: "100%", maxWidth: 500, borderRadius: 16, borderWidth: 1, padding: 24, gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800" },
});
