import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Polyline, Rect } from "react-native-svg";

import { useTheme } from "@/src/theme/ThemeContext";

type Datum = { label: string; value: number };

export function BarChart({ data, color, height = 180 }: { data: Datum[]; color?: string; height?: number }) {
  const { c } = useTheme();
  const col = color || c.blue;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / (data.length * 1.6);
  const gap = barW * 0.6;
  return (
    <View>
      <Svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((f) => <Line key={f} x1={0} y1={100 * f} x2={100} y2={100 * f} stroke={c.divider} strokeWidth={0.4} />)}
        {data.map((d, i) => {
          const h = (d.value / max) * 92;
          const x = i * (barW + gap) + gap;
          return <Rect key={i} x={x} y={100 - h} width={barW} height={h} rx={1.2} fill={col} />;
        })}
      </Svg>
      <Labels data={data} />
    </View>
  );
}

export function LineChart({ data, color, height = 180 }: { data: Datum[]; color?: string; height?: number }) {
  const { c } = useTheme();
  const col = color || c.green;
  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value), 0);
  const pts = data.map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * 100;
    const y = 96 - ((d.value - min) / Math.max(1, max - min)) * 88;
    return `${x},${y}`;
  });
  const area = `0,100 ${pts.join(" ")} 100,100`;
  return (
    <View>
      <Svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((f) => <Line key={f} x1={0} y1={100 * f} x2={100} y2={100 * f} stroke={c.divider} strokeWidth={0.4} />)}
        <Polyline points={area} fill={col} fillOpacity={0.12} stroke="none" />
        <Polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={1.6} />
      </Svg>
      <Labels data={data} />
    </View>
  );
}

function polar(cx: number, cy: number, r: number, ang: number) {
  const a = ((ang - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arc(cx: number, cy: number, r: number, ri: number, start: number, end: number) {
  const s = polar(cx, cy, r, end), e = polar(cx, cy, r, start);
  const si = polar(cx, cy, ri, end), ei = polar(cx, cy, ri, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} L ${ei.x} ${ei.y} A ${ri} ${ri} 0 ${large} 1 ${si.x} ${si.y} Z`;
}

export function DonutChart({ data, colors, size = 170 }: { data: Datum[]; colors: string[]; size?: number }) {
  const { c } = useTheme();
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  let acc = 0;
  const segs = data.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.value;
    const end = (acc / total) * 360;
    return { d, path: end - start > 0 ? arc(50, 50, 46, 30, start, Math.max(start + 0.5, end)) : "", color: colors[i % colors.length] };
  });
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <G>{segs.map((s, i) => (s.path ? <Path key={i} d={s.path} fill={s.color} /> : null))}</G>
        <Circle cx={50} cy={50} r={29} fill={c.card} />
      </Svg>
      <View style={{ gap: 8, flex: 1, minWidth: 120 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: colors[i % colors.length] }} />
            <Text style={{ color: c.text, fontSize: 13, flex: 1 }}>{d.label}</Text>
            <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "700" }}>{d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const { c } = useTheme();
  const pct = Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: c.divider, overflow: "hidden" }}>
      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

function Labels({ data }: { data: Datum[] }) {
  const { c } = useTheme();
  if (data.length > 10) return null;
  return (
    <View style={styles.labels}>
      {data.map((d, i) => (
        <Text key={i} style={{ color: c.textMuted, fontSize: 10, flex: 1, textAlign: "center" }} numberOfLines={1}>{d.label}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ labels: { flexDirection: "row", marginTop: 6 } });
