import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { AuthScaffold } from "@/src/components/AuthScaffold";
import { Button, Input } from "@/src/components/ui";

export default function Otp() {
  const { c } = useTheme();
  const router = useRouter();
  const { verifyOtp } = useAuth();
  const params = useLocalSearchParams<{ email: string; dev?: string }>();
  const email = String(params.email || "");
  const [code, setCode] = useState(String(params.dev || ""));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (code.length !== 6) return setErr("Enter the 6-digit code");
    setLoading(true);
    try {
      const u = await verifyOtp(email, code);
      router.replace(u.role ? "/dashboard" : "/role-selection");
    } catch (e: any) {
      setErr(e.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold>
      <View style={{ alignItems: "center", gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="mail-open-outline" size={30} color={c.blue} />
        </View>
        <Text style={{ color: c.text, fontSize: 26, fontWeight: "900" }}>Verify Your Email</Text>
        <Text style={{ color: c.textMuted, fontSize: 15, textAlign: "center" }}>
          Enter the 6-digit code sent to{"\n"}<Text style={{ fontWeight: "700", color: c.text }}>{email}</Text>
        </Text>
      </View>

      {!!params.dev && (
        <View style={{ backgroundColor: c.orangeSoft, borderRadius: 10, padding: 12, flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Ionicons name="information-circle-outline" size={18} color={c.orange} />
          <Text style={{ color: c.orange, fontSize: 13, flex: 1 }}>Demo mode: your verification code is {params.dev}</Text>
        </View>
      )}

      <Input testID="otp-code" label="Verification Code" value={code} onChangeText={(t: string) => setCode(t.replace(/\D/g, "").slice(0, 6))} placeholder="123456" icon="keypad-outline" keyboardType="number-pad" />

      {!!err && <Text testID="otp-error" style={{ color: c.red, fontSize: 14 }}>{err}</Text>}

      <Button testID="otp-submit" title="Verify & Continue" onPress={submit} loading={loading} />

      <Pressable testID="otp-back" onPress={() => router.back()} style={{ alignSelf: "center" }}>
        <Text style={{ color: c.blue, fontSize: 14, fontWeight: "600" }}>Back</Text>
      </Pressable>
    </AuthScaffold>
  );
}
