// Opslaglaag. Op Netlify: Netlify Blobs (sterk consistent).
// Lokaal testen: een map op schijf, via LOCAL_STORE_DIR.
import { getStore } from "@netlify/blobs";
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
let lokaal;
export function db() {
  const local = process.env.LOCAL_STORE_DIR;
  if (local) return (lokaal ||= metVersleuteling(fileStore(local)));
  return metVersleuteling(getStore({ name: "toppers-skoatterwald", consistency: "strong" }));
}
