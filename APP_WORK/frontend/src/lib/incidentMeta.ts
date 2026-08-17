import { Palette } from "@/src/theme/tokens";
import { LMarker } from "@/src/lib/leafletHtml";

export const TYPE_ICON: Record<string, string> = {
  flood: "water-outline",
  earthquake: "pulse-outline",
  fire: "flame-outline",
  landslide: "trail-sign-outline",
  accident: "car-outline",
  cyclone: "thunderstorm-outline",
  collapse: "business-outline",
  hazmat: "warning-outline",
  heatwave: "sunny-outline",
};

export function typeIcon(type: string) {
  return TYPE_ICON[type] || "alert-circle-outline";
}

export function sevColor(c: Palette, sev: string) {
  return sev === "High" ? c.red : sev === "Medium" ? c.orange : sev === "Low" ? c.green : c.textMuted;
}

export type Markers = {
  incidents: any[];
  teams: any[];
  shelters: any[];
  hospitals: any[];
  resources: any[];
};

export function buildMarkers(
  c: Palette,
  data: Markers,
  show: { incidents?: boolean; teams?: boolean; shelters?: boolean; hospitals?: boolean; resources?: boolean } = {},
): LMarker[] {
  const out: LMarker[] = [];
  const s = { incidents: true, teams: true, shelters: true, hospitals: true, resources: true, ...show };
  if (s.incidents)
    data.incidents?.forEach((i) =>
      out.push({ lat: i.latitude, lng: i.longitude, color: sevColor(c, i.severity), r: i.severity === "High" ? 11 : 9, title: i.title, sub: `${i.location} • ${i.severity}` }),
    );
  if (s.teams) data.teams?.forEach((t) => out.push({ lat: t.latitude, lng: t.longitude, color: c.blue, r: 8, title: t.name, sub: `Team • ${t.status}` }));
  if (s.shelters) data.shelters?.forEach((h) => out.push({ lat: h.latitude, lng: h.longitude, color: c.purple, r: 8, title: h.name, sub: `Shelter • ${h.occupancy}/${h.capacity}` }));
  if (s.hospitals) data.hospitals?.forEach((h) => out.push({ lat: h.latitude, lng: h.longitude, color: c.green, r: 8, title: h.name, sub: "Hospital" }));
  if (s.resources) data.resources?.forEach((r) => out.push({ lat: r.latitude, lng: r.longitude, color: c.orange, r: 8, title: r.name, sub: `Resource • ${r.category}` }));
  return out;
}
