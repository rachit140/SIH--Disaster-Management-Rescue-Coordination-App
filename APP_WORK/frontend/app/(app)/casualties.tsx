import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, Modal, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { Card, Button, Input, StatCard, SelectMenu } from "@/src/components/ui";
import { useAuth } from "@/src/auth/AuthContext";
import { api } from "@/src/api";

interface CasualtyReport {
  id: string;
  name?: string;
  age?: number;
  gender?: string;
  casualty_type: "Fatal" | "Injured" | "Missing";
  location: string;
  incident_datetime?: string;
  photo_url?: string;
  description?: string;
  reporter_name?: string;
  contact_name?: string;
  contact_phone?: string;
  additional_info?: string;
  latitude?: number;
  longitude?: number;
  status: "PENDING" | "UNDER REVIEW" | "VERIFIED" | "PUBLISHED" | "RESCUE IN PROCESS" | "COMPLETED" | "REJECTED";
  assigned_agency?: string;
  reported_by?: string;
  reported_by_user_id?: string;
  created_at?: string;
  history?: Array<{
    status: string;
    changed_by: string;
    timestamp: string;
    remarks: string;
  }>;
}

export default function Casualties() {
  const { c } = useTheme();
  const { user } = useAuth();
  
  const [list, setList] = useState<CasualtyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CasualtyReport | null>(null);

  // Filters for Agency View
  const [filterStatus, setFilterStatus] = useState<string>("All");

  // Form State
  const [formName, setFormName] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formGender, setFormGender] = useState("Unknown");
  const [formCasualtyType, setFormCasualtyType] = useState("Fatal");
  const [formLocation, setFormLocation] = useState("");
  const [formIncidentDatetime, setFormIncidentDatetime] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formReporterName, setFormReporterName] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formAdditionalInfo, setFormAdditionalInfo] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");

  const isAgency = user?.role === "coordinator" || user?.provider === "gov" || user?.role === "ADMIN" || user?.role === "volunteer";

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await api.casualties();
      setList(data || []);
    } catch (err) {
      console.warn("Error fetching casualty reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleCreate = async () => {
    if (!formLocation) return;
    try {
      const payload = {
        name: formName || "Unknown",
        age: formAge ? Number(formAge) : undefined,
        gender: formGender,
        casualty_type: formCasualtyType,
        location: formLocation,
        incident_datetime: formIncidentDatetime,
        photo_url: formPhotoUrl,
        description: formDescription,
        reporter_name: formReporterName || user?.name || "Citizen",
        contact_phone: formContactPhone,
        additional_info: formAdditionalInfo,
        latitude: formLat ? Number(formLat) : 0.0,
        longitude: formLng ? Number(formLng) : 0.0
      };
      await api.addCasualty(payload);
      
      // Reset form
      setFormName("");
      setFormAge("");
      setFormGender("Unknown");
      setFormCasualtyType("Fatal");
      setFormLocation("");
      setFormIncidentDatetime("");
      setFormPhotoUrl("");
      setFormDescription("");
      setFormReporterName("");
      setFormContactPhone("");
      setFormAdditionalInfo("");
      setFormLat("");
      setFormLng("");
      setModalOpen(false);
      fetchReports();
    } catch (err) {
      console.warn("Failed submitting casualty report:", err);
    }
  };

  const handleUpdateStatus = async (casId: string, newStatus: string) => {
    try {
      await api.updateCasualtyStatus(casId, newStatus);
      if (selectedReport && selectedReport.id === casId) {
        setSelectedReport(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
      fetchReports();
    } catch (err) {
      console.warn("Failed to update casualty status:", err);
    }
  };

  // Filter & Search
  const filtered = list.filter((p) => {
    const matchesSearch = (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
                          p.location.toLowerCase().includes(search.toLowerCase()) ||
                          p.id.toLowerCase().includes(search.toLowerCase());
    
    if (isAgency && filterStatus !== "All") {
      return matchesSearch && p.status === filterStatus;
    }
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return { fg: c.orange, bg: c.orangeSoft };
      case "UNDER REVIEW": return { fg: c.blue, bg: c.blueSoft };
      case "VERIFIED": return { fg: c.green, bg: c.greenSoft };
      case "PUBLISHED": return { fg: c.blue, bg: c.blueSoft };
      case "RESCUE IN PROCESS": return { fg: c.orange, bg: c.orangeSoft };
      case "COMPLETED": return { fg: c.green, bg: c.greenSoft };
      case "REJECTED": return { fg: c.red, bg: c.redSoft };
      default: return { fg: c.text, bg: c.divider };
    }
  };

  const pendingCount = list.filter((p) => p.status === "PENDING").length;
  const inProgressCount = list.filter((p) => p.status === "RESCUE IN PROCESS").length;
  const completedCount = list.filter((p) => p.status === "COMPLETED").length;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} testID="casualties-screen">
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Casualty Reporting & Operations</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>
            {isAgency ? "Verify and coordinate emergency rescue workflows for casualties." : "Report disaster casualties and monitor real-time rescue status."}
          </Text>
        </View>
        <Button
          testID="report-casualty-btn"
          title="Report Casualty"
          icon="add"
          onPress={() => setModalOpen(true)}
          full={false}
        />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <StatCard value={list.length} label={isAgency ? "Total Cases" : "My Reported Cases"} icon="ribbon" color={c.blue} />
        <StatCard value={isAgency ? pendingCount : inProgressCount} label={isAgency ? "Pending Verification" : "Active Rescue"} icon="alert-circle-outline" color={c.orange} />
        <StatCard value={completedCount} label="Rescues Completed" icon="checkmark-circle" color={c.green} />
      </View>

      {/* Agency status filters */}
      {isAgency && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {["All", "PENDING", "UNDER REVIEW", "VERIFIED", "PUBLISHED", "RESCUE IN PROCESS", "COMPLETED", "REJECTED"].map((st) => (
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
      )}

      {/* Search Input */}
      <Card style={{ padding: 6 }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={c.textMuted} style={{ marginLeft: 8 }} />
          <TextInput
            testID="casualties-search-input"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by case ID, name or location…"
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.text }]}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")} style={{ padding: 6 }}>
              <Ionicons name="close" size={18} color={c.textMuted} />
            </Pressable>
          )}
        </View>
      </Card>

      {/* List */}
      {loading ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color={c.blue} />
        </View>
      ) : (
        <Card style={{ padding: 0 }}>
          <View style={[styles.tableHead, { borderBottomColor: c.border }]}>
            <Text style={[styles.th, { color: c.textMuted, flex: 3.5 }]}>Case & Casualty Name</Text>
            <Text style={[styles.th, { color: c.textMuted, flex: 3.5 }]}>Incident Location</Text>
            <Text style={[styles.th, { color: c.textMuted, flex: 2, textAlign: "right" }]}>Status</Text>
          </View>

          {filtered.map((item, idx) => {
            const colors = getStatusColor(item.status);
            return (
              <Pressable
                key={item.id}
                testID={`casualty-row-${item.id}`}
                onPress={() => setSelectedReport(item)}
                style={({ pressed }) => [
                  styles.tableRow,
                  {
                    backgroundColor: pressed ? c.divider : "transparent",
                    borderBottomColor: c.divider,
                    borderBottomWidth: idx === filtered.length - 1 ? 0 : 1
                  }
                ]}
              >
                <View style={{ flex: 3.5, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {item.photo_url ? (
                    <Image source={{ uri: item.photo_url }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: c.blueSoft }]}>
                      <Ionicons name="medical" size={18} color={c.blue} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: "700", fontSize: 13 }}>{item.id}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>
                      {item.name || "Unknown"} ({item.casualty_type})
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 3.5 }}>
                  <Text style={{ color: c.text, fontSize: 13 }} numberOfLines={1}>{item.location}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 1 }}>
                    {item.incident_datetime || "Datetime N/A"}
                  </Text>
                </View>
                <View style={{ flex: 2, alignItems: "flex-end" }}>
                  <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: colors.fg, fontSize: 9, fontWeight: "800", textTransform: "uppercase" }}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {filtered.length === 0 && (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="list-outline" size={32} color={c.textMuted} />
              <Text style={{ color: c.textMuted, marginTop: 8, fontSize: 14 }}>No reports found.</Text>
            </View>
          )}
        </Card>
      )}

      {/* Details / Operations Modal */}
      <Modal visible={!!selectedReport} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Casualty Case File</Text>
              <Pressable onPress={() => setSelectedReport(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.text} />
              </Pressable>
            </View>

            {selectedReport && (
              <ScrollView contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                  {selectedReport.photo_url ? (
                    <Image source={{ uri: selectedReport.photo_url }} style={styles.largeAvatar} />
                  ) : (
                    <View style={[styles.largeAvatarPlaceholder, { backgroundColor: c.blueSoft }]}>
                      <Ionicons name="medical" size={40} color={c.blue} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontSize: 18, fontWeight: "800" }}>{selectedReport.id}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 14 }}>
                      Casualty: {selectedReport.name || "Unknown"} ({selectedReport.gender})
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 13 }}>
                      Type: {selectedReport.casualty_type} • Age: {selectedReport.age || "Unknown"}
                    </Text>
                    <View style={{ flexDirection: "row", marginTop: 6 }}>
                      <View style={{ backgroundColor: getStatusColor(selectedReport.status).bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ color: getStatusColor(selectedReport.status).fg, fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>
                          {selectedReport.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Status Timeline */}
                <View style={{ padding: 12, backgroundColor: c.inputBg, borderRadius: 10, gap: 8 }}>
                  <Text style={{ color: c.text, fontWeight: "700", fontSize: 12 }}>Case Status Timeline</Text>
                  {selectedReport.history && selectedReport.history.map((h, i) => (
                    <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                      <View style={{ alignItems: "center", marginTop: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.blue }} />
                        {i < (selectedReport.history?.length || 0) - 1 && (
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

                <View style={[styles.detailSection, { borderTopColor: c.divider, borderBottomColor: c.divider }]}>
                  <Text style={[styles.detailLabel, { color: c.textMuted }]}>Incident Location</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{selectedReport.location}</Text>
                  
                  {selectedReport.description ? (
                    <>
                      <Text style={[styles.detailLabel, { color: c.textMuted, marginTop: 12 }]}>Incident Description</Text>
                      <Text style={[styles.detailValue, { color: c.text }]}>{selectedReport.description}</Text>
                    </>
                  ) : null}

                  {selectedReport.additional_info ? (
                    <>
                      <Text style={[styles.detailLabel, { color: c.textMuted, marginTop: 12 }]}>Additional Information</Text>
                      <Text style={[styles.detailValue, { color: c.text }]}>{selectedReport.additional_info}</Text>
                    </>
                  ) : null}

                  <Text style={[styles.detailLabel, { color: c.textMuted, marginTop: 12 }]}>Reporter Contact Info</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>
                    Reporter: {selectedReport.reporter_name || "N/A"} ({selectedReport.contact_phone || "N/A"})
                  </Text>

                  {selectedReport.assigned_agency ? (
                    <>
                      <Text style={[styles.detailLabel, { color: c.textMuted, marginTop: 12 }]}>Assigned Rescue Agency</Text>
                      <Text style={[styles.detailValue, { color: c.text, fontWeight: "700" }]}>{selectedReport.assigned_agency}</Text>
                    </>
                  ) : null}
                </View>

                {/* Verification Actions (For Verification Agencies) */}
                {isAgency && ["PENDING", "UNDER REVIEW", "VERIFIED"].includes(selectedReport.status) && (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: c.text, fontWeight: "700", fontSize: 13 }}>Agency Verification Control</Text>
                    <View style={styles.actionGrid}>
                      <Button title="Start Review" onPress={() => handleUpdateStatus(selectedReport.id, "UNDER REVIEW")} variant="soft" full={false} />
                      <Button title="Verify Case" onPress={() => handleUpdateStatus(selectedReport.id, "VERIFIED")} variant="primary" color={c.green} full={false} />
                      <Button title="Publish Alert" onPress={() => handleUpdateStatus(selectedReport.id, "PUBLISHED")} variant="primary" color={c.blue} full={false} />
                      <Button title="Reject Report" onPress={() => handleUpdateStatus(selectedReport.id, "REJECTED")} variant="danger" full={false} />
                    </View>
                  </View>
                )}

                {/* Rescue Agency Operations Panel */}
                {isAgency && ["PUBLISHED", "RESCUE IN PROCESS"].includes(selectedReport.status) && (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: c.text, fontWeight: "700", fontSize: 13 }}>Rescue Operations Coordination</Text>
                    <View style={styles.actionGrid}>
                      <Button title="Accept Rescue Operation" onPress={() => handleUpdateStatus(selectedReport.id, "RESCUE IN PROCESS")} variant="primary" color={c.orange} full={false} />
                      <Button title="Mark Rescue Completed" onPress={() => handleUpdateStatus(selectedReport.id, "COMPLETED")} variant="primary" color={c.green} full={false} />
                      <Button title="Decline Operation" onPress={() => handleUpdateStatus(selectedReport.id, "REJECTED")} variant="danger" full={false} />
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Creation Modal Form */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Report New Casualty</Text>
              <Pressable onPress={() => setModalOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
              <Input
                label="Casualty Name (Optional)"
                value={formName}
                onChangeText={setFormName}
                placeholder="Leave blank if unknown"
                icon="person-outline"
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Age (Optional)"
                    value={formAge}
                    onChangeText={formAge => setFormAge(formAge.replace(/[^0-9]/g, ""))}
                    placeholder="Estimated age"
                    icon="calendar-outline"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <SelectMenu
                    label="Gender"
                    value={formGender}
                    options={["Unknown", "Male", "Female", "Other"]}
                    onChange={setFormGender}
                  />
                </View>
              </View>
              <SelectMenu
                label="Casualty Type / Status"
                value={formCasualtyType}
                options={["Fatal", "Injured", "Missing"]}
                onChange={setFormCasualtyType}
              />
              <Input
                label="Incident Location"
                value={formLocation}
                onChangeText={setFormLocation}
                placeholder="Address or area description"
                icon="location-outline"
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Latitude"
                    value={formLat}
                    onChangeText={setFormLat}
                    placeholder="e.g. 26.14"
                    icon="compass-outline"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Longitude"
                    value={formLng}
                    onChangeText={setFormLng}
                    placeholder="e.g. 91.73"
                    icon="compass-outline"
                  />
                </View>
              </View>
              <Input
                label="Incident Date & Time"
                value={formIncidentDatetime}
                onChangeText={setFormIncidentDatetime}
                placeholder="e.g. 19 Aug 2026, 03:30 PM"
                icon="time-outline"
              />
              <Input
                label="Photo URL (Optional)"
                value={formPhotoUrl}
                onChangeText={setFormPhotoUrl}
                placeholder="https://image-url..."
                icon="image-outline"
              />
              <Input
                label="Case Description"
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Circumstances or identifiers..."
                icon="document-text-outline"
              />
              <Input
                label="Reporter Name (Optional)"
                value={formReporterName}
                onChangeText={setFormReporterName}
                placeholder="Your full name"
                icon="person-outline"
              />
              <Input
                label="Contact Information"
                value={formContactPhone}
                onChangeText={setFormContactPhone}
                placeholder="Your phone number"
                icon="call-outline"
                keyboardType="phone-pad"
              />
              <Input
                label="Additional Information"
                value={formAdditionalInfo}
                onChangeText={setFormAdditionalInfo}
                placeholder="Next of kin details or extra details"
                icon="information-circle-outline"
              />
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Button title="Cancel" onPress={() => setModalOpen(false)} variant="outline" />
              <Button title="Submit Casualty Report" onPress={handleCreate} />
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
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  searchBar: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 10, paddingVertical: 8 },
  tableHead: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  th: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 36, height: 36, borderRadius: 18 },
  largeAvatar: { width: 80, height: 80, borderRadius: 40 },
  largeAvatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  detailSection: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14, gap: 6 },
  detailLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  detailValue: { fontSize: 15, lineHeight: 20 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox: { width: "100%", maxWidth: 500, borderRadius: 16, borderWidth: 1, padding: 24, gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800" },
});
