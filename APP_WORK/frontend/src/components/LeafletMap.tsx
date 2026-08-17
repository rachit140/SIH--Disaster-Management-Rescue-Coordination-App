import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { leafletHtml, LMarker } from "@/src/lib/leafletHtml";

// Native: render Leaflet inside a WebView.
export function LeafletMap({
  markers,
  center,
  zoom,
  dark,
  height = 320,
}: {
  markers: LMarker[];
  center?: [number, number];
  zoom?: number;
  dark?: boolean;
  height?: number | string;
}) {
  const html = leafletHtml(markers, { center, zoom, dark });
  return (
    <View style={[styles.wrap, { height: height as any }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={{ flex: 1, backgroundColor: "transparent" }}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { width: "100%", overflow: "hidden" } });
