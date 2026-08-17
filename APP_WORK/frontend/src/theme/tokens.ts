// SAHAYSETU design tokens — light (default) and dark. Accent colors are shared.
export type Palette = {
  mode: "light" | "dark";
  bg: string;
  surface: string;
  card: string;
  border: string;
  divider: string;
  text: string;
  textMuted: string;
  navy: string;
  blue: string;
  blueSoft: string;
  red: string;
  redSoft: string;
  orange: string;
  orangeSoft: string;
  green: string;
  greenSoft: string;
  purple: string;
  sidebarBg: string;
  activeBg: string;
  inputBg: string;
  overlay: string;
};

const ACCENT = {
  blue: "#1463E8",
  red: "#EF3340",
  orange: "#FF8A00",
  green: "#16A66A",
  purple: "#7C4DFF",
  navy: "#123B78",
};

export const light: Palette = {
  mode: "light",
  bg: "#F7F9FC",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E4E9F2",
  divider: "#EEF1F6",
  text: "#172033",
  textMuted: "#667085",
  ...ACCENT,
  blueSoft: "#EAF1FE",
  redSoft: "#FDECEC",
  orangeSoft: "#FFF3E3",
  greenSoft: "#E6F6EF",
  sidebarBg: "#FFFFFF",
  activeBg: "#EAF1FE",
  inputBg: "#FFFFFF",
  overlay: "rgba(15,23,42,0.45)",
};

export const dark: Palette = {
  mode: "dark",
  bg: "#0D1420",
  surface: "#131C2B",
  card: "#152034",
  border: "#24314A",
  divider: "#1E2A40",
  text: "#E8EEF7",
  textMuted: "#93A0B5",
  ...ACCENT,
  blueSoft: "#12233F",
  redSoft: "#2E1519",
  orangeSoft: "#2E2214",
  greenSoft: "#12281F",
  sidebarBg: "#101826",
  activeBg: "#16233A",
  inputBg: "#0F1826",
  overlay: "rgba(0,0,0,0.6)",
};
