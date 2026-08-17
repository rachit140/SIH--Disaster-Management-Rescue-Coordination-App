import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { AuthScaffold } from "@/src/components/AuthScaffold";
import { Button, Input } from "@/src/components/ui";

export default function Register() {
  const { c } = useTheme();
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!name || !email || password.length < 6) return setErr("Fill all fields (password min 6 chars)");
    setLoading(true);
    try {
      const r = await register(name.trim(), email.trim(), password);
      router.push({ pathname: "/otp", params: { email: email.trim(), dev: r.dev_code || "" } });
    } catch (e: any) {
      setErr(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold>
      <View style={{ gap: 6 }}>
        <Text style={{ color: c.text, fontSize: 28, fontWeight: "900" }}>Create Account</Text>
        <Text style={{ color: c.textMuted, fontSize: 15 }}>Join the SAHAYSETU response network.</Text>
      </View>

      <Input testID="reg-name" label="Full Name" value={name} onChangeText={setName} placeholder="Arjun Sharma" icon="person-outline" autoCapitalize="words" />
      <Input testID="reg-email" label="Email" value={email} onChangeText={setEmail} placeholder="you@agency.gov.in" icon="mail-outline" keyboardType="email-address" />
      <Input
        testID="reg-password"
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        icon="lock-closed-outline"
        secureTextEntry={!showPw}
        right={
          <Pressable onPress={() => setShowPw((v) => !v)}>
            <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={c.textMuted} />
          </Pressable>
        }
      />

      {!!err && <Text testID="reg-error" style={{ color: c.red, fontSize: 14 }}>{err}</Text>}

      <Button testID="reg-submit" title="Create Account" onPress={submit} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 4 }}>
        <Text style={{ color: c.textMuted, fontSize: 14 }}>Already registered?</Text>
        <Pressable testID="to-login" onPress={() => router.replace("/login")}>
          <Text style={{ color: c.blue, fontSize: 14, fontWeight: "700" }}>Sign in</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}
