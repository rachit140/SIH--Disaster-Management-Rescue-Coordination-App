import { View } from "react-native";
import { useTheme } from "@/src/theme/ThemeContext";
import { ComingSoon } from "@/src/components/ui";

export default function Screen() {
  const { c } = useTheme();
  return <View style={{ flex: 1, backgroundColor: c.bg }}><ComingSoon title="Announcements" icon="megaphone-outline" /></View>;
}
