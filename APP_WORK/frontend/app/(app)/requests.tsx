import React, { useState, useEffect, useCallback } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth/AuthContext";
import { Card, Button, Input, StatCard, SelectMenu, StatusBadge } from "@/src/components/ui";

interface VolunteerOffer {
  id: string;
  volunteer_name: string;
  volunteer_phone: string;
  quantity_offered: number;
  expected_delivery_time: string;
  delivery_method: string;
  remarks?: string;
  status: "SUBMITTED" | "ACCEPTED" | "DELIVERED" | "REJECTED";
}

interface ResourceRequest {
  id: string;
  camp_id: string;
  camp_name: string;
  requested_by: string;
  resource_category: string;
  resource_name: string;
  quantity_required: number;
  unit: string;
  quantity_fulfilled: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  required_by: string;
  description?: string;
  remarks?: string;
  status: "PENDING_REVIEW" | "OPEN" | "VOLUNTEER_RESPONDED" | "IN_FULFILLMENT" | "FULFILLED" | "REJECTED" | "CANCELLED";
  created_at: string;
  history?: Array<{
    status: string;
    changed_by: string;
    timestamp: string;
    remarks: string;
  }>;
  offers?: VolunteerOffer[];
}

export default function Requests() {
  const { c } = useTheme();
  const { user } = useAuth();

  const [list, setList] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ResourceRequest | null>(null);

  // Form State
  const [formCampId, setFormCampId] = useState("");
  const [formCampName, setFormCampName] = useState("");
  const [formCategory, setFormCategory] = useState("Food");
  const [formResourceName, setFormResourceName] = useState("");
  const [formQtyRequired, setFormQtyRequired] = useState("");
  const [formUnit, setFormUnit] = useState("Packets");
  const [formPriority, setFormPriority] = useState("MEDIUM");
  const [formRequiredBy, setFormRequiredBy] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRemarks, setFormRemarks] = useState("");

  const [camps, setCamps] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const isAgency = user?.role === "coordinator" || user?.provider === "gov" || user?.role === "ADMIN" || user?.role === "volunteer";
  const isAdmin = user?.role === "ADMIN" || user?.provider === "gov";

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await api.resourceRequests();
      setList(data || []);
    } catch (err) {
      console.warn("Failed fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCamps = async () => {
    try {
      const data = await api.camps();
      setCamps(data || []);
      if (data && data.length > 0) {
        setFormCampId(data[0].id);
        setFormCampName(data[0].name);
      }
    } catch (err) {
      console.warn("Failed fetching camps list:", err);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchRequests();
    if (isAgency) {
      fetchCamps();
    }
  }, []));

  const handleCreate = async () => {
    if (!formCampId || !formResourceName || !formQtyRequired) return;
    try {
      const selectedCamp = camps.find(c => c.id === formCampId);
      const payload = {
        camp_id: formCampId,
        camp_name: selectedCamp ? selectedCamp.name : formCampName,
        resource_category: formCategory,
        resource_name: formResourceName,
        quantity_required: Number(formQtyRequired),
        unit: formUnit,
        priority: formPriority,
        required_by: formRequiredBy,
        description: formDescription,
        remarks: formRemarks
      };
      await api.createResourceRequest(payload);
      
      setFormResourceName("");
      setFormQtyRequired("");
      setFormRequiredBy("");
      setFormDescription("");
      setFormRemarks("");
      setModalOpen(false);
      fetchRequests();
    } catch (err) {
      console.warn("Failed to create resource request:", err);
    }
  };

  const handleUpdateStatus = async (reqId: string, status: string) => {
    try {
      await api.updateRequestStatus(reqId, status);
      if (selectedReq && selectedReq.id === reqId) {
        setSelectedReq(prev => prev ? { ...prev, status: status as any } : null);
      }
      fetchRequests();
    } catch (err) {
      console.warn("Failed updating request status:", err);
    }
  };

  const handleConfirmDelivery = async (reqId: string, offerId: string) => {
    try {
      await api.updateOfferStatus(reqId, offerId, "DELIVERED");
      fetchRequests();
      setSelectedReq(null);
    } catch (err) {
      console.warn("Failed confirming delivery:", err);
    }
  };

  const filtered = list.filter((r) => {
    if (filterStatus !== "All") {
      return r.status === filterStatus;
    }
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return c.red;
      case "HIGH": return c.orange;
      case "MEDIUM": return c.blue;
      default: return c.textMuted;
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.scrollContent} testID="requests-screen" showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Resource Requests & Logistics</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>
            {isAgency ? "Request resources for rescue camps and review volunteer offers." : "Review operational requests and verify delivery status."}
          </Text>
        </View>
        {isAgency && (
          <Button
            testID="new-request"
            title="Request Resources"
            icon="add"
            onPress={() => setModalOpen(true)}
            full={false}
          />
        )}
      </View>

      {/* Admin / Agency Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {["All", "PENDING_REVIEW", "OPEN", "VOLUNTEER_RESPONDED", "IN_FULFILLMENT", "FULFILLED", "REJECTED", "CANCELLED"].map((st) => (
          <Pressable
            key={st}
            onPress={() => setFilterStatus(st)}
            style={{
              backgroundColor: filterStatus === st ? c.blue : c.card,
              borderColor: c.border,
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8
            }}
          >
            <Text style={{ color: filterStatus === st ? "#fff" : c.text, fontWeight: "700", fontSize: 12 }}>
              {st}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Requests List */}
      {loading ? (
        <ActivityIndicator size="large" color={c.blue} />
      ) : (
        <View style={{ gap: 14 }}>
          {filtered.map((item) => (
            <Card key={item.id} testID={`request-${item.id}`}>
              <Pressable onPress={() => setSelectedReq(item)}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>{item.resource_name} ({item.resource_category})</Text>
                    <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>For: {item.camp_name}</Text>
                  </View>
                  <StatusBadge label={item.status} />
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 10, alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="flag" size={15} color={getPriorityColor(item.priority)} />
                    <Text style={{ color: getPriorityColor(item.priority), fontWeight: "700", fontSize: 12 }}>
                      {item.priority} PRIORITY
                    </Text>
                  </View>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>•</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>Required by: {item.required_by || "Immediate"}</Text>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: c.text, fontSize: 13, fontWeight: "700" }}>
                    Fulfillment Progress: {item.quantity_fulfilled} / {item.quantity_required} {item.unit}
                  </Text>
                  <View style={{ marginTop: 6 }}>
                    <ProgressBar value={item.quantity_fulfilled} max={item.quantity_required} color={c.green} />
                  </View>
                </View>

                {item.offers && item.offers.length > 0 && (
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 10 }}>
                    <Text style={{ color: c.text, fontSize: 12, fontWeight: "800" }}>
                      Offers Received: {item.offers.filter(o => o.status === "SUBMITTED").length} active offers
                    </Text>
                  </View>
                )}
              </Pressable>
            </Card>
          ))}

          {filtered.length === 0 && (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="clipboard-outline" size={32} color={c.textMuted} />
              <Text style={{ color: c.textMuted, marginTop: 8, fontSize: 14 }}>No resource requests found.</Text>
            </View>
          )}
        </View>
      )}

      {/* Details & Administration Modal */}
      <Modal visible={!!selectedReq} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Resource Request Case File</Text>
              <Pressable onPress={() => setSelectedReq(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.text} />
              </Pressable>
            </View>

            {selectedReq && (
              <ScrollView contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
                <View>
                  <Text style={{ color: c.text, fontSize: 18, fontWeight: "800" }}>{selectedReq.resource_name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>Category: {selectedReq.resource_category} | Camp: {selectedReq.camp_name}</Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 8, alignItems: "center" }}>
                    <View style={{ backgroundColor: getPriorityColor(selectedReq.priority) + "22", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: getPriorityColor(selectedReq.priority), fontSize: 11, fontWeight: "800" }}>
                        {selectedReq.priority}
                      </Text>
                    </View>
                    <StatusBadge label={selectedReq.status} />
                  </View>
                </View>

                <View style={[styles.detailSection, { borderTopColor: c.divider, borderBottomColor: c.divider }]}>
                  <Text style={[styles.detailLabel, { color: c.textMuted }]}>Logistics Details</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>
                    Required Quantity: {selectedReq.quantity_required} {selectedReq.unit} (Already Fulfilled: {selectedReq.quantity_fulfilled} {selectedReq.unit})
                  </Text>
                  <Text style={[styles.detailValue, { color: c.text, marginTop: 4 }]}>
                    Required By: {selectedReq.required_by || "Immediate"}
                  </Text>

                  {selectedReq.description ? (
                    <>
                      <Text style={[styles.detailLabel, { color: c.textMuted, marginTop: 10 }]}>Logistics Description</Text>
                      <Text style={[styles.detailValue, { color: c.text }]}>{selectedReq.description}</Text>
                    </>
                  ) : null}
                </View>

                {/* Status Timeline */}
                <View style={{ padding: 12, backgroundColor: c.inputBg, borderRadius: 10, gap: 8 }}>
                  <Text style={{ color: c.text, fontWeight: "700", fontSize: 12 }}>Workflow History</Text>
                  {selectedReq.history && selectedReq.history.map((h, i) => (
                    <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                      <View style={{ alignItems: "center", marginTop: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.blue }} />
                        {i < (selectedReq.history?.length || 0) - 1 && (
                          <View style={{ width: 2, height: 20, backgroundColor: c.divider }} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontSize: 12, fontWeight: "600" }}>{h.status}</Text>
                        <Text style={{ color: c.textMuted, fontSize: 11 }}>{h.remarks} — By {h.changed_by}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Volunteer Responses Management for Camp Coordinators */}
                {isAgency && selectedReq.offers && selectedReq.offers.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: c.text, fontWeight: "700", fontSize: 13 }}>Volunteer Contributions</Text>
                    {selectedReq.offers.map((offer) => (
                      <View key={offer.id} style={{ padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 8, gap: 4 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ color: c.text, fontWeight: "700" }}>{offer.volunteer_name}</Text>
                          <StatusBadge label={offer.status} />
                        </View>
                        <Text style={{ color: c.text, fontSize: 13 }}>Quantity: {offer.quantity_offered} {selectedReq.unit}</Text>
                        <Text style={{ color: c.textMuted, fontSize: 12 }}>ETA: {offer.expected_delivery_time}</Text>
                        {offer.remarks ? (
                          <Text style={{ color: c.textMuted, fontSize: 12, fontStyle: "italic" }}>Remarks: {offer.remarks}</Text>
                        ) : null}
                        
                        {offer.status === "SUBMITTED" && (
                          <View style={{ marginTop: 8 }}>
                            <Button
                              title="Confirm Delivery"
                              onPress={() => handleConfirmDelivery(selectedReq.id, offer.id)}
                              variant="primary"
                              color={c.green}
                            />
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Administration Review Controls */}
                {isAdmin && selectedReq.status === "PENDING_REVIEW" && (
                  <View style={{ gap: 10, marginTop: 8 }}>
                    <Text style={{ color: c.text, fontWeight: "700", fontSize: 13 }}>Administrative Controls</Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Button
                        title="Approve & Publish Request"
                        onPress={() => handleUpdateStatus(selectedReq.id, "APPROVED")}
                        variant="primary"
                        color={c.green}
                      />
                      <Button
                        title="Reject Request"
                        onPress={() => handleUpdateStatus(selectedReq.id, "REJECTED")}
                        variant="danger"
                      />
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Resource Request Form Modal */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>New Resource Request Form</Text>
              <Pressable onPress={() => setModalOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
              <SelectMenu
                label="Target Relief Camp"
                value={formCampId}
                options={camps.map(c => c.id)}
                onChange={(val) => {
                  setFormCampId(val);
                  const selected = camps.find(c => c.id === val);
                  if (selected) setFormCampName(selected.name);
                }}
              />
              <SelectMenu
                label="Resource Category"
                value={formCategory}
                options={["Food", "Drinking Water", "Medicines", "Medical Equipment", "Blankets", "Clothes", "Shelter Materials", "Hygiene Kits", "Sanitation Supplies", "Baby Supplies", "Emergency Equipment", "Other"]}
                onChange={setFormCategory}
              />
              <Input
                label="Resource Name"
                value={formResourceName}
                onChangeText={setFormResourceName}
                placeholder="e.g. Mineral Water Bottles"
                icon="cube-outline"
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Quantity Required"
                    value={formQtyRequired}
                    onChangeText={setFormQtyRequired}
                    placeholder="e.g. 500"
                    icon="calculator-outline"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Unit"
                    value={formUnit}
                    onChangeText={setFormUnit}
                    placeholder="e.g. Litres, Packs"
                    icon="ellipsis-horizontal-outline"
                  />
                </View>
              </View>
              <SelectMenu
                label="Priority"
                value={formPriority}
                options={["LOW", "MEDIUM", "HIGH", "CRITICAL"]}
                onChange={setFormPriority}
              />
              <Input
                label="Required By"
                value={formRequiredBy}
                onChangeText={setFormRequiredBy}
                placeholder="e.g. Today 6 PM"
                icon="time-outline"
              />
              <Input
                label="Description"
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Details of immediate need..."
                icon="document-text-outline"
              />
              <Input
                label="Additional Remarks"
                value={formRemarks}
                onChangeText={setFormRemarks}
                placeholder="Additional coordinator notes"
                icon="information-circle-outline"
              />
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" onPress={() => setModalOpen(false)} variant="outline" />
              </View>
              <View style={{ flex: 1 }}>
                <Button testID="rq-submit" title="Submit Request" onPress={handleCreate} />
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
  headerRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14 },
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { fontSize: 14, marginTop: 2 },
  detailSection: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14, gap: 6 },
  detailLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  detailValue: { fontSize: 15, lineHeight: 20 },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox: { width: "100%", maxWidth: 500, borderRadius: 16, borderWidth: 1, padding: 24, gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800" },
});
