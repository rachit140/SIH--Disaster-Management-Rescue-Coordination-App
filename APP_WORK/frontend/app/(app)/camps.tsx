import React, { useState, useEffect, useCallback } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { useTheme } from "@/src/theme/ThemeContext";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth/AuthContext";
import { Card, Button, Input, StatCard, SelectMenu, StatusBadge } from "@/src/components/ui";
import { ProgressBar } from "@/src/components/charts";
import { LeafletMap } from "@/src/components/LeafletMap";
import { useResponsive } from "@/src/hooks/useResponsive";

interface ReliefCamp {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupancy: number;
  status: "ACTIVE" | "FULL" | "CLOSED";
  medical: boolean;
  food: boolean;
  water: boolean;
  shelter: boolean;
  contact_number?: string;
  description?: string;
  camp_type?: string;
  distance?: number;
  created_by?: string;
  created_at?: string;
  closed_by?: string;
  closed_at?: string;
}

export default function Camps() {
  const { c, mode } = useTheme();
  const { user } = useAuth();
  const { isDesktop } = useResponsive(1000);
  
  const [list, setList] = useState<ReliefCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<ReliefCamp | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [search, setSearch] = useState("");

  // Citizen GPS sorting
  const [useGps, setUseGps] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // Form State for Management
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formOccupancy, setFormOccupancy] = useState("");
  const [formContactNumber, setFormContactNumber] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCampType, setFormCampType] = useState("Relief Camp");
  const [formFood, setFormFood] = useState(true);
  const [formWater, setFormWater] = useState(true);
  const [formMedical, setFormMedical] = useState(false);
  const [formShelter, setFormShelter] = useState(true);

  // Edit / Occupancy management state
  const [editOccupancy, setEditOccupancy] = useState("");
  const [editCapacity, setEditCapacity] = useState("");

  const isAgency = user?.role === "coordinator" || user?.provider === "gov" || user?.role === "ADMIN" || user?.role === "volunteer";

  const fetchCamps = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (userLat !== null && userLng !== null) {
        params.latitude = userLat;
        params.longitude = userLng;
      }
      const data = await api.camps(params);
      setList(data || []);
    } catch (err) {
      console.warn("Failed fetching camps:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchCamps();
  }, [userLat, userLng]));

  // Trigger GPS permission & fetch
  const handleGpsEnable = () => {
    setUseGps(true);
    // Mock user location near Puri for testing purposes
    setUserLat(19.81);
    setUserLng(85.83);
  };

  const handleCreate = async () => {
    if (!formName || !formLocation || !formCapacity) return;
    try {
      const payload = {
        name: formName,
        location: formLocation,
        latitude: formLat ? Number(formLat) : 19.81,
        longitude: formLng ? Number(formLng) : 85.83,
        capacity: Number(formCapacity),
        occupancy: formOccupancy ? Number(formOccupancy) : 0,
        food: formFood,
        water: formWater,
        medical: formMedical,
        shelter: formShelter,
        contact_number: formContactNumber,
        description: formDescription,
        camp_type: formCampType
      };
      await api.createCamp(payload);
      
      // Reset form
      setFormName("");
      setFormLocation("");
      setFormLat("");
      setFormLng("");
      setFormCapacity("");
      setFormOccupancy("");
      setFormContactNumber("");
      setFormDescription("");
      setFormCampType("Relief Camp");
      setFormFood(true);
      setFormWater(true);
      setFormMedical(false);
      setFormShelter(true);
      
      setModalOpen(false);
      fetchCamps();
    } catch (err) {
      console.warn("Failed creating relief camp:", err);
    }
  };

  const handleUpdateOccupancy = async (campId: string) => {
    const val = Number(editOccupancy);
    if (isNaN(val) || val < 0) return;
    try {
      await api.updateCampOccupancy(campId, val);
      if (selectedCamp && selectedCamp.id === campId) {
        setSelectedCamp(prev => prev ? { ...prev, occupancy: val } : null);
      }
      setEditOccupancy("");
      fetchCamps();
    } catch (err) {
      console.warn("Failed updating occupancy:", err);
    }
  };

  const handleToggleResource = async (campId: string, resourceKey: string, currentVal: boolean) => {
    try {
      const payload: any = {};
      payload[resourceKey] = !currentVal;
      await api.updateCampResources(campId, payload);
      if (selectedCamp && selectedCamp.id === campId) {
        setSelectedCamp(prev => prev ? { ...prev, [resourceKey]: !currentVal } : null);
      }
      fetchCamps();
    } catch (err) {
      console.warn("Failed updating resources:", err);
    }
  };

  const handleUpdateStatus = async (campId: string, status: string) => {
    try {
      await api.updateCampStatus(campId, status);
      if (selectedCamp && selectedCamp.id === campId) {
        setSelectedCamp(prev => prev ? { ...prev, status: status as any } : null);
      }
      fetchCamps();
    } catch (err) {
      console.warn("Failed updating camp status:", err);
    }
  };

  // Filter & Search logic
  const filtered = list.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.location.toLowerCase().includes(search.toLowerCase());
    if (isAgency && filterStatus !== "All") {
      return matchesSearch && p.status === filterStatus;
    }
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return { fg: c.green, bg: c.greenSoft };
      case "FULL": return { fg: c.orange, bg: c.orangeSoft };
      case "CLOSED": return { fg: c.textMuted, bg: c.divider };
      default: return { fg: c.text, bg: c.divider };
    }
  };

  // Create Map Markers
  const markers = filtered.map((s) => ({
    lat: s.latitude,
    lng: s.longitude,
    color: s.status === "ACTIVE" ? c.green : s.status === "FULL" ? c.orange : c.textMuted,
    title: s.name,
    sub: `${s.occupancy}/${s.capacity} occupied`
  }));

  if (userLat !== null && userLng !== null) {
    markers.push({
      lat: userLat,
      lng: userLng,
      color: c.blue,
      title: "My Location",
      sub: "GPS Centered"
    } as any);
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.scrollContent} testID="camps-screen" showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>Relief Camp Locator</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>
            {isAgency ? "Manage capacity, logistics, and resource availability for relief centers." : "Find nearest operational camps and check resource capacities."}
          </Text>
        </View>
        {isAgency ? (
          <Button
            testID="create-camp-btn"
            title="Create Relief Camp"
            icon="add"
            onPress={() => setModalOpen(true)}
            full={false}
          />
        ) : (
          <Button
            title={useGps ? "GPS Enabled" : "Find Nearby Camps"}
            icon="navigate"
            onPress={handleGpsEnable}
            full={false}
            variant={useGps ? "soft" : "primary"}
          />
        )}
      </View>

      {/* Map Overview */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <LeafletMap markers={markers} dark={mode === "dark"} height={isDesktop ? 340 : 260} center={userLat !== null ? [userLat, userLng!] : [22.9, 79.5]} zoom={userLat !== null ? 10 : 5} />
      </Card>

      {/* Filters for Agency */}
      {isAgency && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {["All", "ACTIVE", "FULL", "CLOSED"].map((st) => (
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
            testID="camps-search-input"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by camp name or location…"
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.text }]}
          />
        </View>
      </Card>

      {/* List */}
      {loading ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color={c.blue} />
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {filtered.map((item) => {
            const available = item.capacity - item.occupancy;
            const colors = getStatusColor(item.status);
            return (
              <Card key={item.id} testID={`camp-${item.id}`}>
                <Pressable onPress={() => setSelectedCamp(item)}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>{item.name}</Text>
                      {item.distance !== undefined && (
                        <Text style={{ color: c.blue, fontSize: 13, fontWeight: "700", marginTop: 2 }}>
                          📍 {item.distance.toFixed(1)} km away
                        </Text>
                      )}
                    </View>
                    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: colors.fg, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4 }}>{item.location}</Text>
                  
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>Capacity <Text style={{ color: c.text, fontWeight: "800" }}>{item.capacity}</Text></Text>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>Occupied <Text style={{ color: c.text, fontWeight: "800" }}>{item.occupancy}</Text></Text>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>Available <Text style={{ color: c.green, fontWeight: "800" }}>{available}</Text></Text>
                  </View>

                  <View style={{ marginTop: 8 }}>
                    <ProgressBar value={item.occupancy} max={item.capacity} color={available < item.capacity * 0.15 ? c.red : c.blue} />
                  </View>

                  <View style={{ flexDirection: "row", gap: 14, marginTop: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name={item.food ? "fast-food" : "close-circle"} size={16} color={item.food ? c.green : c.textMuted} />
                      <Text style={{ color: item.food ? c.text : c.textMuted, fontSize: 12, fontWeight: "600" }}>Food</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name={item.water ? "water" : "close-circle"} size={16} color={item.water ? c.green : c.textMuted} />
                      <Text style={{ color: item.water ? c.text : c.textMuted, fontSize: 12, fontWeight: "600" }}>Water</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name={item.medical ? "medical" : "close-circle"} size={16} color={item.medical ? c.green : c.textMuted} />
                      <Text style={{ color: item.medical ? c.text : c.textMuted, fontSize: 12, fontWeight: "600" }}>Medical</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name={item.shelter ? "home" : "close-circle"} size={16} color={item.shelter ? c.green : c.textMuted} />
                      <Text style={{ color: item.shelter ? c.text : c.textMuted, fontSize: 12, fontWeight: "600" }}>Shelter</Text>
                    </View>
                  </View>
                </Pressable>
              </Card>
            );
          })}
        </View>
      )}

      {/* Camp Details & Management Panel Modal */}
      <Modal visible={!!selectedCamp} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Relief Camp Operational View</Text>
              <Pressable onPress={() => { setSelectedCamp(null); setEditOccupancy(""); }} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.text} />
              </Pressable>
            </View>

            {selectedCamp && (
              <ScrollView contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
                <View>
                  <Text style={{ color: c.text, fontSize: 18, fontWeight: "800" }}>{selectedCamp.name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>{selectedCamp.location}</Text>
                  {selectedCamp.distance !== undefined && (
                    <Text style={{ color: c.blue, fontSize: 14, fontWeight: "700", marginTop: 4 }}>
                      Distance: {selectedCamp.distance.toFixed(2)} km away
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", marginTop: 8 }}>
                    <View style={{ backgroundColor: getStatusColor(selectedCamp.status).bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: getStatusColor(selectedCamp.status).fg, fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>
                        {selectedCamp.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailSection, { borderTopColor: c.divider, borderBottomColor: c.divider }]}>
                  <Text style={[styles.detailLabel, { color: c.textMuted }]}>Contact Number</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>{selectedCamp.contact_number || "N/A"}</Text>

                  {selectedCamp.description ? (
                    <>
                      <Text style={[styles.detailLabel, { color: c.textMuted, marginTop: 10 }]}>Description</Text>
                      <Text style={[styles.detailValue, { color: c.text }]}>{selectedCamp.description}</Text>
                    </>
                  ) : null}

                  <Text style={[styles.detailLabel, { color: c.textMuted, marginTop: 10 }]}>Operational Capacity Details</Text>
                  <Text style={[styles.detailValue, { color: c.text }]}>
                    Occupancy: {selectedCamp.occupancy} / {selectedCamp.capacity} beds occupied (Available: {selectedCamp.capacity - selectedCamp.occupancy})
                  </Text>
                </View>

                {/* Resource Management Matrix */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: c.text, fontWeight: "700", fontSize: 13 }}>Resources Available</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    <Pressable
                      disabled={!isAgency}
                      onPress={() => handleToggleResource(selectedCamp.id, "food", selectedCamp.food)}
                      style={[styles.resourceBtn, { borderColor: selectedCamp.food ? c.green : c.border }]}
                    >
                      <Ionicons name="fast-food" size={16} color={selectedCamp.food ? c.green : c.textMuted} />
                      <Text style={{ color: selectedCamp.food ? c.text : c.textMuted, fontSize: 12 }}>Food: {selectedCamp.food ? "Available" : "N/A"}</Text>
                    </Pressable>
                    <Pressable
                      disabled={!isAgency}
                      onPress={() => handleToggleResource(selectedCamp.id, "water", selectedCamp.water)}
                      style={[styles.resourceBtn, { borderColor: selectedCamp.water ? c.green : c.border }]}
                    >
                      <Ionicons name="water" size={16} color={selectedCamp.water ? c.green : c.textMuted} />
                      <Text style={{ color: selectedCamp.water ? c.text : c.textMuted, fontSize: 12 }}>Water: {selectedCamp.water ? "Available" : "N/A"}</Text>
                    </Pressable>
                    <Pressable
                      disabled={!isAgency}
                      onPress={() => handleToggleResource(selectedCamp.id, "medical", selectedCamp.medical)}
                      style={[styles.resourceBtn, { borderColor: selectedCamp.medical ? c.green : c.border }]}
                    >
                      <Ionicons name="medical" size={16} color={selectedCamp.medical ? c.green : c.textMuted} />
                      <Text style={{ color: selectedCamp.medical ? c.text : c.textMuted, fontSize: 12 }}>Medical: {selectedCamp.medical ? "Available" : "N/A"}</Text>
                    </Pressable>
                    <Pressable
                      disabled={!isAgency}
                      onPress={() => handleToggleResource(selectedCamp.id, "shelter", selectedCamp.shelter)}
                      style={[styles.resourceBtn, { borderColor: selectedCamp.shelter ? c.green : c.border }]}
                    >
                      <Ionicons name="home" size={16} color={selectedCamp.shelter ? c.green : c.textMuted} />
                      <Text style={{ color: selectedCamp.shelter ? c.text : c.textMuted, fontSize: 12 }}>Shelter: {selectedCamp.shelter ? "Available" : "N/A"}</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Agency Management Action Box */}
                {isAgency && (
                  <View style={{ gap: 12, marginTop: 8, padding: 12, backgroundColor: c.inputBg, borderRadius: 12 }}>
                    <Text style={{ color: c.text, fontWeight: "700", fontSize: 13 }}>Occupancy Management</Text>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          keyboardType="numeric"
                          placeholder="New occupancy count"
                          value={editOccupancy}
                          onChangeText={setEditOccupancy}
                          style={{
                            height: 40,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: c.border,
                            backgroundColor: c.card,
                            color: c.text,
                            paddingHorizontal: 10,
                            fontSize: 14
                          }}
                        />
                      </View>
                      <Button title="Update Occupancy" onPress={() => handleUpdateOccupancy(selectedCamp.id)} full={false} />
                    </View>

                    <Text style={{ color: c.text, fontWeight: "700", fontSize: 13, marginTop: 8 }}>Camp Operations State</Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {selectedCamp.status === "CLOSED" ? (
                        <Button title="Reopen Camp" onPress={() => handleUpdateStatus(selectedCamp.id, "ACTIVE")} variant="primary" color={c.green} />
                      ) : (
                        <Button title="Close Relief Camp" onPress={() => handleUpdateStatus(selectedCamp.id, "CLOSED")} variant="danger" />
                      )}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Camp Creation Modal Form */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Establish Relief Camp</Text>
              <Pressable onPress={() => setModalOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
              <Input
                label="Camp Name"
                value={formName}
                onChangeText={setFormName}
                placeholder="Relief Center Name"
                icon="home-outline"
              />
              <Input
                label="Location Address"
                value={formLocation}
                onChangeText={setFormLocation}
                placeholder="Physical location address"
                icon="location-outline"
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Latitude"
                    value={formLat}
                    onChangeText={setFormLat}
                    placeholder="e.g. 19.81"
                    icon="compass-outline"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Longitude"
                    value={formLng}
                    onChangeText={setFormLng}
                    placeholder="e.g. 85.83"
                    icon="compass-outline"
                  />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Total Capacity"
                    value={formCapacity}
                    onChangeText={setFormCapacity}
                    placeholder="Total beds"
                    icon="people-outline"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Initial Occupancy"
                    value={formOccupancy}
                    onChangeText={setFormOccupancy}
                    placeholder="Occupied beds"
                    icon="person-outline"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <Input
                label="Contact Number"
                value={formContactNumber}
                onChangeText={setFormContactNumber}
                placeholder="Operational Contact phone"
                icon="call-outline"
                keyboardType="phone-pad"
              />
              <Input
                label="Camp Description"
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Logistics and other details..."
                icon="document-text-outline"
              />
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" onPress={() => setModalOpen(false)} variant="outline" />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Establish Camp" onPress={handleCreate} />
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
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  searchBar: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 10, paddingVertical: 8 },
  detailSection: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14, gap: 6 },
  detailLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  detailValue: { fontSize: 15, lineHeight: 20 },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox: { width: "100%", maxWidth: 500, borderRadius: 16, borderWidth: 1, padding: 24, gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  resourceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8
  }
});
