import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { AuthScaffold } from "@/src/components/AuthScaffold";
import { Button, Input } from "@/src/components/ui";

export default function ForgotPassword() {
  const { c } = useTheme();
  const router = useRouter();
  const { forgotPassword, resetPassword } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [dev, setDev] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const sendCode = async () => {
    setErr(""); setMsg("");
    if (!email) return setErr("Enter your email");
    setLoading(true);
    try {
      const r = await forgotPassword(email.trim());
      if (r.dev_code) { setDev(r.dev_code); setCode(r.dev_code); }
      setMsg("If the account exists, a reset code was sent.");
      setStep(2);
    } catch (e: any) {
      setErr(e.message);
    } finally { setLoading(false); }
  };

  const reset = async () => {
    setErr(""); setMsg("");
    if (code.length !== 6 || pw.length < 6) return setErr("Enter the 6-digit code and a new password (min 6)");
    setLoading(true);
    try {
      await resetPassword(email.trim(), code, pw);
      router.replace("/login");
    } catch (e: any) {
      setErr(e.message);
    } finally { setLoading(false); }
  };

  return (
    <AuthScaffold>
      <View style={{ gap: 6 }}>
        <Text style={{ color: c.text, fontSize: 26, fontWeight: "900" }}>Reset Password</Text>
        <Text style={{ color: c.textMuted, fontSize: 15 }}>
          {step === 1 ? "We'll send a reset code to your email." : "Enter the code and choose a new password."}
        </Text>
      </View>

      {step === 1 ? (
        <>
          <Input testID="fp-email" label="Email" value={email} onChangeText={setEmail} placeholder="you@agency.gov.in" icon="mail-outline" keyboardType="email-address" />
          {!!err && <Text style={{ color: c.red, fontSize: 14 }}>{err}</Text>}
          <Button testID="fp-send" title="Send Reset Code" onPress={sendCode} loading={loading} />
        </>
      ) : (
        <>
          {!!dev && (
            <View style={{ backgroundColor: c.orangeSoft, borderRadius: 10, padding: 12, flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Ionicons name="information-circle-outline" size={18} color={c.orange} />
              <Text style={{ color: c.orange, fontSize: 13, flex: 1 }}>Demo mode: reset code is {dev}</Text>
            </View>
          )}
          <Input testID="fp-code" label="Reset Code" value={code} onChangeText={(t: string) => setCode(t.replace(/\D/g, "").slice(0, 6))} placeholder="123456" icon="keypad-outline" keyboardType="number-pad" />
          <Input testID="fp-newpw" label="New Password" value={pw} onChangeText={setPw} placeholder="At least 6 characters" icon="lock-closed-outline" secureTextEntry />
          {!!err && <Text style={{ color: c.red, fontSize: 14 }}>{err}</Text>}
          <Button testID="fp-reset" title="Reset Password" onPress={reset} loading={loading} />
        </>
      )}

      {!!msg && <Text style={{ color: c.green, fontSize: 13 }}>{msg}</Text>}

      <Pressable testID="fp-back" onPress={() => router.replace("/login")} style={{ alignSelf: "center" }}>
        <Text style={{ color: c.blue, fontSize: 14, fontWeight: "600" }}>Back to login</Text>
      </Pressable>
    </AuthScaffold>
  );
}
