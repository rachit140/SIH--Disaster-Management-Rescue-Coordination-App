import AsyncStorage from "@react-native-async-storage/async-storage";

const key = "sih1440_queue";
type QueueItem = { id: string; type: string; payload: any; created_at: string };

export async function queueItem(type: string, payload: object) {
  const items: QueueItem[] = JSON.parse((await AsyncStorage.getItem(key)) || "[]");
  items.push({ id: `${Date.now()}-${Math.random()}`, type, payload, created_at: new Date().toISOString() });
  await AsyncStorage.setItem(key, JSON.stringify(items));
}
export async function queuedItems() { return JSON.parse((await AsyncStorage.getItem(key)) || "[]") as QueueItem[]; }
export async function removeQueued(item: QueueItem) { await AsyncStorage.setItem(key, JSON.stringify((await queuedItems()).filter((candidate) => candidate.id !== item.id))); }