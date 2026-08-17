import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";

let db: SQLite.SQLiteDatabase | null = null;
const fallbackKey = "sih1440_queue";

function database() {
  if (!db) {
    db = SQLite.openDatabaseSync("sih1440_rescue.db");
    db.execSync("CREATE TABLE IF NOT EXISTS queue (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)");
  }
  return db;
}

export async function queueItem(type: string, payload: object) {
  try {
    database().runSync("INSERT INTO queue (type, payload, created_at) VALUES (?, ?, ?)", type, JSON.stringify(payload), new Date().toISOString());
  } catch {
    const existing = JSON.parse((await AsyncStorage.getItem(fallbackKey)) || "[]");
    existing.push({ type, payload, created_at: new Date().toISOString() });
    await AsyncStorage.setItem(fallbackKey, JSON.stringify(existing));
  }
}

export async function queuedItems(): Promise<{ id?: number; type: string; payload: any }[]> {
  try {
    return database().getAllSync<{ id: number; type: string; payload: string }>("SELECT * FROM queue ORDER BY id").map((item) => ({ ...item, payload: JSON.parse(item.payload) }));
  } catch {
    return JSON.parse((await AsyncStorage.getItem(fallbackKey)) || "[]");
  }
}

export async function removeQueued(item: { id?: number; type: string; payload: any }) {
  try { if (item.id) database().runSync("DELETE FROM queue WHERE id = ?", item.id); }
  catch {
    const left = (await queuedItems()).filter((candidate) => candidate !== item);
    await AsyncStorage.setItem(fallbackKey, JSON.stringify(left));
  }
}