import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { Button, Logo, Input } from "@/src/components/ui";

export default function RoleSelection() {
  const { c } = useTheme();
  const router = useRouter();
  const { setRole, logout } = useAuth();
  const insets = useSafeAreaInsets();

  // Onboarding state
  // Step 1: Select Track ('citizen' or 'agency')
  // Step 2: Role Verification (if 'agency' selected)
  const [step, setStep] = useState<1 | 2>(1);
  const [track, setTrack] = useState<"citizen" | "agency" | null>(null);

  // Verification details
  const [agencyRole, setAgencyRole] = useState<"volunteer" | "ADMIN">("volunteer");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleTrackSelectionNext = async () => {
    setErrorMsg("");
    if (!track) {
      setErrorMsg("Please select a pathway to continue.");
      return;
    }

    if (track === "citizen") {
      setLoading(true);
      try {
        await setRole("CITIZEN");
        router.replace("/dashboard");
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to set role. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      setStep(2);
    }
  };

  const handleVerificationSubmit = async () => {
    setErrorMsg("");
    if (!verificationCode.trim()) {
      setErrorMsg("Please enter your Badge ID or Verification Code.");
      return;
    }

    const code = verificationCode.trim().toUpperCase();

    // Verify code validation
    if (agencyRole === "ADMIN") {
      if (code !== "ADMIN-2026" && !code.startsWith("ADMIN-")) {
        setErrorMsg("Invalid Admin code. Hint: Use 'ADMIN-2026' for testing.");
        return;
      }
    } else if (agencyRole === "volunteer") {
      if (code !== "VOLUNTEER-2026" && !code.startsWith("VOLUNTEER-")) {
        setErrorMsg("Invalid Volunteer code. Hint: Use 'VOLUNTEER-2026' for testing.");
        return;
      }
    }

    setLoading(true);
    try {
      await setRole(agencyRole);
      router.replace("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 28, alignItems: "center" }} showsVerticalScrollIndicator={false}>
        <View style={{ width: "100%", maxWidth: 640, gap: 24 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Logo size={36} />
            <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>Step {step} of 2</Text>
          </View>

          {step === 1 ? (
            /* STEP 1: TRACK SELECTION */
            <View style={{ gap: 20 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ color: c.text, fontSize: 26, fontWeight: "900" }}>Choose Your Pathway</Text>
                <Text style={{ color: c.textMuted, fontSize: 15 }}>Configure your account settings and tailored dashboard options.</Text>
              </View>

              <View style={{ gap: 14 }}>
                {/* Citizen Track Option */}
                <Pressable
                  testID="track-citizen"
                  onPress={() => {
                    setTrack("citizen");
                    setErrorMsg("");
                  }}
                  style={[
                    styles.card,
                    {
                      backgroundColor: c.card,
                      borderColor: track === "citizen" ? c.orange : c.border,
                      borderWidth: track === "citizen" ? 2 : 1
                    }
                  ]}
                >
                  <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
                    <View style={[styles.iconContainer, { backgroundColor: c.orangeSoft }]}>
                      <Ionicons name="person-outline" size={24} color={c.orange} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>Citizen Track</Text>
                      <Text style={{ color: c.textMuted, fontSize: 13 }}>
                        Request relief supplies, broadcast emergency SOS alerts, locate rescue shelters, and view localized announcements.
                      </Text>
                    </View>
                  </View>
                  {track === "citizen" && (
                    <Ionicons name="checkmark-circle" size={22} color={c.orange} style={{ position: "absolute", top: 14, right: 14 }} />
                  )}
                </Pressable>

                {/* Rescue Agency Track Option */}
                <Pressable
                  testID="track-agency"
                  onPress={() => {
                    setTrack("agency");
                    setErrorMsg("");
                  }}
                  style={[
                    styles.card,
                    {
                      backgroundColor: c.card,
                      borderColor: track === "agency" ? c.blue : c.border,
                      borderWidth: track === "agency" ? 2 : 1
                    }
                  ]}
                >
                  <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
                    <View style={[styles.iconContainer, { backgroundColor: c.blueSoft }]}>
                      <Ionicons name="shield-checkmark-outline" size={24} color={c.blue} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>Rescue Agency Track</Text>
                      <Text style={{ color: c.textMuted, fontSize: 13 }}>
                        Deploy responder teams, coordinate volunteers, manage relief inventories, and map emergency locations.
                      </Text>
                    </View>
                  </View>
                  {track === "agency" && (
                    <Ionicons name="checkmark-circle" size={22} color={c.blue} style={{ position: "absolute", top: 14, right: 14 }} />
                  )}
                </Pressable>
              </View>

              {!!errorMsg && (
                <Text testID="onboarding-error" style={{ color: c.red, fontSize: 14, fontWeight: "600" }}>{errorMsg}</Text>
              )}

              <View style={{ marginTop: 8 }}>
                <Button
                  testID="track-next"
                  title={track === "citizen" ? "Activate Citizen Dashboard" : "Continue to Verification"}
                  onPress={handleTrackSelectionNext}
                  loading={loading}
                />
              </View>
            </View>
          ) : (
            /* STEP 2: ROLE VERIFICATION */
            <View style={{ gap: 20 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ color: c.text, fontSize: 26, fontWeight: "900" }}>Role Verification</Text>
                <Text style={{ color: c.textMuted, fontSize: 15 }}>Enter your official agency-assigned credentials to unlock Responder tools.</Text>
              </View>

              {/* Role Toggle Selector */}
              <View style={{ gap: 8 }}>
                <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>Select Agency Role</Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    testID="verify-role-volunteer"
                    onPress={() => {
                      setAgencyRole("volunteer");
                      setErrorMsg("");
                    }}
                    style={[
                      styles.roleToggle,
                      {
                        flex: 1,
                        backgroundColor: agencyRole === "volunteer" ? c.blueSoft : c.card,
                        borderColor: agencyRole === "volunteer" ? c.blue : c.border
                      }
                    ]}
                  >
                    <Ionicons name="hand-left-outline" size={18} color={agencyRole === "volunteer" ? c.blue : c.textMuted} />
                    <Text style={{ color: agencyRole === "volunteer" ? c.blue : c.text, fontWeight: "700", fontSize: 14 }}>Volunteer</Text>
                  </Pressable>

                  <Pressable
                    testID="verify-role-admin"
                    onPress={() => {
                      setAgencyRole("ADMIN");
                      setErrorMsg("");
                    }}
                    style={[
                      styles.roleToggle,
                      {
                        flex: 1,
                        backgroundColor: agencyRole === "ADMIN" ? c.blueSoft : c.card,
                        borderColor: agencyRole === "ADMIN" ? c.blue : c.border
                      }
                    ]}
                  >
                    <Ionicons name="git-network-outline" size={18} color={agencyRole === "ADMIN" ? c.blue : c.textMuted} />
                    <Text style={{ color: agencyRole === "ADMIN" ? c.blue : c.text, fontWeight: "700", fontSize: 14 }}>Admin</Text>
                  </Pressable>
                </View>
              </View>

              {/* Verification code input */}
              <Input
                testID="verify-code-input"
                label="Agency Verification / Badge ID"
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder={agencyRole === "ADMIN" ? "e.g., ADMIN-2026" : "e.g., VOLUNTEER-2026"}
                icon="shield-checkmark-outline"
                autoCapitalize="characters"
              />

              <Text style={{ color: c.textMuted, fontSize: 12, fontStyle: "italic", marginTop: -6 }}>
                * Use &quot;{agencyRole === "ADMIN" ? "ADMIN-2026" : "VOLUNTEER-2026"}&quot; to proceed.
              </Text>

              {!!errorMsg && (
                <Text testID="verify-error" style={{ color: c.red, fontSize: 14, fontWeight: "600" }}>{errorMsg}</Text>
              )}

              <View style={{ gap: 12, marginTop: 8 }}>
                <Button
                  testID="verify-submit"
                  title="Verify & Continue"
                  onPress={handleVerificationSubmit}
                  loading={loading}
                />
                
                <Button
                  testID="verify-back"
                  title="Back to Pathways"
                  onPress={() => {
                    setStep(1);
                    setErrorMsg("");
                  }}
                  variant="outline"
                />
              </View>
            </View>
          )}

          {/* Footer Action */}
          <Pressable testID="role-logout" onPress={logout} style={{ alignSelf: "center", marginTop: 12 }}>
            <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: "600" }}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    position: "relative"
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  roleToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1
  }
});
