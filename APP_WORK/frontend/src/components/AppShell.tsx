import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";

import { useTheme } from "@/src/theme/ThemeContext";
import { Sidebar } from "@/src/components/Sidebar";
import { TopBar } from "@/src/components/TopBar";
import { PAGE_TITLES } from "@/src/lib/nav";
import { useResponsive } from "@/src/hooks/useResponsive";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  const { isDesktop } = useResponsive(900);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] || "SAHAYSETU";

  const onToggle = () => (isDesktop ? setCollapsed((v) => !v) : setDrawerOpen(true));

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {isDesktop && <Sidebar collapsed={collapsed} />}

      <View style={{ flex: 1 }}>
        <TopBar title={title} onToggle={onToggle} isDesktop={isDesktop} />
        <View style={{ flex: 1 }}>{children}</View>
      </View>

      {!isDesktop && drawerOpen && (
        <View style={StyleSheet.absoluteFill} testID="mobile-drawer">
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={() => setDrawerOpen(false)} />
          <View style={styles.drawer}>
            <Sidebar collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  drawer: { position: "absolute", left: 0, top: 0, bottom: 0, width: 280 },
});
