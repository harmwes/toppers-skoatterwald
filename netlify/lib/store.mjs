// Opslaglaag. Op Vercel: Upstash Redis (via KV_REST_API_URL en KV_REST_API_TOKEN).
// Op Netlify: Netlify Blobs (sterk consistent). Lokaal testen: een map op schijf, via LOCAL_STORE_DIR.
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function fileStore(dir) {
  const enc = (k) => encodeURIComponent(k);
  const dec = (f) => decodeURIComponent(f);
  const p = (k) => path.join(dir, enc(k));
  return {
    async get(key, opts = {}) {
      try {
        const buf = await fs.readFile(p(key));
        if (opts.type === "json") return JSON.parse(buf.toString("utf8"));
        if (opts.type === "arrayBuffer") return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        return buf.toString("utf8");
      } catch { return null; }
    },
    async getWithMetadata(key, opts = {}) {
      const data = await this.get(key, opts);
      if (data === null) return null;
      let metadata = {};
      try { metadata = JSON.parse(await fs.readFile(p(key) + ".__meta", "utf8")); } catch {}
      return { data, metadata, etag: "" };
    },
    async set(key, value, opts = {}) {
      await fs.mkdir(dir, { recursive: true });
      const data = typeof value === "string" ? value : Buffer.from(value instanceof ArrayBuffer ? value : await value.arrayBuffer());
      await fs.writeFile(p(key), data);
      if (opts.metadata) await fs.writeFile(p(key) + ".__meta", JSON.stringify(opts.metadata));
    },
    async setJSON(key, value, opts) { return this.set(key, JSON.stringify(value), opts); },
    async delete(key) { await fs.rm(p(key), { force: true }); await fs.rm(p(key) + ".__meta", { force: true }); },
    async list({ prefix = "" } = {}) {
      await fs.mkdir(dir, { recursive: true });
      const files = (await fs.readdir(dir)).filter((f) => !f.endsWith(".__meta")).map(dec);
      return { blobs: files.filter((k) => k.startsWith(prefix)).sort().map((key) => ({ key, etag: "" })), directories: [] };
    },
  };
}

// Upstash Redis via de REST-API, zonder extra pakket. Foto's staan er als base64 in,
// metadata onder een eigen sleutel ernaast.
function redisStore(url, token) {
  const META = "__meta/";
  const BIN = "bin:";
  async function stuur(pad, body) {
    const r = await fetch(url.replace(/\/$/, "") + pad, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) throw new Error(`Redis-fout ${r.status}: ${j?.error || "geen antwoord"}`);
    return j;
  }
  async function opdracht(...args) {
    const j = await stuur("", args);
    if (j.error) throw new Error(`Redis-fout: ${j.error}`);
    return j.result;
  }
  async function pijp(opdrachten) {
    const j = await stuur("/pipeline", opdrachten);
    for (const x of j) if (x.error) throw new Error(`Redis-fout: ${x.error}`);
    return j.map((x) => x.result);
  }
  const lees = (t, opts) => {
    if (t == null) return null;
    if (opts.type === "arrayBuffer") {
      const buf = Buffer.from(t.startsWith(BIN) ? t.slice(BIN.length) : t, t.startsWith(BIN) ? "base64" : "utf8");
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    if (opts.type === "json") return JSON.parse(t);
    return t;
  };
  const glob = (s) => s.replace(/[*?[\]\\]/g, (c) => "\\" + c);
  return {
    async get(key, opts = {}) { return lees(await opdracht("GET", key), opts); },
    async getWithMetadata(key, opts = {}) {
      const [t, m] = await pijp([["GET", key], ["GET", META + key]]);
      if (t == null) return null;
      let metadata = {};
      try { metadata = m ? JSON.parse(m) : {}; } catch {}
      return { data: lees(t, opts), metadata, etag: "" };
    },
    async set(key, value, opts = {}) {
      const data = typeof value === "string" ? value
        : BIN + Buffer.from(value instanceof ArrayBuffer ? value : ArrayBuffer.isView(value) ? value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) : await value.arrayBuffer()).toString("base64");
      if (opts.metadata) await pijp([["SET", key, data], ["SET", META + key, JSON.stringify(opts.metadata)]]);
      else await opdracht("SET", key, data);
    },
    async setJSON(key, value, opts) { return this.set(key, JSON.stringify(value), opts); },
    async delete(key) { await opdracht("DEL", key, META + key); },
    async list({ prefix = "" } = {}) {
      const keys = new Set();
      let cursor = "0";
      do {
        const [volgende, rij] = await opdracht("SCAN", cursor, "MATCH", glob(prefix) + "*", "COUNT", "1000");
        cursor = String(volgende);
        for (const k of rij) if (!k.startsWith(META)) keys.add(k);
      } while (cursor !== "0");
      return { blobs: [...keys].sort().map((key) => ({ key, etag: "" })), directories: [] };
    },
  };
}

