import React from "react";
import { leafletHtml, LMarker } from "@/src/lib/leafletHtml";

// Web: render Leaflet inside an iframe (React DOM handles the intrinsic element).
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
    // @ts-ignore intrinsic DOM element on web
    <iframe
      title="sahaysetu-map"
      srcDoc={html}
      style={{ width: "100%", height: typeof height === "number" ? `${height}px` : height, border: "none", display: "block" }}
    />
  );
}
