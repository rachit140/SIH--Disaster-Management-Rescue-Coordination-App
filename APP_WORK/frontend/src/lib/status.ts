import { Palette } from "@/src/theme/tokens";

// Maps arbitrary status/priority keywords to a semantic accent color.
export function statusColor(c: Palette, status?: string) {
  const s = (status || "").toLowerCase();
  if (["critical", "missing", "rejected", "offline", "closed"].some((k) => s.includes(k))) return c.red;
  if (["high", "warning", "in transit", "returning", "low", "pending", "on duty"].some((k) => s.includes(k))) return c.orange;
  if (["medium", "assigned", "acknowledged", "deployed"].some((k) => s.includes(k))) return c.blue;
  if (["safe", "rescued", "available", "resolved", "delivered", "approved", "open", "on field", "active"].some((k) => s.includes(k))) return c.green;
  return c.textMuted;
}

export function statusSoft(c: Palette, status?: string) {
  const col = statusColor(c, status);
  return col === c.red ? c.redSoft : col === c.orange ? c.orangeSoft : col === c.blue ? c.blueSoft : col === c.green ? c.greenSoft : c.divider;
}
