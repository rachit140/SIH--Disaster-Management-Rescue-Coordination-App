import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { AuthScaffold } from "@/src/components/AuthScaffold";
import { Button, Input } from "@/src/components/ui";

export default function Login() {
  const { c } = useTheme();
  const router = useRouter();
  const { login, googleLogin, govLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!email || !password) return setErr("Enter email and password");
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      router.replace(u.role ? "/dashboard" : "/role-selection");
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const gov = async () => {
    setLoading(true);
    try {
      const u = await govLogin("GOVIN-DEMO-2024");
      router.replace(u.role ? "/dashboard" : "/role-selection");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold>
      <View style={{ gap: 6 }}>
        <Text style={{ color: c.text, fontSize: 28, fontWeight: "900" }}>Welcome Back</Text>
        <Text style={{ color: c.textMuted, fontSize: 15 }}>Sign in to your response network.</Text>
      </View>

      <Input testID="login-email" label="Email or Phone" value={email} onChangeText={setEmail} placeholder="you@agency.gov.in" icon="mail-outline" keyboardType="email-address" />
      <Input
        testID="login-password"
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        icon="lock-closed-outline"
        secureTextEntry={!showPw}
        right={
          <Pressable onPress={() => setShowPw((v) => !v)}>
            <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={c.textMuted} />
          </Pressable>
        }
      />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable testID="remember-me" onPress={() => setRemember((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name={remember ? "checkbox" : "square-outline"} size={20} color={remember ? c.blue : c.textMuted} />
          <Text style={{ color: c.textMuted, fontSize: 14 }}>Remember Me</Text>
        </Pressable>
        <Pressable testID="forgot-link" onPress={() => router.push("/forgot-password")}>
          <Text style={{ color: c.blue, fontSize: 14, fontWeight: "600" }}>Forgot Password?</Text>
        </Pressable>
      </View>

      {!!err && <Text testID="login-error" style={{ color: c.red, fontSize: 14 }}>{err}</Text>}

      <Button testID="login-submit" title="Login" onPress={submit} loading={loading} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 2 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <Text style={{ color: c.textMuted, fontSize: 12 }}>OR CONTINUE WITH</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </View>

      <Button testID="google-login" title="Sign in with Google" onPress={googleLogin} variant="outline" icon="logo-google" />
      <Button testID="gov-login" title="Government ID Login" onPress={gov} variant="soft" icon="shield-checkmark-outline" />

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 4 }}>
        <Text style={{ color: c.textMuted, fontSize: 14 }}>New to SAHAYSETU?</Text>
        <Pressable testID="register-link" onPress={() => router.push("/register")}>
          <Text style={{ color: c.blue, fontSize: 14, fontWeight: "700" }}>Create an account</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
        <Ionicons name="lock-closed" size={13} color={c.green} />
        <Text style={{ color: c.textMuted, fontSize: 12 }}>Secure, encrypted authentication</Text>
      </View>
    </AuthScaffold>
  );
}