// ---------- Versleuteling in rust (AES-256-GCM) ----------
// Alle JSON-gegevens (leden, aanvragen, chat, aanmeldingen, ritten, instellingen) worden
// versleuteld opgeslagen. De sleutel staat als geheime omgevingsvariabele TOPPERS_SLEUTEL
// bij Netlify, dus los van de opslag zelf. Wie alleen de opslag inziet, ziet onleesbare tekst.
const KOP = "tsw1:";
function sleutel() {
  const s = process.env.TOPPERS_SLEUTEL;
  if (!s) return null;
  return crypto.createHash("sha256").update("toppers-skoatterwald|" + s).digest();
}
export function versleutelingAan() { return !!sleutel(); }
export function versleutel(tekst) {
  const k = sleutel();
  if (!k) return tekst;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", k, iv);
  const data = Buffer.concat([c.update(tekst, "utf8"), c.final()]);
  return KOP + Buffer.concat([iv, c.getAuthTag(), data]).toString("base64");
}
export function ontsleutel(tekst) {
  if (typeof tekst !== "string" || !tekst.startsWith(KOP)) return tekst; // oude, nog leesbare gegevens
  const k = sleutel();
  if (!k) throw new Error("Sleutel ontbreekt: TOPPERS_SLEUTEL is niet ingesteld.");
  const buf = Buffer.from(tekst.slice(KOP.length), "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", k, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

function metVersleuteling(ruw) {
  return {
    ruw,
    async get(key, opts = {}) {
      if (opts.type === "json") {
        const t = await ruw.get(key);
        return t == null ? null : JSON.parse(ontsleutel(t));
      }
      return ruw.get(key, opts);
    },
    getWithMetadata: (key, opts) => ruw.getWithMetadata(key, opts),
    set: (key, value, opts) => ruw.set(key, value, opts),
    setJSON: (key, value, opts) => ruw.set(key, versleutel(JSON.stringify(value)), opts),
    delete: (key) => ruw.delete(key),
    list: (opts) => ruw.list(opts),
  };
}

// Eenmalig: bestaande leesbare gegevens alsnog versleutelen.
export async function versleutelBestaande() {
  if (!versleutelingAan()) return 0;
  const s = db();
  let n = 0;
  for (const prefix of ["config", "leden/", "aanvragen/", "chat/", "aanmelding/", "ritten/"]) {
    const { blobs } = await s.ruw.list({ prefix });
    for (const b of blobs) {
      if (prefix === "config" && b.key !== "config") continue;
      const t = await s.ruw.get(b.key);
      if (typeof t === "string" && !t.startsWith(KOP) && t.trim().startsWith("{")) {
        await s.ruw.set(b.key, versleutel(t));
        n++;
      }
    }
  }
  return n;
}

// Let op: op Netlify hoort bij elke aanvraag een nieuw, tijdelijk toegangsbewijs voor Blobs.
// Daarom maken we de opslag per aanvraag opnieuw aan (dat is goedkoop) en bewaren we hem niet.
let lokaal, redis;
export function db() {
  const local = process.env.LOCAL_STORE_DIR;
  if (local) return (lokaal ||= metVersleuteling(fileStore(local)));
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return (redis ||= metVersleuteling(redisStore(url, token)));
  return metVersleuteling(netlifyStore());
}

// Netlify Blobs pas laden als we echt op Netlify draaien.
function netlifyStore() {
  let s;
  const st = async () => (s ||= (await import("@netlify/blobs")).getStore({ name: "toppers-skoatterwald", consistency: "strong" }));
  return {
    get: async (...a) => (await st()).get(...a),
    getWithMetadata: async (...a) => (await st()).getWithMetadata(...a),
    set: async (...a) => (await st()).set(...a),
    setJSON: async (...a) => (await st()).setJSON(...a),
    delete: async (...a) => (await st()).delete(...a),
    list: async (...a) => (await st()).list(...a),
  };
}
