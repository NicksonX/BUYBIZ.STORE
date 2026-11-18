import "server-only";
import { getDb } from "@/lib/db";
import { decryptSecret } from "@/lib/security/encryption";

export async function getGeminiKey() {
  if (process.env.GEMINI_API_KEY?.trim()) return process.env.GEMINI_API_KEY.trim();
  try {
    const db = await getDb();
    const r = await db.query<{ value: string }>(`select value #>> '{}' as value from app_settings where key='gemini_api_key_encrypted'`);
    return r.rows[0]?.value ? await decryptSecret(r.rows[0].value) : null;
  } catch { return null; }
}

export async function getGeminiModel() {
  try {
    const db = await getDb();
    const r = await db.query<{ value: string }>(`select value #>> '{}' as value from app_settings where key='gemini_model'`);
    return process.env.GEMINI_MODEL?.trim() || r.rows[0]?.value || "gemini-3.1-flash-lite";
  } catch { return process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite"; }
}

export async function askGemini(prompt: string, maxTokens = 500) {
  const key = await getGeminiKey();
  if (!key) return null;
  try {
    const model = await getGeminiModel();
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens } }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch { return null; }
}
