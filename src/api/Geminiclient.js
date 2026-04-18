const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL   = "gemini-2.5-flash-lite";
const API_BASE       = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ─── Helpers ────────────────────────────────────────────────

/** Convert a File/Blob to { base64, mimeType } */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve({
      base64:   reader.result.split(",")[1],
      mimeType: file.type || "application/octet-stream",
      dataUrl:  reader.result,           // full data URL e.g. "data:image/png;base64,..."
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Fetch a URL and convert to base64 (for already-uploaded URLs) */
async function urlToBase64(url) {
  // If it's already a data URL, parse directly
  if (url.startsWith("data:")) {
    const [meta, base64] = url.split(",");
    const mimeType = meta.split(":")[1].split(";")[0];
    return { base64, mimeType, dataUrl: url };
  }
  const res  = await fetch(url);
  const blob = await res.blob();
  return fileToBase64(blob);
}

/** Call Gemini with an arbitrary parts array */
async function callGemini(parts) {
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };

  const res = await fetch(API_BASE, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── Core.InvokeLLM replacement ─────────────────────────────

export async function invokeLLM({ prompt, file_urls = [], response_json_schema = null }) {
  const parts = [];

  for (const url of file_urls) {
    try {
      const { base64, mimeType } = await urlToBase64(url);
      parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
    } catch (e) {
      console.warn("Could not fetch file for Gemini:", url, e);
    }
  }

  const finalPrompt = response_json_schema
    ? `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON matching this schema — no markdown, no explanation:\n${JSON.stringify(response_json_schema, null, 2)}`
    : prompt;

  parts.push({ text: finalPrompt });

  const raw = await callGemini(parts);

  if (response_json_schema) {
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    try {
      return JSON.parse(clean);
    } catch {
      console.error("JSON parse failed, raw response:", raw);
      throw new Error("Gemini returned invalid JSON");
    }
  }

  return raw.trim();
}

// ─── Core.UploadFile replacement ────────────────────────────

/** Convert a File/Blob to { base64, mimeType } */
export async function uploadFile({ file }) {
  const { dataUrl } = await fileToBase64(file);
  // Return the data URL directly — it works for <img src> AND for Gemini inline_data
  return { file_url: dataUrl };
}

// ─── Entities / localStorage CRUD ───────────────────────────

function storageKey(entityName) {
  return `captionai_${entityName.toLowerCase()}`;
}

function loadAll(entityName) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(entityName)) || "[]");
  } catch {
    return [];
  }
}

// ─── Quota-safe storage helpers ─────────────────────────────────────────────

// Strip data URLs that are too large (> 20 KB) — keeps small thumbnails, drops
// full-resolution base64 images that would blow the 5 MB localStorage quota.
const MAX_DATA_URL_BYTES = 20 * 1024; // 20 KB

function sanitiseRecord(record) {
  const out = { ...record };
  if (
    typeof out.media_url === "string" &&
    out.media_url.startsWith("data:") &&
    out.media_url.length > MAX_DATA_URL_BYTES
  ) {
    out.media_url = "";
  }
  return out;
}

/** One-time migration: purge bloated media_url values already in storage */
function migrateEntity(entityName) {
  try {
    const raw = localStorage.getItem(storageKey(entityName));
    if (!raw) return;
    const records = JSON.parse(raw);
    const cleaned = records.map(sanitiseRecord);
    localStorage.setItem(storageKey(entityName), JSON.stringify(cleaned));
  } catch {
    // If already corrupt or over-quota, wipe and start fresh
    localStorage.removeItem(storageKey(entityName));
  }
}

function saveAll(entityName, records) {
  const sanitised = records.map(sanitiseRecord);
  try {
    localStorage.setItem(storageKey(entityName), JSON.stringify(sanitised));
  } catch (e) {
    if (e.name === "QuotaExceededError") {
      // Drop oldest half and retry once
      const trimmed = sanitised.slice(Math.floor(sanitised.length / 2));
      try {
        localStorage.setItem(storageKey(entityName), JSON.stringify(trimmed));
      } catch {
        console.error("localStorage still full after trimming — clearing entity store");
        localStorage.removeItem(storageKey(entityName));
      }
    } else {
      throw e;
    }
  }
}

function makeEntity(entityName) {
  // Clean up any previously-stored full-resolution base64 blobs on first load
  migrateEntity(entityName);

  return {
    list(sortField = "-created_date", limit = 50) {
      let records = loadAll(entityName);
      if (sortField) {
        const desc = sortField.startsWith("-");
        const field = desc ? sortField.slice(1) : sortField;
        records.sort((a, b) => {
          const av = a[field] ?? "";
          const bv = b[field] ?? "";
          return desc ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
        });
      }
      return Promise.resolve(records.slice(0, limit));
    },

    create(data) {
      const records = loadAll(entityName);
      const record  = {
        id:           crypto.randomUUID(),
        created_date: new Date().toISOString(),
        ...data,
      };
      records.push(record);
      saveAll(entityName, records);
      return Promise.resolve(record);
    },

    update(id, data) {
      const records = loadAll(entityName);
      const idx     = records.findIndex((r) => r.id === id);
      if (idx === -1) return Promise.reject(new Error("Record not found"));
      records[idx]  = { ...records[idx], ...data };
      saveAll(entityName, records);
      return Promise.resolve(records[idx]);
    },

    delete(id) {
      const records = loadAll(entityName).filter((r) => r.id !== id);
      saveAll(entityName, records);
      return Promise.resolve({ id });
    },

    get(id) {
      const record = loadAll(entityName).find((r) => r.id === id);
      return record
        ? Promise.resolve(record)
        : Promise.reject(new Error("Record not found"));
    },
  };
}

// ─── Public API ──────────────────────────────────────────────

export const gemini = {
  integrations: {
    Core: {
      InvokeLLM: invokeLLM,
      UploadFile: uploadFile,
    },
  },
  entities: {
    Caption: makeEntity("Caption"),
  },
};