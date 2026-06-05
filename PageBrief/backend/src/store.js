import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, "../data/store.json");

export function loadStore() {
  const raw = fs.readFileSync(STORE_PATH, "utf8");
  return JSON.parse(raw);
}

export function saveStore(data) {
  const text = JSON.stringify(data, null, 2);
  fs.writeFileSync(STORE_PATH, text, "utf8");
}

export function findUserByEmail(data, email) {
  return data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function cleanExpiredSessions(data) {
  const now = Date.now();
  data.sessions = data.sessions.filter((s) => s.expiresAt > now);
}

export function usageForToday(user) {
  const today = new Date().toISOString().slice(0, 10);
  if (!user.usage || user.usage.date !== today) {
    user.usage = { date: today, count: 0 };
  }
  return user.usage;
}
