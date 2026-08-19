import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { AuthScaffold } from "@/src/components/AuthScaffold";
import { Button, Input, Logo } from "@/src/components/ui";

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
      <View style={{ alignItems: "center", marginBottom: 10 }}>
        <Logo size={56} showText={false} />
        <Text style={{ color: "#123B78", fontSize: 24, fontWeight: "900", marginTop: 10, letterSpacing: 0.5 }}>SAHAYSETU</Text>
        <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4 }}>
          Welcome Back!
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 14, marginTop: 2 }}>Login to continue</Text>
      </View>

      <Input 
        testID="login-email" 
        label="Email or Phone" 
        value={email} 
        onChangeText={setEmail} 
        placeholder="you@agency.gov.in" 
        icon="mail-outline" 
        keyboardType="email-address" 
      />
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

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 4 }}>
        <Pressable testID="remember-me" onPress={() => setRemember((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name={remember ? "checkbox" : "square-outline"} size={20} color={remember ? "#1463E8" : c.textMuted} />
          <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: "600" }}>Remember me</Text>
        </Pressable>
        <Pressable testID="forgot-link" onPress={() => router.push("/forgot-password")}>
          <Text style={{ color: "#1463E8", fontSize: 14, fontWeight: "700" }}>Forgot Password?</Text>
        </Pressable>
      </View>

      {!!err && <Text testID="login-error" style={{ color: c.red, fontSize: 14, textAlign: "center" }}>{err}</Text>}

      <Button testID="login-submit" title="Login" onPress={submit} loading={loading} color="#1463E8" />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>OR CONTINUE WITH</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Button 
            testID="google-login" 
            title="Google" 
            onPress={googleLogin} 
            variant="outline" 
            icon="logo-google" 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button 
            testID="gov-login" 
            title="Government ID" 
            onPress={gov} 
            variant="soft" 
            icon="shield-checkmark-outline" 
          />
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 14 }}>
        <Text style={{ color: c.textMuted, fontSize: 14 }}>Don't have an account?</Text>
        <Pressable testID="register-link" onPress={() => router.push("/register")}>
          <Text style={{ color: "#1463E8", fontSize: 14, fontWeight: "800" }}>Register now</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
        <Ionicons name="lock-closed" size={13} color="#16A66A" />
        <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "600" }}>Secure, encrypted authentication</Text>
      </View>
    </AuthScaffold>
  );
}
