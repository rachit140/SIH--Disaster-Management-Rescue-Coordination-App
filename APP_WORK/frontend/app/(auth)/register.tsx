import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { AuthScaffold } from "@/src/components/AuthScaffold";
import { Button, Input, Logo } from "@/src/components/ui";

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
      <View style={{ alignItems: "center", marginBottom: 10 }}>
        <Logo size={56} showText={false} />
        <Text style={{ color: "#123B78", fontSize: 24, fontWeight: "900", marginTop: 10, letterSpacing: 0.5 }}>SAHAYSETU</Text>
        <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4 }}>
          Create Account
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 14, marginTop: 2 }}>Join the response network</Text>
      </View>

      <Input 
        testID="reg-name" 
        label="Full Name" 
        value={name} 
        onChangeText={setName} 
        placeholder="Arjun Sharma" 
        icon="person-outline" 
        autoCapitalize="words" 
      />
      <Input 
        testID="reg-email" 
        label="Email" 
        value={email} 
        onChangeText={setEmail} 
        placeholder="you@agency.gov.in" 
        icon="mail-outline" 
        keyboardType="email-address" 
      />
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

      {!!err && <Text testID="reg-error" style={{ color: c.red, fontSize: 14, textAlign: "center" }}>{err}</Text>}

      <Button testID="reg-submit" title="Create Account" onPress={submit} loading={loading} color="#1463E8" />

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 14 }}>
        <Text style={{ color: c.textMuted, fontSize: 14 }}>Already registered?</Text>
        <Pressable testID="to-login" onPress={() => router.replace("/login")}>
          <Text style={{ color: "#1463E8", fontSize: 14, fontWeight: "800" }}>Sign in</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
        <Ionicons name="lock-closed" size={13} color="#16A66A" />
        <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "600" }}>Secure, encrypted authentication</Text>
      </View>
    </AuthScaffold>
  );
}
