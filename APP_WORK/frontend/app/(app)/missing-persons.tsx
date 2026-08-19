import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, Modal, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { Card, Button, Input, StatCard, SelectMenu } from "@/src/components/ui";
import { useAuth } from "@/src/auth/AuthContext";
import { api } from "@/src/api";

interface MissingPerson {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  last_seen_location: string;
  description?: string;
  contact_name?: string;
  contact_phone?: string;
  photo_url?: string;
  status: "Pending Request" | "Under Review" | "Verified" | "Searching" | "Located" | "Closed" | "Rejected";
  reported_by?: string;
  created_at?: string;
}

export default function MissingPersons() {
  const { c } = useTheme();
  const { user } = useAuth();
  
  const [list, setList] = useState<MissingPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<MissingPerson | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formGender, setFormGender] = useState("Unknown");
  const [formLastSeen, setFormLastSeen] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");

  const isAgency = user?.role === "coordinator" || user?.provider === "gov";

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await api.missingPersons();
      setList(data || []);
    } catch (err) {
      console.warn("Error fetching missing persons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleCreate = async () => {
    if (!formName || !formLastSeen) return;
    try {
      const payload = {
        name: formName,
        age: formAge ? Number(formAge) : undefined,
        gender: formGender,
        last_seen_location: formLastSeen,
        description: formDescription,
        contact_name: formContactName,
        contact_phone: formContactPhone,
        photo_url: formPhotoUrl
      };
      await api.addMissingPerson(payload);
      // Reset form
      setFormName("");
      setFormAge("");
      setFormGender("Unknown");
      setFormLastSeen("");
      setFormDescription("");
      setFormContactName("");
      setFormContactPhone("");
      setFormPhotoUrl("");
      setModalOpen(false);
      fetchReports();
    } catch (err) {
      console.warn("Failed reporting missing person:", err);
    }
  };

  const handleUpdateStatus = async (mpId: string, newStatus: string) => {
    try {
      await api.updateMissingPerson(mpId, newStatus);
      if (selectedPerson && selectedPerson.id === mpId) {
        setSelectedPerson(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
      fetchReports();
    } catch (err) {
      console.warn("Failed to update status:", err);
    }
  };

  const filtered = list.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.last_seen_location.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = list.filter((p) => p.status === "Pending Request").length;
  const activeCount = list.filter((p) => ["Verified", "Searching", "Under Review"].includes(p.status)).length;
  const locatedCount = list.filter((p) => p.status === "Located").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending Request": return { fg: c.orange, bg: c.orangeSoft };
      case "Under Review": return { fg: c.blue, bg: c.blueSoft };
      case "Verified": return { fg: c.green, bg: c.greenSoft };
      case "Searching": return { fg: c.red, bg: c.redSoft };
      case "Located": return { fg: c.green, bg: c.greenSoft };
      case "Closed": return { fg: c.textMuted, bg: c.divider };
      case "Rejected": return { fg: c.red, bg: c.redSoft };
      default: return { fg: c.text, bg: c.divider };
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} testID="missing-persons-screen">
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Missing Persons Directory</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Report missing individuals and coordinate verified search efforts.</Text>
        </View>
        <Button
          testID="report-missing-btn"
          title="Report Missing"
          icon="add"
          onPress={() => setModalOpen(true)}
          full={false}
        />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <StatCard value={list.length} label="Total Reports" icon="people" color={c.blue} />
        {isAgency ? (
          <StatCard value={pendingCount} label="Pending Review" icon="shield-alert-outline" color={c.orange} />
        ) : (
          <StatCard value={activeCount} label="Active Search" icon="search" color={c.red} />
        )}
        <StatCard value={locatedCount} label="Located Safely" icon="checkmark-circle" color={c.green} />
      </View>

      {/* Search Input */}
      <Card style={{ padding: 6 }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={c.textMuted} style={{ marginLeft: 8 }} />
          <TextInput
            testID="missing-search-input"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or location…"
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
            <Text style={[styles.th, { color: c.textMuted, flex: 3 }]}>Name & Details</Text>
            <Text style={[styles.th, { color: c.textMuted, flex: 3 }]}>Last Seen Location</Text>
            <Text style={[styles.th, { color: c.textMuted, flex: 2, textAlign: "right" }]}>Status</Text>
          </View>

          {filtered.map((item, idx) => {
            const colors = getStatusColor(item.status);
            return (
              <Pressable
                key={item.id}
                testID={`missing-row-${item.id}`}
                onPress={() => setSelectedPerson(item)}
                style={({ pressed }) => [
                  styles.tableRow,
                  {
                    backgroundColor: pressed ? c.divider : "transparent",
                    borderBottomColor: c.divider,
                    borderBottomWidth: idx === filtered.length - 1 ? 0 : 1
                  }
                ]}
              >
                <View style={{ flex: 3, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {item.photo_url ? (
                    <Image source={{ uri: item.photo_url }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: c.blueSoft }]}>
                      <Ionicons name="person" size={20} color={c.blue} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: "700", fontSize: 14 }}>{item.name}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                      {item.age ? `${item.age} yrs` : "Age N/A"} • {item.gender || "Unknown"}
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 3 }}>
                  <Text style={{ color: c.text, fontSize: 14 }}>{item.last_seen_location}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>Contact: {item.contact_phone || "N/A"}</Text>
                </View>
                <View style={{ flex: 2, alignItems: "flex-end" }}>
                  <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: colors.fg, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {filtered.length === 0 && (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="people-outline" size={32} color={c.textMuted} />
              <Text style={{ color: c.textMuted, marginTop: 8, fontSize: 14 }}>No reports match your query.</Text>
            </View>
          )}
        </Card>
      )}

      {/* Details Modal */}
      <Modal visible={!!selectedPerson} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Person Details</Text>
              <Pressable onPress={() => setSelectedPerson(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.text} />
              </Pressable>
            </View>

            {selectedPerson && (
              <ScrollView contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                  {selectedPerson.photo_url ? (
                    <Image source={{ uri: selectedPerson.photo_url }} style={styles.largeAvatar} />
                  ) : (
                    <View style={[styles.largeAvatarPlaceholder, { backgroundColor: c.blueSoft }]}>
                      <Ionicons name="person" size={40} color={c.blue} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontSize: 18, fontWeight: "800" }}>{selectedPerson.name}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 14 }}>
                      Age: {selectedPerson.age || "N/A"} • Gender: {selectedPerson.gender || "Unknown"}
                    </Text>
                    <View style={{ flexDirection: "row", marginTop: 6 }}>
                      <View style={{ backgroundColor: getStatusColor(selectedPerson.status).bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ color: getStatusColor(selectedPerson.status).fg, fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>
                          {selectedPerson.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailSection, { borderTopColor: c.divider, borderBottomColor: c.divider }]}>
                  <Text style={[styles.detailLabel, { color: c.textMuted }]}>Last Seen Location</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{selectedPerson.last_seen_location}</Text>
                  
                  {selectedPerson.description ? (
                    <>
                      <Text style={[styles.detailLabel, { color: c.textMuted, marginTop: 12 }]}>Physical Description / Notes</Text>
                      <Text style={[styles.detailValue, { color: c.text }]}>{selectedPerson.description}</Text>
                    </>
                  ) : null}

                  <Text style={[styles.detailLabel, { color: c.textMuted, marginTop: 12 }]}>Contact Point</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>
                    {selectedPerson.contact_name || "N/A"} ({selectedPerson.contact_phone || "N/A"})
                  </Text>

                  <Text style={[styles.detailLabel, { color: c.textMuted, marginTop: 12 }]}>Reported By</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{selectedPerson.reported_by || "System"}</Text>
                </View>

                {/* Agency Control Actions */}
                {isAgency && (
                  <View style={{ gap: 10, marginTop: 10 }}>
                    <Text style={{ color: c.text, fontWeight: "700", fontSize: 14 }}>Agency Verification Panel</Text>
                    <View style={styles.actionGrid}>
                      <Button title="Review" onPress={() => handleUpdateStatus(selectedPerson.id, "Under Review")} variant="soft" full={false} />
                      <Button title="Verify" onPress={() => handleUpdateStatus(selectedPerson.id, "Verified")} variant="primary" color={c.green} full={false} />
                      <Button title="Search" onPress={() => handleUpdateStatus(selectedPerson.id, "Searching")} variant="primary" color={c.red} full={false} />
                      <Button title="Located" onPress={() => handleUpdateStatus(selectedPerson.id, "Located")} variant="primary" color={c.green} full={false} />
                      <Button title="Close" onPress={() => handleUpdateStatus(selectedPerson.id, "Closed")} variant="outline" full={false} />
                      <Button title="Reject" onPress={() => handleUpdateStatus(selectedPerson.id, "Rejected")} variant="danger" full={false} />
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
              <Text style={[styles.modalTitle, { color: c.text }]}>Report Missing Person</Text>
              <Pressable onPress={() => setModalOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
              <Input
                label="Full Name"
                value={formName}
                onChangeText={setFormName}
                placeholder="Enter full name"
                icon="person-outline"
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Age"
                    value={formAge}
                    onChangeText={formAge => setFormAge(formAge.replace(/[^0-9]/g, ""))}
                    placeholder="Age in years"
                    icon="calendar-outline"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1.2 }}>
                  <SelectMenu
                    label="Gender"
                    value={formGender}
                    options={["Unknown", "Male", "Female", "Other"]}
                    onChange={setFormGender}
                  />
                </View>
              </View>
              <Input
                label="Last Seen Location"
                value={formLastSeen}
                onChangeText={setFormLastSeen}
                placeholder="Where were they last seen?"
                icon="location-outline"
              />
              <Input
                label="Photo URL (Optional)"
                value={formPhotoUrl}
                onChangeText={setFormPhotoUrl}
                placeholder="https://image-url..."
                icon="image-outline"
              />
              <Input
                label="Description"
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Identifiers (height, clothes...)"
                icon="document-text-outline"
              />
              <Input
                label="Contact Name"
                value={formContactName}
                onChangeText={setFormContactName}
                placeholder="Contact relative name"
                icon="person-outline"
              />
              <Input
                label="Contact Phone"
                value={formContactPhone}
                onChangeText={setFormContactPhone}
                placeholder="Relative phone number"
                icon="call-outline"
                keyboardType="phone-pad"
              />
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Button title="Cancel" onPress={() => setModalOpen(false)} variant="outline" />
              <Button title="Submit Report" onPress={handleCreate} />
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
